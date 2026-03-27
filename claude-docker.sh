#!/bin/bash
set -euo pipefail

# ===========================================================================
# claude-docker.sh - Launch Claude Code in a sandboxed Docker container
#
# Usage:
#   ./claude-docker.sh [options] [-- claude-args...]
#
# Options:
#   --clone [BRANCH]  Clone repo instead of mounting host directory.
#                     Requires REPO_URL env var. Optional BRANCH name
#                     checks out the branch (creating it if needed).
#   --rebuild         Force rebuild of the Docker image
#   --help            Show this help message
#
# Environment variables (optional):
#   CLAUDE_CODE_OAUTH_TOKEN  Claude OAuth token (priority 1)
#   ANTHROPIC_API_KEY        Anthropic API key (priority 2)
#   REPO_URL                 Repository URL (overrides git remote detection)
#
# By default, mounts the current repository to /workspace in the container.
# Everything after -- is passed to Claude Code as additional arguments.
# ===========================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="vibefun-claude"
IMAGE_TAG="latest"
REBUILD=false
CLONE_MODE=false
CLONE_BRANCH=""
CLAUDE_ARGS=()

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --clone)
            CLONE_MODE=true
            shift
            # Consume optional branch name (if next arg doesn't start with --)
            if [[ $# -gt 0 && "$1" != --* ]]; then
                CLONE_BRANCH="$1"
                shift
            fi
            ;;
        --rebuild)
            REBUILD=true
            shift
            ;;
        --help)
            head -25 "$0" | grep '^#' | sed 's/^# \?//'
            exit 0
            ;;
        --)
            shift
            CLAUDE_ARGS=("$@")
            break
            ;;
        *)
            echo "Unknown option: $1 (use -- to pass args to Claude Code)"
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# 1. Preflight checks
# ---------------------------------------------------------------------------
if ! command -v docker &>/dev/null; then
    echo "Error: Docker is not installed or not in PATH."
    exit 1
fi

if ! docker info &>/dev/null 2>&1; then
    echo "Error: Docker daemon is not running."
    exit 1
fi

# ---------------------------------------------------------------------------
# 2. Build image (auto-build on first run, or if --rebuild)
# ---------------------------------------------------------------------------
if $REBUILD || ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" &>/dev/null; then
    echo "=> Building Docker image ${IMAGE_NAME}:${IMAGE_TAG}..."
    docker build --pull -t "${IMAGE_NAME}:${IMAGE_TAG}" "${SCRIPT_DIR}/.claude/docker/"
    echo "=> Build complete."
else
    echo "=> Using existing image ${IMAGE_NAME}:${IMAGE_TAG} (use --rebuild to force)"
fi

# ---------------------------------------------------------------------------
# 3. Gather credentials from host
# ---------------------------------------------------------------------------
DOCKER_ENV_ARGS=()

# Claude Code auth (priority: env vars > macOS Keychain > interactive login)
if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    DOCKER_ENV_ARGS+=(-e "CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN}")
    echo "=> Claude auth: using CLAUDE_CODE_OAUTH_TOKEN env var"
elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    DOCKER_ENV_ARGS+=(-e "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}")
    echo "=> Claude auth: using ANTHROPIC_API_KEY env var"
elif [[ "$(uname)" == "Darwin" ]]; then
    # Try to extract OAuth credentials from macOS Keychain
    CLAUDE_CREDENTIALS=$(security find-generic-password -s "Claude Code-credentials" -a "$USER" -w 2>/dev/null) || true
    if [ -n "$CLAUDE_CREDENTIALS" ]; then
        # Base64 encode to safely pass JSON through environment variables
        CLAUDE_CREDENTIALS_B64=$(echo -n "$CLAUDE_CREDENTIALS" | base64)
        DOCKER_ENV_ARGS+=(-e "CLAUDE_CREDENTIALS_B64=${CLAUDE_CREDENTIALS_B64}")
        echo "=> Claude auth: extracted credentials from macOS Keychain"
    else
        echo "=> Warning: No Claude Code credentials found."
        echo "   You will need to run 'claude auth login' interactively in the container."
    fi
else
    echo "=> Warning: No CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY set."
    echo "   You will need to run 'claude auth login' interactively in the container."
fi

# GitHub CLI token
GH_TOKEN=""
if command -v gh &>/dev/null; then
    GH_TOKEN=$(gh auth token 2>/dev/null) || true
fi
if [ -n "$GH_TOKEN" ]; then
    DOCKER_ENV_ARGS+=(-e "GH_TOKEN=${GH_TOKEN}")
    echo "=> GitHub CLI: token captured from host"
else
    echo "=> Warning: Could not get GitHub CLI token. gh commands will not work in container."
fi

# Git identity
GIT_USER_NAME=$(git config user.name 2>/dev/null || echo "")
GIT_USER_EMAIL=$(git config user.email 2>/dev/null || echo "")
DOCKER_ENV_ARGS+=(-e "GIT_USER_NAME=${GIT_USER_NAME:-Developer}")
DOCKER_ENV_ARGS+=(-e "GIT_USER_EMAIL=${GIT_USER_EMAIL:-dev@localhost}")

# Terminal
DOCKER_ENV_ARGS+=(-e "TERM=${TERM:-xterm-256color}")

# ---------------------------------------------------------------------------
# 4. Mode-specific setup (mount vs clone)
# ---------------------------------------------------------------------------
DOCKER_WORKSPACE_ARGS=()

if $CLONE_MODE; then
    # Clone mode: auto-detect repo URL from git, fall back to REPO_URL env var
    if [ -z "${REPO_URL:-}" ]; then
        REPO_URL=$(git remote get-url origin 2>/dev/null) || true
    fi
    if [ -z "${REPO_URL:-}" ]; then
        echo "Error: Could not detect repository URL from git remote."
        echo "Either run from a git repository or set REPO_URL manually."
        echo "Usage: REPO_URL=git@github.com:user/repo.git ./claude-docker.sh --clone [branch]"
        exit 1
    fi
    DOCKER_ENV_ARGS+=(-e "MOUNT_MODE=clone")
    DOCKER_ENV_ARGS+=(-e "REPO_URL=${REPO_URL}")
    if [ -n "$CLONE_BRANCH" ]; then
        DOCKER_ENV_ARGS+=(-e "CLONE_BRANCH=${CLONE_BRANCH}")
        echo "=> Clone mode: ${REPO_URL} (branch: ${CLONE_BRANCH})"
    else
        echo "=> Clone mode: ${REPO_URL}"
    fi
else
    # Mount mode: bind-mount host repo to /workspace
    DOCKER_ENV_ARGS+=(-e "MOUNT_MODE=host")
    DOCKER_WORKSPACE_ARGS+=(-v "${SCRIPT_DIR}:/workspace")
    echo "=> Mount mode: ${SCRIPT_DIR} -> /workspace"
fi

# ---------------------------------------------------------------------------
# 5. SSH agent forwarding (platform-specific)
# ---------------------------------------------------------------------------
DOCKER_SSH_ARGS=()

if [[ "$(uname)" == "Darwin" ]]; then
    # macOS with Docker Desktop: use the built-in SSH agent forwarding socket
    DOCKER_SSH_ARGS+=(
        --mount "type=bind,src=/run/host-services/ssh-auth.sock,target=/run/host-services/ssh-auth.sock"
        -e "SSH_AUTH_SOCK=/run/host-services/ssh-auth.sock"
    )
    echo "=> SSH agent: forwarding via Docker Desktop (macOS)"
elif [ -n "${SSH_AUTH_SOCK:-}" ]; then
    # Linux: mount the host SSH agent socket directly
    DOCKER_SSH_ARGS+=(
        -v "${SSH_AUTH_SOCK}:/tmp/ssh-agent.sock"
        -e "SSH_AUTH_SOCK=/tmp/ssh-agent.sock"
    )
    echo "=> SSH agent: forwarding via \$SSH_AUTH_SOCK (Linux)"
else
    echo "=> Warning: No SSH agent detected. Git clone over SSH will fail."
    echo "   Set SSH_AUTH_SOCK or use Docker Desktop's built-in SSH forwarding."
fi

# ---------------------------------------------------------------------------
# 6. Mount host Claude Code settings (read-only) + session persistence
# ---------------------------------------------------------------------------
DOCKER_MOUNT_ARGS=()

if [ -f "$HOME/.claude/settings.json" ]; then
    DOCKER_MOUNT_ARGS+=(-v "$HOME/.claude/settings.json:/tmp/host-claude/settings.json:ro")
    echo "=> Mounting host Claude settings"
fi

if [ -f "$HOME/.claude/statusline.sh" ]; then
    DOCKER_MOUNT_ARGS+=(-v "$HOME/.claude/statusline.sh:/tmp/host-claude/statusline.sh:ro")
    echo "=> Mounting host statusline script"
fi

# Session persistence: use a dedicated host directory for container Claude state
# This enables `claude --resume` across container runs
CLAUDE_DATA_DIR="$HOME/.claude-docker"
mkdir -p "$CLAUDE_DATA_DIR"
DOCKER_MOUNT_ARGS+=(-v "$CLAUDE_DATA_DIR:/home/claude/.claude")
echo "=> Session persistence: ${CLAUDE_DATA_DIR}"

# ---------------------------------------------------------------------------
# 7. Launch container
# ---------------------------------------------------------------------------
echo ""
echo "=> Starting ${IMAGE_NAME} container..."
echo "   Image: ${IMAGE_NAME}:${IMAGE_TAG}"
if $CLONE_MODE; then
    echo "   The container is ephemeral -- push changes before exiting!"
fi
echo ""

exec docker run -it --rm \
    "${DOCKER_ENV_ARGS[@]}" \
    "${DOCKER_SSH_ARGS[@]+"${DOCKER_SSH_ARGS[@]}"}" \
    "${DOCKER_MOUNT_ARGS[@]+"${DOCKER_MOUNT_ARGS[@]}"}" \
    "${DOCKER_WORKSPACE_ARGS[@]+"${DOCKER_WORKSPACE_ARGS[@]}"}" \
    "${IMAGE_NAME}:${IMAGE_TAG}" \
    "${CLAUDE_ARGS[@]+"${CLAUDE_ARGS[@]}"}"

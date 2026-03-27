#!/bin/bash
set -euo pipefail

# ===========================================================================
# Claude Code Development Container - Entrypoint
#
# Provides a sandboxed environment with Node.js 24.x, pnpm, and Claude Code.
# Starts as root to fix SSH socket permissions, then drops to the 'claude'
# user for all remaining operations.
#
# Modes (controlled by MOUNT_MODE env var):
#   - host  (default): /workspace is bind-mounted from host, skip clone
#   - clone:           clone REPO_URL into /workspace, install deps
# ===========================================================================

# ---------------------------------------------------------------------------
# 0. Drop privileges: fix SSH socket perms as root, then re-exec as claude
# ---------------------------------------------------------------------------
if [ "$(id -u)" = "0" ]; then
    # Fix SSH agent socket permissions if mounted.
    # On Linux, the socket is a direct bind-mount of the host file — chown/chmod
    # would mutate the host socket, breaking SSH for other host users. Instead,
    # use socat to create a user-owned proxy socket.
    # On macOS Docker Desktop, the socket is VM-managed and safe to chown.
    if [ -S "${SSH_AUTH_SOCK:-}" ]; then
        if command -v socat &>/dev/null && [ ! -e /run/host-services/ssh-auth.sock ]; then
            # Linux: proxy the socket so the host file is untouched
            PROXY_SOCK="/tmp/ssh-agent-proxy.sock"
            socat UNIX-LISTEN:"$PROXY_SOCK",fork,user=claude,mode=600 \
                  UNIX-CONNECT:"$SSH_AUTH_SOCK" &
            export SSH_AUTH_SOCK="$PROXY_SOCK"
        else
            # macOS Docker Desktop: safe to change ownership
            chown claude:claude "$SSH_AUTH_SOCK"
            chmod 600 "$SSH_AUTH_SOCK"
        fi
    fi

    # Re-exec this script as claude with all args preserved
    exec setpriv --reuid=claude --regid=claude --init-groups \
        env HOME=/home/claude "$0" "$@"
fi

# --- Everything below runs as claude (non-root) ---

# Ensure user-local bin is on PATH (for claude update installs)
export PATH="$HOME/.local/bin:$PATH"

MOUNT_MODE="${MOUNT_MODE:-host}"

# ---------------------------------------------------------------------------
# 1. SSH known_hosts for github.com (skip for HTTPS-only clone)
# ---------------------------------------------------------------------------
NEEDS_SSH=true
if [ "$MOUNT_MODE" = "clone" ] && [[ "${REPO_URL:-}" == https://* ]]; then
    NEEDS_SSH=false
fi

if [ "$NEEDS_SSH" = true ]; then
    mkdir -p "$HOME/.ssh"
    chmod 700 "$HOME/.ssh"

    # Start with baked-in keys (always available, no network needed)
    cp /etc/ssh/github_known_hosts "$HOME/.ssh/known_hosts"

    # Try a fresh scan to pick up any key rotations
    ssh-keyscan github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true

    chmod 600 "$HOME/.ssh/known_hosts"
fi

# ---------------------------------------------------------------------------
# 2. Git user configuration
# ---------------------------------------------------------------------------
git config --global user.name "${GIT_USER_NAME:-Developer}"
git config --global user.email "${GIT_USER_EMAIL:-dev@localhost}"

# ---------------------------------------------------------------------------
# 3. GitHub CLI authentication
# ---------------------------------------------------------------------------
if [ -n "${GH_TOKEN:-}" ]; then
    echo "=> Setting up GitHub CLI authentication..."
    gh auth setup-git 2>/dev/null || echo "   Warning: gh auth setup-git failed, gh commands may not work"
else
    echo "=> Warning: GH_TOKEN not set. GitHub CLI commands will not work."
fi

# ---------------------------------------------------------------------------
# 4. Claude Code credentials (from Keychain extraction or env var)
# ---------------------------------------------------------------------------
mkdir -p "$HOME/.claude"

# Decode base64-encoded credentials from Keychain extraction
if [ -n "${CLAUDE_CREDENTIALS_B64:-}" ]; then
    echo "$CLAUDE_CREDENTIALS_B64" | base64 -d > "$HOME/.claude/.credentials.json"
    chmod 600 "$HOME/.claude/.credentials.json"
    echo "=> Wrote Claude Code credentials to credentials file"
fi

# ---------------------------------------------------------------------------
# 5. Claude Code first-run state (skip onboarding, trust /workspace)
# ---------------------------------------------------------------------------
cat > "$HOME/.claude.json" <<'INIT_JSON'
{
  "hasCompletedOnboarding": true,
  "lastOnboardingVersion": "1.0.9",
  "numStartups": 1,
  "hasAcknowledgedCostThreshold": true,
  "projects": {
    "/workspace": {
      "hasTrustDialogAccepted": true,
      "hasCompletedProjectOnboarding": true,
      "allowedTools": [],
      "dontCrawlDirectory": false,
      "mcpContextUris": [],
      "mcpServers": {},
      "enabledMcpjsonServers": [],
      "disabledMcpjsonServers": [],
      "projectOnboardingSeenCount": 1,
      "hasClaudeMdExternalIncludesApproved": false,
      "hasClaudeMdExternalIncludesWarningShown": false
    }
  }
}
INIT_JSON
echo "=> Pre-populated Claude Code first-run state (onboarding + trust)"

# ---------------------------------------------------------------------------
# 6. Claude Code user settings (from host mounts)
# ---------------------------------------------------------------------------
if [ -f /tmp/host-claude/statusline.sh ]; then
    cp /tmp/host-claude/statusline.sh "$HOME/.claude/statusline.sh"
    chmod +x "$HOME/.claude/statusline.sh"
    echo "=> Copied host statusline script"
fi

if [ -f /tmp/host-claude/settings.json ]; then
    jq --arg home "$HOME" '
      # Rewrite statusline path from macOS home to container home
      if .statusLine.command then
        .statusLine.command |= gsub("/Users/[^/]+/"; ($home + "/"))
      else . end
      # Remove macOS-specific Stop hooks (e.g., afplay sound)
      | if .hooks.Stop then del(.hooks.Stop) else . end
    ' /tmp/host-claude/settings.json > "$HOME/.claude/settings.json"
    echo "=> Imported host Claude Code settings (paths adjusted for container)"
else
    echo "=> No host settings mounted, using defaults"
fi

# ---------------------------------------------------------------------------
# 7. Update Claude Code to latest
# ---------------------------------------------------------------------------
echo "=> Updating Claude Code..."
claude update 2>/dev/null || {
    echo "   Update failed, using pre-installed version: $(claude --version 2>/dev/null || echo 'unknown')"
}
# Clear bash's command hash so subsequent invocations use the updated binary
hash -r

# ---------------------------------------------------------------------------
# 8. Workspace setup (clone or mount)
# ---------------------------------------------------------------------------
if [ "$MOUNT_MODE" = "clone" ]; then
    # Clone mode: require REPO_URL, clone to /workspace, optionally checkout branch
    if [ -z "${REPO_URL:-}" ]; then
        echo "=> Error: REPO_URL is required in clone mode."
        echo "   Usage: REPO_URL=git@github.com:user/repo.git ./claude-docker.sh --clone"
        exit 1
    fi

    echo "=> Cloning ${REPO_URL}..."
    git clone "$REPO_URL" /workspace

    if [ -n "${CLONE_BRANCH:-}" ]; then
        cd /workspace
        if git checkout "$CLONE_BRANCH" 2>/dev/null; then
            echo "=> Checked out existing branch: ${CLONE_BRANCH}"
        else
            git checkout -b "$CLONE_BRANCH"
            echo "=> Created new branch: ${CLONE_BRANCH}"
        fi
    fi

    # Install dependencies
    cd /workspace
    echo "=> Installing dependencies with pnpm..."
    pnpm install --frozen-lockfile
else
    # Mount mode: host repo is already at /workspace
    echo "=> Using host-mounted workspace at /workspace"
fi

cd /workspace

# ---------------------------------------------------------------------------
# 9. Claude Code authentication check
# ---------------------------------------------------------------------------
if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${CLAUDE_CREDENTIALS_B64:-}" ]; then
    if [ -t 0 ]; then
        echo ""
        echo "============================================================"
        echo "  No Claude Code credentials detected."
        echo "  Please authenticate interactively:"
        echo "============================================================"
        echo ""
        claude auth login
    else
        echo "=> Error: No Claude credentials and not running interactively."
        echo "   Set CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY, or run with -it."
        exit 1
    fi
fi

# ---------------------------------------------------------------------------
# 10. Launch Claude Code
# ---------------------------------------------------------------------------
echo ""
echo "=> Launching Claude Code with --dangerously-skip-permissions"
echo "   Working directory: /workspace"
if [ "$MOUNT_MODE" = "clone" ]; then
    echo "   Warning: Container is ephemeral (--rm). Push changes before exiting!"
fi
echo ""

exec claude --dangerously-skip-permissions "$@"

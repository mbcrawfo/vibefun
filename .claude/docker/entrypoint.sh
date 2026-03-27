#!/bin/bash
set -euo pipefail

# ===========================================================================
# Vibefun Docker Sandbox - Entrypoint
#
# Starts as root to fix SSH socket permissions, then drops to the vfdev user
# for all remaining operations. Claude Code runs as non-root (vfdev).
# ===========================================================================

# ---------------------------------------------------------------------------
# 0. Drop privileges: fix SSH socket perms as root, then re-exec as vfdev
# ---------------------------------------------------------------------------
if [ "$(id -u)" = "0" ]; then
    # Fix SSH agent socket permissions if mounted (Docker Desktop uses root-owned socket)
    if [ -S "${SSH_AUTH_SOCK:-}" ]; then
        chmod 666 "$SSH_AUTH_SOCK"
    fi

    # Re-exec this script as vfdev with all args preserved
    exec setpriv --reuid=vfdev --regid=vfdev --init-groups \
        env HOME=/home/vfdev "$0" "$@"
fi

# --- Everything below runs as vfdev (non-root) ---

# Ensure user-local bin is on PATH (for claude update installs)
export PATH="$HOME/.local/bin:$PATH"

# ---------------------------------------------------------------------------
# 1. SSH known_hosts for github.com
# ---------------------------------------------------------------------------
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

# Start with baked-in keys (always available, no network needed)
cp /etc/ssh/github_known_hosts "$HOME/.ssh/known_hosts"

# Try a fresh scan to pick up any key rotations
ssh-keyscan github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true

chmod 600 "$HOME/.ssh/known_hosts"

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

if [ -n "${CLAUDE_CREDENTIALS:-}" ]; then
    # Write credentials extracted from macOS Keychain to the fallback file
    # Claude Code reads this when macOS Keychain is unavailable (i.e., Linux)
    echo "$CLAUDE_CREDENTIALS" > "$HOME/.claude/.credentials.json"
    chmod 600 "$HOME/.claude/.credentials.json"
    echo "=> Wrote Claude Code credentials to credentials file"
fi

# ---------------------------------------------------------------------------
# 5. Claude Code first-run state (skip onboarding, trust /vibefun)
# ---------------------------------------------------------------------------
cat > "$HOME/.claude.json" <<'INIT_JSON'
{
  "hasCompletedOnboarding": true,
  "lastOnboardingVersion": "1.0.9",
  "numStartups": 1,
  "hasAcknowledgedCostThreshold": true,
  "projects": {
    "/vibefun": {
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

# ---------------------------------------------------------------------------
# 8. Clone repository
# ---------------------------------------------------------------------------
REPO_URL="${REPO_URL:-git@github.com:mbcrawfo/vibefun.git}"

echo "=> Cloning ${REPO_URL}..."
if [ -n "${REPO_BRANCH:-}" ]; then
    git clone --branch "$REPO_BRANCH" "$REPO_URL" /vibefun
else
    git clone "$REPO_URL" /vibefun
fi

# ---------------------------------------------------------------------------
# 9. Install dependencies
# ---------------------------------------------------------------------------
cd /vibefun
echo "=> Installing dependencies with pnpm..."
pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# 10. Claude Code authentication check
# ---------------------------------------------------------------------------
if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${CLAUDE_CREDENTIALS:-}" ]; then
    echo ""
    echo "============================================================"
    echo "  No Claude Code credentials detected."
    echo "  Please authenticate interactively:"
    echo "============================================================"
    echo ""
    claude auth login
fi

# ---------------------------------------------------------------------------
# 11. Launch Claude Code
# ---------------------------------------------------------------------------
echo ""
echo "=> Launching Claude Code with --dangerously-skip-permissions"
echo "   Working directory: /vibefun"
echo "   Warning: Container is ephemeral (--rm). Push changes before exiting!"
echo ""

exec claude --dangerously-skip-permissions "$@"

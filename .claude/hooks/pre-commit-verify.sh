#!/bin/bash

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Extract the bash command from the JSON input
CMD=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only intercept git commit commands
if ! [[ "$CMD" =~ git[[:space:]]+commit ]]; then
    exit 0  # Allow non-commit commands to proceed
fi

# Change to project directory
cd "$CLAUDE_PROJECT_DIR" || {
    echo "Error: Cannot access project directory" >&2
    exit 2
}

echo "Running Claude Code pre-commit verification..." >&2

# Run verification checks
if ! npm run verify:ci 2>&1; then
    echo "❌ Commit blocked: Verification failed" >&2
    echo "Commits by Claude Code must have passing type checks, linting, and tests." >&2
    echo "Run 'npm run verify' to see detailed output." >&2
    exit 2
fi

echo "✓ Verification passed - proceeding with commit" >&2
exit 0

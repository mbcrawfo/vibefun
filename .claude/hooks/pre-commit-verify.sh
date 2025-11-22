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

echo "Running pre-commit verification..." >&2

# Run verification checks
if ! npm run verify:ci 2>&1; then
    echo "" >&2
    echo "❌ Commit blocked: Verification failed" >&2
    echo "" >&2
    echo "Please fix the issues above before committing." >&2
    echo "Run 'npm run verify' to see detailed output and auto-fix formatting issues." >&2
    exit 2
fi

echo "✓ All verification checks passed - proceeding with commit" >&2
exit 0

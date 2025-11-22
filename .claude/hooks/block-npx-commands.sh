#!/bin/bash

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Extract the bash command from the JSON input
BASH_COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only intercept npx commands
if ! [[ "$BASH_COMMAND" =~ ^npx ]]; then
    exit 0  # Allow non-commit commands to proceed
fi

echo "Do not use npx commands - only use commands from package.json" >&2

if [[ "$BASH_COMMAND" =~ eslint ]]l then
    echo "Use `npm run lint` instead of `npx eslint`" >&2
fi

if [[ "$BASH_COMMAND" =~ prettier ]]l then
    echo "Use `npm run format:check` instead of `npx prettier`" >&2
fi

exit 2

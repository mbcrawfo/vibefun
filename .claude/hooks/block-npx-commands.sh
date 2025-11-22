#!/bin/bash

# Read hook input from stdin
HOOK_INPUT=$(cat)

# Extract the bash command from the JSON input
CMD=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only intercept npx commands
if ! [[ "$CMD" =~ ^npx ]]; then
    exit 0  # Allow non-npx commands to proceed
fi

echo "Do not use npx commands - only use commands from package.json" >&2

if [[ "$CMD" =~ eslint ]]; then
    echo "Use \`npm run lint\` instead of \`npx eslint\`" >&2
fi

if [[ "$CMD" =~ prettier ]]; then
    echo "Use \`npm run format:check\` instead of \`npx prettier\`" >&2
fi

if [[ "$CMD" =~ vitest ]]; then
    echo "Use \`npm run test\` instead of \`npx vitest\`" >&2
fi

exit 2

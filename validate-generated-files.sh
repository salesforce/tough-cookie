#!/usr/bin/env bash

git add --renormalize .

if (( "$(git diff HEAD | wc -l)" != 0 )); then
  summary=$(cat << EOF
### Detected uncommitted changes from generated files

Use \`npm run precommit\` to ensure that all generated content is up-to-date.

\`\`\`shell
$(git diff HEAD)
\`\`\`
EOF
)
  if [ -n "$GITHUB_STEP_SUMMARY" ]; then
    echo "$summary" >> "$GITHUB_STEP_SUMMARY"
  fi
  git --no-pager diff HEAD
  exit 1
fi

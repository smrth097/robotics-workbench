#!/usr/bin/env bash
set -euo pipefail

# Add or update repository files here whenever running this script
# locally or via GitHub Actions (.github/workflows/run-update-script.yml).
printf "Updated at: %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > .last-update.txt

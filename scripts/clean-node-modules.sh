#!/usr/bin/env bash
# clean-node-modules.sh
#
# Recursively deletes all node_modules/ directories under the given root
# folders, except anywhere inside a protected monorepo path.
#
# Usage:
#   ./clean-node-modules.sh              # dry run (default) — lists what would be deleted
#   ./clean-node-modules.sh --delete     # actually deletes
#
# Edit ROOTS and KEEP below for your machine, or override via env vars:
#   KEEP=/path/to/monorepo ROOTS="/a /b" ./clean-node-modules.sh --delete

set -euo pipefail

KEEP="${KEEP:-/Users/abdullahghani/work/monsterDeath}"
ROOTS=(${ROOTS:-"/Users/abdullahghani/work" "/Users/abdullahghani/Downloads" "/Applications/XAMPP/htdocs"})

MODE="dry-run"
if [[ "${1:-}" == "--delete" ]]; then
  MODE="delete"
fi

echo "Protected (never touched): $KEEP"
echo "Scanning roots: ${ROOTS[*]}"
echo "Mode: $MODE"
echo

# Build the find command: prune matched node_modules dirs (so nested ones
# aren't double-listed), excluding anything under $KEEP.
FOUND=()
while IFS= read -r -d '' dir; do
  FOUND+=("$dir")
done < <(find "${ROOTS[@]}" -type d -name node_modules -prune \
  -not -path "$KEEP/*" -not -path "$KEEP" \
  -print0 2>/dev/null)

if [[ ${#FOUND[@]} -eq 0 ]]; then
  echo "No node_modules folders found (outside the protected path)."
  exit 0
fi

TOTAL_SIZE=0
for dir in "${FOUND[@]}"; do
  size=$(du -sh "$dir" 2>/dev/null | cut -f1)
  echo "  $size  $dir"
done

echo
echo "Found ${#FOUND[@]} node_modules folder(s)."

if [[ "$MODE" == "dry-run" ]]; then
  echo
  echo "DRY RUN — nothing deleted. Re-run with --delete to remove the folders above."
else
  echo
  read -r -p "Delete all ${#FOUND[@]} folders listed above? [y/N] " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "Aborted."
    exit 1
  fi
  for dir in "${FOUND[@]}"; do
    echo "Deleting: $dir"
    rm -rf -- "$dir"
  done
  echo "Done."
fi

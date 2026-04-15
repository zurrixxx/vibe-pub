#!/usr/bin/env bash
# Sync aposv2/misc/projects/vibe-pub → github.com/zurrixxx/vibe-pub
#
# Usage:
#   ./scripts/sync-public.sh              # dry run (show what would change)
#   ./scripts/sync-public.sh --push       # commit + push to remote
#   ./scripts/sync-public.sh --push -m "custom commit message"
#
# Source of truth: aposv2 (local). Remote is a mirror.
# Private content (.pm/, .env*, build artifacts) is excluded.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
REMOTE_URL="https://github.com/zurrixxx/vibe-pub.git"
CACHE_DIR="${VIBE_PUB_SYNC_CACHE:-$HOME/.cache/vibe-pub-sync}"
PUSH=false
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH=true; shift ;;
    -m) COMMIT_MSG="$2"; shift 2 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

EXCLUDES=(
  --exclude='.git'
  --exclude='.svelte-kit'
  --exclude='.wrangler'
  --exclude='node_modules'
  --exclude='build'
  --exclude='dist'
  --exclude='.pm'
  --exclude='.env'
  --exclude='.env.*'
  --exclude='.dev.vars'
  --exclude='.DS_Store'
)

# Ensure cache clone exists and is up to date
if [[ ! -d "$CACHE_DIR/.git" ]]; then
  echo "→ Cloning $REMOTE_URL to $CACHE_DIR"
  mkdir -p "$(dirname "$CACHE_DIR")"
  git clone "$REMOTE_URL" "$CACHE_DIR"
else
  echo "→ Fetching latest from remote"
  git -C "$CACHE_DIR" fetch origin main
  git -C "$CACHE_DIR" reset --hard origin/main
fi

# Rsync (delete files removed locally). Preserve .git dir via exclude.
echo "→ Syncing $SRC → $CACHE_DIR"
rsync -a --delete "${EXCLUDES[@]}" "$SRC/" "$CACHE_DIR/"

cd "$CACHE_DIR"

# Show what would change
if ! git diff --quiet || [[ -n "$(git status --porcelain)" ]]; then
  echo
  echo "→ Changes to sync:"
  git status --short
else
  echo "✓ Already in sync, nothing to do"
  exit 0
fi

if ! $PUSH; then
  echo
  echo "Dry run. Re-run with --push to commit and push."
  exit 0
fi

# Commit + push
git add -A
MSG="${COMMIT_MSG:-sync: mirror from aposv2 @ $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
git commit -m "$MSG"
git push origin main
echo "✓ Pushed to $REMOTE_URL"

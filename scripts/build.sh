#!/usr/bin/env bash
#
# Build script for the LLM Markdown Copier Firefox extension.
# Zips src/, strips macOS metadata, and places a versioned archive in dist/.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$REPO_ROOT/src"
DIST_DIR="$REPO_ROOT/dist"
MANIFEST="$SRC_DIR/manifest.json"

# Extract version from manifest.json
VERSION="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['version'])" "$MANIFEST")"
ZIPNAME="llm_copier-v${VERSION}.zip"

echo "Building LLM Markdown Copier v${VERSION}..."

# Create dist directory if it doesn't exist
mkdir -p "$DIST_DIR"

# Create ZIP from src/ contents (cd into src so paths are relative)
cd "$SRC_DIR"
zip -r "$DIST_DIR/$ZIPNAME" . -x "*.DS_Store"

# Remove any macOS metadata that slipped through
zip -d "$DIST_DIR/$ZIPNAME" "__MACOSX/*" "*.DS_Store" "*/.DS_Store" 2>/dev/null || true

echo "Built: dist/$ZIPNAME"

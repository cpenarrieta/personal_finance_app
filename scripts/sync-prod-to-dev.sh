#!/bin/bash
set -euo pipefail

SNAPSHOT_FILE="./convex-snapshot.zip"

echo "=== Convex: Sync Prod → Dev ==="
echo ""

# 1. Export from production
echo "📤 Exporting production data..."
rm -f "$SNAPSHOT_FILE"
npx convex export --prod --path "$SNAPSHOT_FILE"
echo ""

# 2. Import into dev (--replace clears all existing dev data first)
echo "📥 Importing into dev (replacing all data)..."
npx convex import --replace --yes "$SNAPSHOT_FILE"
echo ""

# 3. Clean up
rm -f "$SNAPSHOT_FILE"

echo "=== Done! Dev database now mirrors production. ==="

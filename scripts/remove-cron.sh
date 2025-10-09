#!/bin/bash

# Script to remove the daily Plaid sync cron job

echo "Removing Plaid sync cron job..."

# Check if cron job exists
if crontab -l 2>/dev/null | grep -q "npm run sync"; then
    # Remove the cron job
    crontab -l | grep -v "npm run sync" | crontab -
    echo "✅ Cron job removed successfully!"
else
    echo "⚠️  No Plaid sync cron job found."
fi

echo ""
echo "Current crontab:"
crontab -l 2>/dev/null || echo "  (empty)"

#!/bin/bash

# Setup script for daily Plaid sync cron job
# This will run the sync every day at 9:30 AM

# Get the absolute path to the project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Create the cron job command
CRON_JOB="30 9 * * * cd $PROJECT_DIR && /usr/local/bin/npm run sync >> $PROJECT_DIR/logs/cron-sync.log 2>&1"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -F "npm run sync") && {
    echo "Cron job already exists. Removing old one..."
    crontab -l | grep -v "npm run sync" | crontab -
}

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Cron job installed successfully!"
echo "📅 Schedule: Daily at 9:30 AM"
echo "📝 Logs will be written to: $PROJECT_DIR/logs/cron-sync.log"
echo ""
echo "To view current crontab:"
echo "  crontab -l"
echo ""
echo "To remove the cron job:"
echo "  crontab -l | grep -v 'npm run sync' | crontab -"

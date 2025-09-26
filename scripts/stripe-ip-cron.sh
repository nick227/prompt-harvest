#!/bin/bash

# Stripe IP Update Cron Job
# Runs daily to update Stripe IP addresses

# Set the project directory
PROJECT_DIR="/path/to/your/image-harvest"
LOG_FILE="$PROJECT_DIR/logs/stripe-ip-update.log"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔄 Starting Stripe IP update process..."

# Change to project directory
cd "$PROJECT_DIR" || {
    log "❌ Failed to change to project directory: $PROJECT_DIR"
    exit 1
}

# Run the IP update script
node scripts/update-stripe-ips.js >> "$LOG_FILE" 2>&1

# Check if the update was successful
if [ $? -eq 0 ]; then
    log "✅ Stripe IP update completed successfully"
else
    log "❌ Stripe IP update failed"
    exit 1
fi

log "🎉 Stripe IP update process finished"

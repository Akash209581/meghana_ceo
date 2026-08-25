#!/bin/bash

# ==========================================
# TaskTracker Uploads Backup Script
# Source: /ceo/data/uploads
# Destination: /ceo/backup/upload
# ==========================================

SOURCE_DIR="/ceo/data/uploads"
BACKUP_DIR="/ceo/backup/upload"

echo "📦 Starting uploads backup at $(date)..."

# Ensure target backup directory exists
mkdir -p "$BACKUP_DIR"

if [ -d "$SOURCE_DIR" ]; then
    # Sync files from uploads directory to backup directory
    rsync -av --update "$SOURCE_DIR/" "$BACKUP_DIR/"
    echo "✅ Backup completed successfully to $BACKUP_DIR"
else
    echo "⚠️ Source directory $SOURCE_DIR does not exist yet."
fi

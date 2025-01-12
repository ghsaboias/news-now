#!/bin/bash

# Exit on any error
set -e

# Configuration
APP_DIR="/root/discord-report-bot"
DATA_DIR="$APP_DIR/data"
WEB_USER="www-data"  # The user running the web service
BOT_USER="root"      # The user running the bot service

echo "Starting deployment..."

# Create necessary directories
echo "Creating directories..."
mkdir -p "$DATA_DIR"
mkdir -p "$APP_DIR/logs"

# Set up virtual environment if it doesn't exist
if [ ! -d "$APP_DIR/.venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$APP_DIR/.venv"
fi

# Activate virtual environment
source "$APP_DIR/.venv/bin/activate"

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Set proper permissions
echo "Setting permissions..."
chown -R $BOT_USER:$WEB_USER "$DATA_DIR"
chmod -R 775 "$DATA_DIR"  # Both bot and web can read/write

# Set up log directory permissions
chown -R $BOT_USER:$BOT_USER "$APP_DIR/logs"
chmod -R 755 "$APP_DIR/logs"

# Copy and reload systemd services
echo "Setting up services..."
cp discord-report-bot.service /etc/systemd/system/
cp discord-bot-watchdog.service /etc/systemd/system/
cp news-web.service /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Restart services
echo "Restarting services..."
systemctl restart discord-report-bot
systemctl restart discord-bot-watchdog
systemctl restart news-web

echo "Deployment complete!"

# Show service status
echo -e "\nService Status:"
systemctl status discord-report-bot --no-pager
systemctl status discord-bot-watchdog --no-pager
systemctl status news-web --no-pager 
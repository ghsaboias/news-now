#!/bin/bash

# Change to the bot directory
cd /var/www/news-now

# Activate virtual environment
source /var/www/news-now/.venv/bin/activate

# Run the bot with 24h report flag (threshold: 10 messages)
echo "[$(date)] Running 24-hour report..."
python3 /var/www/news-now/main.py --24h-report 
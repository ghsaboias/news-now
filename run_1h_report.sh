#!/bin/bash

# Change to the bot directory
cd /var/www/news-now

# Activate virtual environment
source /var/www/news-now/.venv/bin/activate

# Run the bot with 1h report flag (threshold: 5 messages)
echo "[$(date)] Running 1-hour report..."
python3 /var/www/news-now/main.py --1h-report 
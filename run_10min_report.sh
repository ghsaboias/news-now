#!/bin/bash

# Change to the bot directory
cd /var/www/news-now

# Activate virtual environment
source /var/www/news-now/.venv/bin/activate

# Run the bot with 10min report flag (threshold: 3 messages)
echo "[$(date)] Running 10-minute report..."
python3 /var/www/news-now/main.py --10min-report 
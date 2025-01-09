#!/bin/bash

# Change to the bot directory
cd /root/discord-report-bot

# Activate virtual environment
source .venv/bin/activate

# Run the bot with 1h report flag (threshold: 5 messages)
echo "[$(date)] Running 1-hour report..."
python3 main.py --1h-report 
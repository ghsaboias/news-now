#!/bin/bash

# Change to the bot directory
cd /root/discord-report-bot

# Activate virtual environment
source .venv/bin/activate

# Run the bot with 24h report flag (threshold: 10 messages)
echo "[$(date)] Running 24-hour report..."
python3 main.py --24h-report 
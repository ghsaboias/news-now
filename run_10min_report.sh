#!/bin/bash

# Change to the bot directory
cd /root/discord-report-bot

# Activate virtual environment
source .venv/bin/activate

# Run the bot with 10min report flag (threshold: 3 messages)
echo "[$(date)] Running 10-minute report..."
python3 main.py --10min-report 
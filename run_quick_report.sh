#!/bin/bash

# Change to the bot directory
cd /root/discord-report-bot

# Activate virtual environment
source .venv/bin/activate

# Run the bot with quick-report flag
python3 main.py --quick-report 
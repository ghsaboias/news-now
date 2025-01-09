# Discord Report Bot

A Telegram bot that fetches and summarizes messages from Discord channels, powered by Claude AI. The bot provides both on-demand reports and automated periodic summaries.

## Features

- Real-time message fetching from Discord channels
- AI-powered summaries using Claude 3 Haiku
- Interactive channel selection via Telegram inline keyboards
- Flexible timeframe selection through interactive buttons
- Automated periodic reports (10-minute, hourly, and daily)
- Smart context handling with previous report incorporation
- Automatic message threshold detection
- Persistent summary storage for context continuity

## Prerequisites

- Python 3.8+
- Discord Bot Token
- Telegram Bot Token
- Anthropic API Key (for Claude)
- Linux/Unix system for service deployment

## Installation

1. Clone the repository
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file with the following variables:

```env
DISCORD_TOKEN=your_discord_token
GUILD_ID=your_guild_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Usage

### Manual Operation

Start the bot:   
```bash
python main.py
```

### Automated Reports

Run specific report types:
```bash
python main.py --10min-report  # 10-minute activity report
python main.py --1h-report     # Hourly activity report
python main.py --24h-report    # Daily activity report
```

### Telegram Commands

- `/channels` - List available Discord channels and start report generation
- `/help` - Show help message

After using `/channels`, select a channel and timeframe using the interactive buttons to generate a report.

### Report Thresholds

- 10-minute reports: 3+ messages
- Hourly reports: 5+ messages
- Daily reports: 10+ messages

## Dependencies

- anthropic
- python-dotenv
- requests
- logging

## Service Setup

The bot can be deployed as a systemd service with the included service files:
- `discord-report-bot.service` - Main bot service
- `discord-bot-watchdog.service` - Watchdog service

## License

MIT License
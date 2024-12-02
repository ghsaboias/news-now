# Discord Report Bot

A Telegram bot that fetches and summarizes messages from Discord channels, powered by Claude AI.

## Features

- Fetch messages from Discord channels
- Generate AI-powered summaries of channel activity using Claude
- Interactive channel selection via Telegram inline keyboards
- Flexible timeframe selection (6, 12, 24, 48, or 72 hours)
- Automatic message splitting for long reports

## Prerequisites

- Python 3.8+
- Discord Bot Token
- Telegram Bot Token
- Anthropic API Key (for Claude)

## Installation

1. Clone the repository
2. Install dependencies:

```
pip install -r requirements.txt
```

3. Create a `.env` file with the following variables:

```
DISCORD_TOKEN=your_discord_token
GUILD_ID=your_guild_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Usage

1. Start the bot:   

```
python main.py
```

2. In Telegram, use the following commands:
- `/channels` - List available Discord channels
- `/help` - Show help message

3. Select a channel and timeframe using the interactive buttons to generate a report.

## Dependencies

- anthropic
- python-dotenv
- requests

## License

MIT License
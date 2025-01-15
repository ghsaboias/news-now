# News Now

A comprehensive news monitoring and summarization system that watches Discord channels for important messages. Reports are automatically generated and distributed through both Telegram and a web interface at [aiworld.com.br](https://aiworld.com.br).

## Demo

https://github.com/user-attachments/assets/5d9c33f4-53fc-493c-9c75-7e98c3b85eb8

## Features

- Automated report generation (1h and 24h summaries)
- AI-powered summaries using Claude 3 Haiku
- Web interface with real-time updates at aiworld.com.br
- Telegram bot for on-demand reports and channel monitoring
- Smart context handling for better summaries
- Dark/light mode support

## How It Works

### Report Generation
- Automated reports run via cron jobs on our server
- On-demand reports available through Telegram commands
- All reports viewable on the website in real-time
- Activity checking available through Telegram

### Telegram Commands
- `/channels` - List available Discord channels and generate reports
- `/check_activity` - Check current channel activity
- `/help` - Show available commands

## Repository Structure

```
news-now/
├── src/                    # Core functionality
│   ├── main.py            # Discord bot and message monitoring
│   ├── report_manager.py  # Report generation and management
│   ├── telegram_bot.py    # Telegram bot interface
│   └── file_ops.py        # File operations and storage
├── web/                   # Web interface
│   ├── app.py            # Flask application
│   ├── templates/        # HTML templates
│   └── static/           # CSS, JS, and assets
├── data/                 # Generated reports and summaries
├── scripts/              # Deployment and maintenance scripts
└── logs/                # Application logs
```

## Prerequisites

- Python 3.12+
- Discord Bot Token
- Telegram Bot Token
- Anthropic API Key (for Claude)
- Linux/Unix system for deployment

## Local Development Setup

1. Clone the repository:
```bash
git clone git@github.com:yourusername/news-now.git
cd news-now
```

2. Set up Python environment:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Create a `.env` file with required credentials:
```env
DISCORD_TOKEN=your_discord_token
GUILD_ID=your_guild_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Manual Operation

For local testing and development, you can run components directly:

```bash
# Run the Discord bot and message monitoring system
python src/main.py

# Generate specific reports
python src/main.py --1h-report     # Generate 1h report
python src/main.py --24h-report    # Generate 24h report
```

## Production Setup

The system runs on a DigitalOcean droplet with the following components:
- Discord bot service for message monitoring
- Web interface served via Nginx
- Automated report generation via cron jobs

### Service Files
The production setup uses these systemd service files (not needed for local development):
- `discord-report-bot.service` - Main bot service
- `discord-bot-watchdog.service` - Watchdog service

For deployment instructions and server management, see `DEPLOYMENT.md`.

## Report Thresholds
- 1h reports: 5+ messages
- 24h reports: 10+ messages

## Dependencies

Core dependencies:
- anthropic
- python-dotenv
- requests
- flask
- gunicorn

## License

MIT License

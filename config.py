import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.getenv('DATA_DIR', os.path.join('/var/www/news-now/data'))

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Discord configuration
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
GUILD_ID = os.getenv('GUILD_ID')

# Telegram configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

# Claude configuration
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# Report thresholds
REPORT_THRESHOLDS = {
    '10m': 3,  # 3+ messages for 10-minute reports
    '1h': 5,   # 5+ messages for hourly reports
    '24h': 10  # 10+ messages for daily reports
}

# File operations
SUMMARY_RETENTION = {
    '10m': 24,  # Keep 24 10-minute summaries
    '1h': 48,   # Keep 48 hourly summaries
    '24h': 30   # Keep 30 daily summaries
}

# Logging configuration
LOG_FILE = os.path.join(BASE_DIR, 'bot.log')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_MAX_BYTES = 10485760  # 10MB
LOG_BACKUP_COUNT = 5 
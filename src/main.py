import os
import sys
from typing import Dict
import anthropic
import logging
from logging.handlers import RotatingFileHandler
import signal
from file_ops import FileOps
from report_generator import ReportGenerator
from telegram_bot import TelegramBot
from discord_client import DiscordClient
from report_manager import ReportManager

# Import configuration
from config import (
    DISCORD_TOKEN, GUILD_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
    ANTHROPIC_API_KEY, REPORT_THRESHOLDS, LOG_FILE, LOG_FORMAT,
    LOG_MAX_BYTES, LOG_BACKUP_COUNT, DATA_DIR
)

# Configure logging
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

# Clear existing handlers
logging.getLogger().handlers.clear()

logging.basicConfig(
    handlers=[
        RotatingFileHandler(
            LOG_FILE,
            maxBytes=LOG_MAX_BYTES,
            backupCount=LOG_BACKUP_COUNT,
            delay=False,
            encoding='utf-8',
            mode='a'
        ),
        logging.StreamHandler()
    ],
    format=LOG_FORMAT,
    level=logging.INFO
)

# Force immediate flush
for handler in logging.root.handlers:
    handler.flush()
    if isinstance(handler, RotatingFileHandler):
        handler.mode = 'a'
        handler.encoding = 'utf-8'

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Initialize components
claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
report_gen = ReportGenerator(claude_client, logger)
telegram_bot = TelegramBot(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, logger)
discord_client = DiscordClient(DISCORD_TOKEN, GUILD_ID, logger)
file_ops = FileOps()
report_manager = ReportManager(discord_client, telegram_bot, report_gen, file_ops, logger)

# Add graceful shutdown handling
def signal_handler(signum, frame):
    logger.info("Received shutdown signal. Cleaning up...")
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Initialize user states
user_states = {}

def handle_channel_selection(channel_id: str) -> None:
    """Handle channel selection from keyboard"""
    channels = discord_client.fetch_channels()
    channel_name = next((c['name'] for c in channels if c['id'] == channel_id), 'unknown-channel')
    
    message = f"Selected channel: {telegram_bot._clean_channel_name(channel_name)}\n\nSelect timeframe for the report:"
    
    # Store the selected channel ID in user state
    user_states[TELEGRAM_CHAT_ID] = {"selected_channel": channel_id}
    telegram_bot.send_message(message, reply_markup=telegram_bot.create_timeframe_keyboard())

def handle_timeframe_selection(channel_id: str, hours: int) -> None:
    """Handle timeframe selection and generate report"""
    logger.info(f"Generating report for channel {channel_id} for past {hours} hours")
    
    channels = discord_client.fetch_channels()
    channel_name = next((c['name'] for c in channels if c['id'] == channel_id), 'unknown-channel')
    
    result = report_manager.generate_report(channel_id, channel_name, hours)
    if not result:
        telegram_bot.send_message(
            f"No messages found in #{telegram_bot._clean_channel_name(channel_name)} for the last {hours} hour(s)."
        )
        return
        
    telegram_bot.send_message(
        f"Found {result['message_count']} messages in #{telegram_bot._clean_channel_name(channel_name)} for the last {hours} hour(s)."
    )
    
    # Format and send the summary
    formatted_summary = report_manager.format_summary_for_telegram(result['summary'])
    telegram_bot.send_message(formatted_summary)

def process_telegram_callback(callback_query: Dict) -> None:
    """Process callback queries from Telegram inline keyboards"""
    data = callback_query.get('data', '')
    
    if data.startswith('channel_'):
        channel_id = data.split('_')[1]
        handle_channel_selection(channel_id)
        
    elif data.startswith('timeframe_'):
        hours = int(data.split('_')[1])
        user_state = user_states.get(TELEGRAM_CHAT_ID, {})
        channel_id = user_state.get('selected_channel')
        
        if not channel_id:
            telegram_bot.send_message("❌ Please select a channel first using /channels")
            return
            
        handle_timeframe_selection(channel_id, hours)
        # Clear user state after processing
        user_states.pop(TELEGRAM_CHAT_ID, None)
        
    elif data.startswith('activity_'):
        timeframe = data.split('_')[1]
        report_manager.check_channel_activity(timeframe)

def execute_help_command() -> None:
    """Execute the help command and display available commands"""
    help_text = """🤖 Discord Report Bot

Available commands:
- /channels - List channels
- /check_activity - Check activity in all channels
- /help - Show help"""
    telegram_bot.send_message(help_text)

def execute_channels_command() -> None:
    """Execute the channels command and display channel selection keyboard"""
    logger.info("Fetching channels from Discord...")
    channels = discord_client.fetch_channels()
    if channels:
        logger.info(f"Successfully fetched {len(channels)} channels")
        message = "Select a channel to generate a report:"
        reply_markup = telegram_bot.create_channel_selection_keyboard(channels)
        telegram_bot.send_message(message, reply_markup=reply_markup)
    else:
        logger.error("Failed to fetch channels from Discord")
        telegram_bot.send_message("Error: Could not fetch channels")

def process_telegram_command(message: str) -> None:
    """Process incoming Telegram commands"""
    parts = message.lower().split()
    command = parts[0]
    
    if command == '/help':
        execute_help_command()
    elif command == '/channels':
        execute_channels_command()
    elif command == '/check_activity':
        message = "Select timeframe for activity check:"
        reply_markup = telegram_bot.create_activity_timeframe_keyboard()
        telegram_bot.send_message(message, reply_markup=reply_markup)
    elif command.startswith('/'):  # Any other command
        # Check if it's a timeframe input for a selected channel
        if command[1:].replace('.', '').isdigit() or command[1:].endswith(('m', 'h')):
            timeframe = command[1:]  # Remove the leading slash
            user_state = user_states.get(TELEGRAM_CHAT_ID, {})
            channel_id = user_state.get('selected_channel')
            
            if not channel_id:
                telegram_bot.send_message("❌ Please select a channel first using /channels")
                return
                
            try:
                if timeframe.endswith('m'):
                    minutes = int(timeframe[:-1])
                    hours = minutes / 60
                elif timeframe.endswith('h'):
                    hours = int(timeframe[:-1])
                else:
                    telegram_bot.send_message("❌ Invalid timeframe format. Use 'm' for minutes or 'h' for hours (e.g., 10m, 1h, 24h)")
                    return
                    
                handle_timeframe_selection(channel_id, hours)
                # Clear user state after processing
                user_states.pop(TELEGRAM_CHAT_ID, None)
            except ValueError:
                telegram_bot.send_message("❌ Invalid timeframe value. Please use numbers (e.g., 10m, 1h, 24h)")
        else:
            telegram_bot.send_message("❌ Unknown command. Use /help to see available commands")

def main():
    logger.info("Starting Discord Report Bot...")
    
    # Validate environment variables
    required_vars = {
        'DISCORD_TOKEN': DISCORD_TOKEN,
        'GUILD_ID': GUILD_ID,
        'TELEGRAM_BOT_TOKEN': TELEGRAM_BOT_TOKEN,
        'TELEGRAM_CHAT_ID': TELEGRAM_CHAT_ID,
        'ANTHROPIC_API_KEY': ANTHROPIC_API_KEY
    }
    
    missing_vars = [k for k, v in required_vars.items() if not v]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)

    try:
        # Set up bot commands menu
        commands = [
            {"command": "channels", "description": "📊 List available channels"},
            {"command": "check_activity", "description": "📈 Check activity in all channels"},
            {"command": "help", "description": "❓ Show available commands"}
        ]
        
        telegram_bot.setup_commands(commands)
        
        welcome_message = """🤖 Discord Report Bot

Available commands:
• /channels - List channels
• /check_activity - Check activity in all channels
• /help - Show help"""

        logger.info("Sending welcome message...")
        telegram_bot.send_message(welcome_message)
            
        logger.info("Starting message handler...")
        
        def update_handler(update):
            # Handle callback queries (button clicks)
            if 'callback_query' in update:
                process_telegram_callback(update['callback_query'])
            
            # Handle regular messages
            message = update.get('message', {}).get('text', '')
            if message and message.startswith('/'):
                logger.info(f"Processing command: {message}")
                process_telegram_command(message)
        
        # Start polling with new implementation
        telegram_bot.start_polling(update_handler)
        
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--1h-report":
            report_manager.execute_1h_reports()
            sys.exit(0)
        elif sys.argv[1] == "--24h-report":
            report_manager.execute_24h_reports()
            sys.exit(0)
    else:
        # Normal bot operation
        main()
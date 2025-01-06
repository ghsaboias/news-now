import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import requests
import json
from typing import List, Dict, Optional, Tuple
import time
import anthropic
import logging
from logging.handlers import RotatingFileHandler
import signal
import sys
from file_ops import FileOps
from operator import itemgetter

# Load environment variables
load_dotenv()
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = os.getenv("GUILD_ID")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Add logging configuration after imports
logging.basicConfig(
    handlers=[
        RotatingFileHandler(
            'bot.log',
            maxBytes=10485760,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ],
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Add graceful shutdown handling
def signal_handler(signum, frame):
    logger.info("Received shutdown signal. Cleaning up...")
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Add after other global variables
file_ops = FileOps()

def send_telegram_message(message: str, reply_markup=None) -> Optional[dict]:
    """Send a message to Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
        
    try:
        logger.debug(f"Sending message to Telegram: {message[:100]}...")
        logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
        response = requests.post(url, json=payload)
        result = response.json()
        
        if response.status_code == 200:
            logger.debug("Message sent successfully")
        else:
            logger.error(f"Failed to send message. Status code: {response.status_code}")
            logger.error(f"Response: {json.dumps(result, indent=2)}")
            
        return result
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")
        logger.error(f"Full exception: {str(e)}", exc_info=True)
        return None

def fetch_filtered_discord_channels(guild_id: str) -> List[Dict]:
    """Fetch and filter Discord channels based on predefined criteria"""
    headers = {'Authorization': DISCORD_TOKEN}
    url = f'https://discord.com/api/v10/guilds/{guild_id}/channels'
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        send_telegram_message(f"Error fetching channels: {response.status_code}")
        return None
        
    channels = json.loads(response.text)
    
    # Filter channels
    allowed_emojis = {'🟡', '🔴', '🟠', '⚫'}
    filtered_channels = [
        channel for channel in channels 
        if channel['type'] == 0 and
        (
            len(channel['name']) > 0 and
            channel['name'][0] in allowed_emojis and
            ('godly-chat' not in channel['name'] and channel.get('position', 0) < 30)
            or channel['parent_id'] == '1112044935982633060'
        ) 
    ]
    
    return filtered_channels

def fetch_discord_message_batch(channel_id: str, last_message_id: str = None) -> List[Dict]:
    """Fetch a single batch of messages from Discord channel"""
    headers = {'Authorization': DISCORD_TOKEN}
    url = f'https://discord.com/api/v10/channels/{channel_id}/messages?limit=100'
    if last_message_id:
        url += f'&before={last_message_id}'
        
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return None
        
    return json.loads(response.text)

def fetch_bot_messages_in_timeframe(channel_id: str, hours: int = 24) -> List[Dict]:
    """Fetch bot messages from a Discord channel within specified timeframe"""
    messages = []
    last_message_id = None
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    logger.info(f"Fetching messages from channel {channel_id} for past {hours} hours")
    
    while True:
        batch = fetch_discord_message_batch(channel_id, last_message_id)
        if not batch:
            logger.warning(f"No messages received from channel {channel_id}")
            break
            
        # Process batch and get bot messages
        batch_bot_messages = 0
        for msg in batch:
            msg_time = datetime.fromisoformat(msg['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc)
            if (msg['author'].get('username') == 'FaytuksBot' and 
                msg['author'].get('discriminator') == '7032' and 
                msg_time >= cutoff_time):
                messages.append(msg)
                batch_bot_messages += 1
        
        logger.info(f"Processed batch of {len(batch)} messages, found {batch_bot_messages} bot messages")
        
        # Check if we should stop
        last_msg_time = datetime.fromisoformat(batch[-1]['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc)
        if last_msg_time < cutoff_time:
            break
            
        last_message_id = batch[-1]['id']
    
    logger.info(f"Total bot messages found: {len(messages)}")
    return messages

def format_raw_message_report(channel_name: str, messages: List[Dict]) -> str:
    """Format raw messages into a basic report format"""
    report = f"*📊 Report for #{channel_name}*\n\n"
    
    for msg in messages:
        timestamp = datetime.fromisoformat(msg['timestamp'].rstrip('Z')).strftime('%Y-%m-%d %H:%M UTC')
        content = msg['content']
        report += f"🕒 `{timestamp}`\n{content}\n\n"
    
    if not messages:
        report += "No messages found in the specified timeframe\\."
    
    return report

def create_timeframe_selection_keyboard(channel_id: str) -> Dict:
    """Create inline keyboard for timeframe selection"""
    return {
        "inline_keyboard": [
            [
                {"text": "1 hour", "callback_data": f"report_{channel_id}_1"},
                {"text": "2 hours", "callback_data": f"report_{channel_id}_2"}
            ],
            [
                {"text": "4 hours", "callback_data": f"report_{channel_id}_4"},
                {"text": "8 hours", "callback_data": f"report_{channel_id}_8"}
            ],
            [
                {"text": "12 hours", "callback_data": f"report_{channel_id}_12"},
                {"text": "24 hours", "callback_data": f"report_{channel_id}_24"}
            ]
        ]
    }

def create_channel_selection_keyboard(channels: List[Dict]) -> Dict:
    """Create inline keyboard for channel selection"""
    keyboard = []
    row = []
    
    for channel in channels:
        # Get the original name and remove the emoji
        full_name = channel['name']
        name_without_emoji = full_name[1:] if full_name[0] in {'🟡', '🔴', '🟠', '⚫'} else full_name
        
        # Split by hyphen and abbreviate each word
        words = name_without_emoji.split('-')
        abbreviated = []
        for word in words:
            if word.lower() in ['and', 'the', 'for', 'of']:  # Skip abbreviating common words
                abbreviated.append(word)
            else:
                abbreviated.append(word[:5])
        
        # Reconstruct the name with emoji and abbreviations
        emoji = full_name[0] if full_name[0] in {'🟡', '🔴', '🟠', '⚫'} else ''
        abbreviated_name = emoji + '-'.join(abbreviated)
        
        button = {
            "text": abbreviated_name,
            "callback_data": f"channel_{channel['id']}"
        }
        row.append(button)
        
        if len(row) == 2:  # 2 buttons per row
            keyboard.append(row)
            row = []
    
    if row:  # Add any remaining buttons
        keyboard.append(row)
        
    return {"inline_keyboard": keyboard}

def format_messages_for_claude(messages: List[dict]) -> str:
    """Format Discord messages for Claude AI processing"""
    formatted_messages = []
    
    for msg in messages:
        # Extract timestamp
        timestamp = datetime.fromisoformat(msg['timestamp'].rstrip('Z')).strftime('%Y-%m-%d %H:%M UTC')
        
        # Extract content and embeds
        content = msg.get('content', '')
        embeds = msg.get('embeds', [])
        
        # Format embed information
        embed_text = []
        for embed in embeds:
            if embed.get('title'):
                embed_text.append(f"Title: {embed['title']}")
            if embed.get('description'):
                embed_text.append(f"Description: {embed['description']}")
            for field in embed.get('fields', []):
                if field['name'].lower() != 'source':  # Skip source fields
                    embed_text.append(f"{field['name']}: {field['value']}")
        
        # Combine all information
        message_text = f"[{timestamp}]\n"
        if content:
            message_text += f"{content}\n"
        if embed_text:
            message_text += "\n".join(embed_text) + "\n"
        
        formatted_messages.append(message_text)
    
    return "\n---\n".join(formatted_messages)

def create_ai_summary(messages: List[dict], channel_name: str, requested_hours: int) -> Tuple[str, datetime, datetime]:
    """Generate an AI summary of messages using Claude"""
    if not messages:
        return "No messages found in the specified timeframe.", None, None

    # Calculate time period from timestamps
    timestamps = [datetime.fromisoformat(msg['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc) 
                 for msg in messages]
    
    period_start = min(timestamps)
    period_end = max(timestamps)

    formatted_text = format_messages_for_claude(messages)
    
    prompt = f"""Create a concise, journalistic news summary of these military/conflict updates from the last {requested_hours} hours.

    Updates to analyze:
    {formatted_text}

    Requirements:
    - First line must be a clear headline in ALL CAPS
    - Second line must be in format: [City/Region], [Month Day, Year]
    - First paragraph must summarize the most important development
    - Write an appropriate number of paragraphs of supporting details
    - Maximum 5000 characters, average 2500 characters
    - Focus on verified facts and official statements
    - Maintain neutral, factual tone
    - NO analysis or commentary
    
    Example format:
    MAJOR EVENT HAPPENS IN REGION
    Tel Aviv, March 20, 2024 
    
    First paragraph with main development..."""
    
    try:
        response = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            system="""You are an experienced news wire journalist creating concise, clear updates.""",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        return response.content[0].text, period_start, period_end
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return "Error generating summary. Please try again.", None, None

def save_summary_to_storage(channel_name: str, summary: str, period_start: datetime, 
                          period_end: datetime, timeframe: str) -> None:
    """Save the generated summary to storage"""
    if period_start and period_end:
        summary_data = {
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "timeframe": timeframe,
            "channel": channel_name,
            "content": summary
        }
        file_ops.save_summary(channel_name, summary_data)

def handle_channel_selection(channel_id: str) -> None:
    """Handle channel selection from keyboard"""
    logger.info(f"User selected channel: {channel_id}")
    message = "Select timeframe for the report:"
    reply_markup = create_timeframe_selection_keyboard(channel_id)
    send_telegram_message(message, reply_markup)

def handle_timeframe_selection(channel_id: str, hours: int) -> None:
    """Handle timeframe selection and generate report"""
    logger.info(f"Generating report for channel {channel_id} for past {hours} hours")
    
    channels = fetch_filtered_discord_channels(GUILD_ID)
    channel_name = next((c['name'] for c in channels if c['id'] == channel_id), 'unknown-channel')
    
    messages = fetch_bot_messages_in_timeframe(channel_id, hours)
    
    send_telegram_message(f"Found {len(messages)} messages in #{channel_name} for the last {hours} hour(s).")
    
    if not messages:
        logger.info(f"No messages found in {channel_name} for the last {hours} hours")
        send_telegram_message(f"No messages found in #{channel_name} for the last {hours} hours.")
        return
    
    # Generate and save summary
    summary, period_start, period_end = create_ai_summary(messages, channel_name, hours)
    if summary:
        save_summary_to_storage(channel_name, summary, period_start, period_end, f"{hours}h")
        send_telegram_message(summary)

def process_telegram_callback(callback_query: Dict) -> None:
    """Process callback queries from Telegram inline keyboards"""
    data = callback_query.get('data', '')
    
    if data.startswith('channel_'):
        channel_id = data.split('_')[1]
        handle_channel_selection(channel_id)
        
    elif data.startswith('report_'):
        _, channel_id, hours = data.split('_')
        try:
            handle_timeframe_selection(channel_id, int(hours))
        except Exception as e:
            error_msg = f"Error generating report: {str(e)}"
            logger.error(error_msg, exc_info=True)
            send_telegram_message(error_msg)

def setup_bot_commands():
    """Set up the bot's command menu in Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setMyCommands"
    commands = [
        {"command": "channels", "description": "📊 List available Discord channels"},
        {"command": "inform", "description": "🔄 Create reports for 3 most active channels in last hour"},
        {"command": "help", "description": "❓ Show available commands"}
    ]
    
    try:
        response = requests.post(url, json={"commands": commands})
        if response.status_code == 200:
            logger.info("Successfully set up bot commands menu")
        else:
            logger.error(f"Failed to set up commands menu: {response.status_code}")
    except Exception as e:
        logger.error(f"Error setting up commands menu: {e}")

def analyze_channel_activity(hours: int = 24) -> List[tuple]:
    """Analyze and return activity metrics for all channels with more than 3 messages"""
    channels = fetch_filtered_discord_channels(GUILD_ID)
    if not channels:
        logger.error("Failed to fetch channels")
        return []
    
    channel_counts = []
    for channel in channels:
        messages = fetch_bot_messages_in_timeframe(channel['id'], hours)
        if messages and len(messages) > 3:  # Only include channels with more than 3 messages
            channel_counts.append((channel['id'], channel['name'], len(messages)))
    
    # Sort by message count in descending order
    return sorted(channel_counts, key=itemgetter(2), reverse=True)

def send_activity_overview(active_channels: List[tuple], hours: int) -> None:
    """Send an overview message of channel activity"""
    if not active_channels:
        send_telegram_message("ℹ️ No channels have significant activity (>3 messages) in the last hour")
        return
        
    overview = "*🤖 Automated Report Generation*\n\n"
    overview += f"Analyzing active channels from the last {hours} hours:\n"
    for channel_id, channel_name, count in active_channels:
        overview += f"• #{channel_name}: {count} messages\n"
    
    send_telegram_message(overview)

def generate_top_channel_reports(active_channels: List[tuple], top_n: int, hours: int) -> None:
    """Generate reports for the top N most active channels"""
    for channel_id, channel_name, count in active_channels[:top_n]:
        logger.info(f"Generating report for #{channel_name}")
        messages = fetch_bot_messages_in_timeframe(channel_id, hours)
        
        if messages:
            summary, period_start, period_end = create_ai_summary(messages, channel_name, hours)
            if summary:
                save_summary_to_storage(channel_name, summary, period_start, period_end, f"{hours}h")
                send_telegram_message(f"*📊 Automated Report: #{channel_name}*")
                send_telegram_message(summary)
        
        # Add delay between reports to avoid rate limiting
        time.sleep(5)

def execute_help_command() -> None:
    """Execute the help command and display available commands"""
    help_text = """*📋 Available Commands*

• /channels - List all available Discord channels
• /active - Check most active channels in last hour
• /help - Show this help message

Select a channel and timeframe using the buttons to generate reports."""
    send_telegram_message(help_text)

def execute_channels_command() -> None:
    """Execute the channels command and display channel selection keyboard"""
    logger.info("Fetching channels from Discord...")
    channels = fetch_filtered_discord_channels(GUILD_ID)
    if channels:
        logger.info(f"Successfully fetched {len(channels)} channels")
        message = "Select a channel to generate report:"
        reply_markup = create_channel_selection_keyboard(channels)
        response = send_telegram_message(message, reply_markup)
        if response:
            logger.info("Successfully sent channels message with keyboard")
        else:
            logger.error("Failed to send channels message")
    else:
        logger.error("Failed to fetch channels from Discord")
        send_telegram_message("Error: Could not fetch channels")

def execute_active_command() -> None:
    """Execute the active command and generate reports for most active channels"""
    logger.info("Running inform command for most active channels in last hour...")
    active_channels = analyze_channel_activity(hours=1)
    
    if not active_channels:
        send_telegram_message("ℹ️ No channels have significant activity in the last hour")
        return
        
    send_activity_overview(active_channels[:3], hours=1)
    generate_top_channel_reports(active_channels, top_n=3, hours=1)

def process_telegram_command(message: str) -> None:
    """Process incoming Telegram commands"""
    parts = message.lower().split()
    command = parts[0]
    
    if command == '/help':
        execute_help_command()
    elif command == '/channels':
        execute_channels_command()
    elif command == '/active':
        execute_active_command()

def run_telegram_message_loop() -> None:
    """Run the main Telegram message processing loop"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
    last_update_id = None
    consecutive_errors = 0
    
    logger.info("Bot started and listening for messages...")
    
    while True:
        try:
            params = {'timeout': 100}
            if last_update_id is not None:
                params['offset'] = last_update_id
                
            response = requests.get(url, params=params, timeout=120)
            response.raise_for_status()
            updates = response.json().get('result', [])
            
            if updates:
                logger.info(f"Found {len(updates)} new updates")
            
            for update in updates:
                try:
                    # Handle callback queries (button clicks)
                    if 'callback_query' in update:
                        process_telegram_callback(update['callback_query'])
                    
                    # Handle regular messages
                    message = update.get('message', {}).get('text', '')
                    if message and message.startswith('/'):
                        logger.info(f"Processing command: {message}")
                        process_telegram_command(message)
                        
                    # Only update the offset after successfully processing the message
                    last_update_id = update['update_id'] + 1
                    
                except Exception as e:
                    logger.error(f"Error processing update {update['update_id']}: {e}", exc_info=True)
                    # Still update offset to avoid getting stuck on a problematic message
                    last_update_id = update['update_id'] + 1
            
            # Reset error counter on successful iteration
            consecutive_errors = 0
            time.sleep(1)
            
        except requests.exceptions.RequestException as e:
            consecutive_errors += 1
            logger.error(f"Network error: {e}")
            
            # Exponential backoff with max delay of 5 minutes
            delay = min(300, 2 ** consecutive_errors)
            logger.info(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            
        except Exception as e:
            consecutive_errors += 1
            logger.error(f"Unexpected error: {e}", exc_info=True)
            
            # Exponential backoff with max delay of 5 minutes
            delay = min(300, 2 ** consecutive_errors)
            logger.info(f"Retrying in {delay} seconds...")
            time.sleep(delay)

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
        setup_bot_commands()
        
        welcome_message = """*🤖 Discord Report Bot*

Available commands:
• /channels - List channels
• /active - Check active channels
• /help - Show help

Type /help for more information."""

        logger.info("Sending welcome message...")
        send_telegram_message(welcome_message)
        logger.info("Starting message handler...")
        run_telegram_message_loop()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--auto-report":
        # When called with --auto-report, generate reports and exit
        active_channels = analyze_channel_activity(hours=8)
        if active_channels:
            send_activity_overview(active_channels[:3], hours=8)
            generate_top_channel_reports(active_channels, top_n=3, hours=8)
        sys.exit(0)
    else:
        # Normal bot operation
        main()
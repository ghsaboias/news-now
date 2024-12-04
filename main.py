import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import requests
import json
from typing import List, Dict, Optional
import time
import anthropic
import textwrap
import logging
from logging.handlers import RotatingFileHandler
import signal
import sys
from file_ops import FileOps
from collections import deque

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

# Add graceful shutdown handling
def signal_handler(signum, frame):
    logger.info("Received shutdown signal. Cleaning up...")
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

# Add after other global variables
file_ops = FileOps()

class MessageTracker:
    def __init__(self, max_size=1000):
        self.sent_messages = deque(maxlen=max_size)
        self.message_timestamps = deque(maxlen=max_size)
        self.cleanup_interval = 3600  # 1 hour
        self.last_cleanup = time.time()

    def is_duplicate(self, message: str) -> bool:
        current_time = time.time()
        
        # Cleanup old messages
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_messages()
            self.last_cleanup = current_time

        # Check if message was sent in the last hour
        message_hash = hash(message)
        return message_hash in self.sent_messages

    def mark_sent(self, message: str):
        message_hash = hash(message)
        current_time = time.time()
        self.sent_messages.append(message_hash)
        self.message_timestamps.append(current_time)

    def _cleanup_old_messages(self):
        current_time = time.time()
        while self.message_timestamps and current_time - self.message_timestamps[0] > 3600:
            self.sent_messages.popleft()
            self.message_timestamps.popleft()

message_tracker = MessageTracker()

def send_telegram_message(message: str, reply_markup=None) -> Optional[dict]:
    """Send a message to Telegram with duplicate prevention"""
    if message_tracker.is_duplicate(message):
        logger.debug(f"Skipping duplicate message: {message[:100]}...")
        return None
        
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
        response = requests.post(url, json=payload)
        result = response.json()
        
        if response.status_code == 200:
            message_tracker.mark_sent(message)
            logger.debug("Message sent successfully")
        else:
            logger.error(f"Failed to send message. Status code: {response.status_code}, Response: {result}")
            
        return result
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")
        return None

def get_guild_channels(guild_id: str):
    """Get all channels from a Discord guild"""
    headers = {'Authorization': DISCORD_TOKEN}
    url = f'https://discord.com/api/v10/guilds/{guild_id}/channels'
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
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

def get_channel_messages(channel_id: str, hours: int = 24):
    """Get messages from a Discord channel within the specified timeframe"""
    messages = []
    last_message_id = None
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    logger.info(f"Fetching messages from channel {channel_id} for past {hours} hours")
    
    while True:
        batch = get_batch_messages(channel_id, last_message_id)
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

def get_batch_messages(channel_id: str, last_message_id: str = None):
    """Helper function to get a batch of messages"""
    headers = {'Authorization': DISCORD_TOKEN}
    url = f'https://discord.com/api/v10/channels/{channel_id}/messages?limit=100'
    if last_message_id:
        url += f'&before={last_message_id}'
        
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return None
        
    return json.loads(response.text)

def generate_report(channel_name: str, messages: List[Dict]) -> str:
    """Generate a formatted report from messages"""
    report = f"*📊 Report for #{channel_name}*\n\n"
    
    for msg in messages:
        timestamp = datetime.fromisoformat(msg['timestamp'].rstrip('Z')).strftime('%Y-%m-%d %H:%M UTC')
        content = msg['content']
        report += f"🕒 `{timestamp}`\n{content}\n\n"
    
    if not messages:
        report += "No messages found in the specified timeframe\\."
    
    return report

def create_timeframe_keyboard(channel_id: str):
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

def create_channels_keyboard(channels):
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

def format_messages_for_summary(messages: List[dict]) -> str:
    """Format Discord messages into a clean text format for Claude"""
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

def generate_summary(messages: List[dict], channel_name: str, requested_hours: int) -> str:
    """Generate a summary of the messages using Claude"""
    if not messages:
        return "No messages found in the specified timeframe."
    
    # Calculate time period from timestamps
    timestamps = [datetime.fromisoformat(msg['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc) 
                 for msg in messages]
    
    period_start = min(timestamps)  # Keep as datetime object
    period_end = max(timestamps)    # Keep as datetime object

    formatted_text = format_messages_for_summary(messages)

    # Save formatted messages with deduplication
    file_ops.append_formatted_messages(channel_name, formatted_text, period_start, period_end)
        
    # Get previous summary for context
    previous_summary = file_ops.get_latest_summary(channel_name, f"{requested_hours}h")
    context = ""
    if previous_summary:
        context = f"""Previous report context:
        Time period: {previous_summary['period_start']} to {previous_summary['period_end']}
        {previous_summary['content']}
        
        Use this for context and continuity, but focus on new developments."""

    prompt = f"""Analyze and summarize these military/conflict updates from the last {requested_hours} hours. 

    New updates to analyze:
    {formatted_text}

    Requirements:
    1. LENGTH: Maximum 3500 characters
    2. STRUCTURE: 
       - Start with "Topic/Region - Current Date" as title
       - Make sure you include the country name in the title
       - Group by time period (Early Morning/Mid-Morning/Afternoon)
       - Use location/front as subheadings WITHOUT repeating the main title
       - Report each event ONCE in its most relevant section
       - Merge related events into single, clear statements
    3. CONTENT:
       - Focus on concrete events and verified information
       - Include specific details: locations, numbers, names
       - If multiple sources confirm an event, mention once with "confirmed by multiple sources"
       - Exclude redundant updates about the same event
    4. FORMAT:
       - Start directly with title
       - Use short subheadings
       - Be extremely concise - no repetition
       - Each event should be reported only once
       - Merge similar/related updates into single points
       - NO introductory or concluding phrases
       - NO analysis or commentary

    Context:
    {context}
    """
    
    try:
        response = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            system="""You are an expert military intelligence analyst creating precise situation reports.
            Your summaries must:
            - Start with "Topic/Region - Current Date" format
            - Report each event ONCE in its most relevant section
            - Merge related information into single, clear statements
            - Eliminate all redundancy and repetition
            - Include specific facts without duplicating information
            - Stay under 3500 characters
            - Be extremely concise
            - Never repeat information
            - Include essential details without bloat
            - Never add commentary or analysis""",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        summary = response.content[0].text
        
        summary_data = {
            "period_start": period_start.isoformat(),  # Convert to ISO string when saving
            "period_end": period_end.isoformat(),      # Convert to ISO string when saving
            "timeframe": f"{requested_hours}h",
            "channel": channel_name,
            "content": summary
        }
        file_ops.save_summary(channel_name, summary_data)
        
        return summary
        
    except Exception as e:
        logger.error(f"Error generating summary: {str(e)}")
        return "Error generating summary. Please try again."

def handle_callback_query(callback_query):
    """Handle callback queries from inline keyboards"""
    data = callback_query.get('data', '')
    
    if data.startswith('channel_'):
        channel_id = data.split('_')[1]
        logger.info(f"User selected channel: {channel_id}")
        message = "Select timeframe for the report:"
        reply_markup = create_timeframe_keyboard(channel_id)
        send_telegram_message(message, reply_markup)
        
    elif data.startswith('report_'):
        _, channel_id, hours = data.split('_')
        try:
            hours = int(hours)
            logger.info(f"Generating report for channel {channel_id} for past {hours} hours")
            
            channels = get_guild_channels(GUILD_ID)
            channel_name = next((c['name'] for c in channels if c['id'] == channel_id), 'unknown-channel')
            
            # Get messages and generate summary
            messages = get_channel_messages(channel_id, hours)

            send_telegram_message(f"Found {len(messages)} messages in #{channel_name}. Generating summary...")
            
            if not messages:
                logger.info(f"No messages found in {channel_name} for the last {hours} hours")
                send_telegram_message(f"No messages found in #{channel_name} for the last {hours} hours.")
                return
                
            # Generate and send summary
            summary = generate_summary(messages, channel_name, hours)
            if summary:
                send_telegram_message(summary)
            
        except Exception as e:
            error_msg = f"Error generating report: {str(e)}"
            logger.error(error_msg, exc_info=True)
            send_telegram_message(error_msg)

def handle_telegram_command(message: str):
    """Handle incoming Telegram commands"""
    parts = message.lower().split()
    command = parts[0]
    
    if command == '/help':
        help_text = """
        Available commands:
        /channels - List all available Discord channels
        /help - Show this help message

        Click on channel buttons to select timeframe and generate reports.
        """
        send_telegram_message(help_text)
        
    elif command == '/channels':
        channels = get_guild_channels(GUILD_ID)
        if channels:
            message = "Select a channel to generate report:"
            reply_markup = create_channels_keyboard(channels)
            send_telegram_message(message, reply_markup)
        else:
            send_telegram_message("Error: Could not fetch channels")

def handle_incoming_messages():
    """Handle incoming Telegram messages"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
    last_update_id = None
    consecutive_errors = 0
    
    logger.info("Bot started and listening for messages...")
    
    while True:
        try:
            params = {'timeout': 100, 'offset': last_update_id}
            response = requests.get(url, params=params, timeout=120)  # Add timeout
            response.raise_for_status()  # Raise exception for bad status codes
            updates = response.json().get('result', [])
            
            if updates:
                logger.info(f"Found {len(updates)} new updates")
            
            for update in updates:
                last_update_id = update['update_id'] + 1
                
                # Handle callback queries (button clicks)
                if 'callback_query' in update:
                    handle_callback_query(update['callback_query'])
                    continue
                
                # Handle regular messages
                message = update.get('message', {}).get('text', '')
                if message and message.startswith('/'):
                    logger.info(f"Processing command: {message}")
                    handle_telegram_command(message)
            
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
        welcome_message = """
Bot is running!

Commands:
/channels - List channels
/help - Show help

Type /help for more info."""

        logger.info("Sending welcome message...")
        send_telegram_message(welcome_message)
        logger.info("Starting message handler...")
        handle_incoming_messages()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
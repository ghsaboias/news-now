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
user_states = {}

def escape_markdown_v2(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2 format"""
    special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
    for char in special_chars:
        text = text.replace(char, f'\\{char}')
    return text

def send_telegram_message(message: str, reply_markup=None, is_error_message: bool = False) -> Optional[dict]:
    """Send a message to Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    # Don't escape message if it's an error message
    if not is_error_message:
        message = escape_markdown_v2(message)
    
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "MarkdownV2" if not is_error_message else None
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
            if not is_error_message:
                send_telegram_message(f"❌ Error: Failed to send message: {result}", is_error_message=True)
            
        return result
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")
        logger.error(f"Full exception: {str(e)}", exc_info=True)
        if not is_error_message:
            send_telegram_message(f"❌ Error: Failed to send message: {e}", is_error_message=True)
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

def fetch_bot_messages_in_timeframe(channel_id: str, hours: int = 24, minutes: int = None) -> List[Dict]:
    """Fetch bot messages from a Discord channel within specified timeframe"""
    messages = []
    last_message_id = None
    
    # Calculate cutoff time based on hours or minutes
    if minutes is not None:
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        time_str = f"{minutes} minutes"
    else:
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        time_str = f"{hours} hours"
    
    logger.info(f"Fetching messages from channel {channel_id} for past {time_str}")
    
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

def create_timeframe_keyboard() -> Dict:
    """Create inline keyboard for timeframe selection"""
    return {
        "inline_keyboard": [
            [
                {"text": "1 hour", "callback_data": "timeframe_1"},
                {"text": "2 hours", "callback_data": "timeframe_2"}
            ],
            [
                {"text": "4 hours", "callback_data": "timeframe_4"},
                {"text": "8 hours", "callback_data": "timeframe_8"}
            ],
            [
                {"text": "12 hours", "callback_data": "timeframe_12"},
                {"text": "24 hours", "callback_data": "timeframe_24"}
            ]
        ]
    }

def create_channel_selection_keyboard(channels: List[Dict]) -> Dict:
    """Create inline keyboard for channel selection"""
    keyboard = []
    row = []
    
    for channel in channels:
        button = {
            "text": f"#{channel['name']}",
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
    
    # Get the previous summary for context
    timeframe = f"{requested_hours}h"
    previous_summary = file_ops.get_latest_summary(channel_name, timeframe)
    previous_summary_text = ""
    if previous_summary:
        previous_summary_text = f"""CONTEXT FROM PREVIOUS REPORT
        Time period: {datetime.fromisoformat(previous_summary['period_start']).strftime('%B %d, %Y %H:%M')} to {datetime.fromisoformat(previous_summary['period_end']).strftime('%B %d, %Y %H:%M')} UTC

        {previous_summary['content']}

        -------------------
        NEW UPDATES TO INCORPORATE
        """
    
    prompt = f"""Create a concise, journalistic report of the following updates, incorporating context from the previous report when relevant.

    {previous_summary_text}Updates to analyze:
    {formatted_text}

    Requirements:
    - First line must be a factual headline in ALL CAPS that informs about the main event
    - Second line must be in format: [City/Region], [Month Day, Year]
    - First paragraph must summarize the most important verified development
    - Each subsequent paragraph must directly relate to the main topic
    - Maximum 4096 characters, average 2500 characters
    - Only include verified facts and direct quotes from official statements
    - Maintain strictly neutral tone - avoid loaded terms or partisan framing
    - NO analysis, commentary, or speculation
    - NO use of terms like "likely", "appears to", or "is seen as"

    When incorporating previous context:
    - Focus primarily on new developments from the current timeframe
    - Reference previous events only if they directly relate to new developments
    - Avoid repeating old information unless it provides crucial context
    - If a situation has evolved, clearly indicate what has changed
    - Maintain chronological clarity when connecting past and present events
    
    Example format:
    MAJOR DEVELOPMENT OCCURS IN REGION
    Tel Aviv, March 20, 2024 
    
    First paragraph with main verified development..."""
    
    try:
        response = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            system="""You are an experienced news wire journalist creating concise, clear updates. Your task is to report the latest developments while maintaining narrative continuity with previous coverage. Focus on what's new and noteworthy, using prior context only when it enhances understanding of current events.""",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        
        if not response or not response.content or not response.content[0].text:
            error_msg = "Claude returned empty response"
            logger.error(error_msg)
            send_telegram_message(f"❌ Error: {error_msg}")
            return None, None, None
            
        summary = response.content[0].text
        
        return summary, period_start, period_end
        
    except Exception as e:
        error_msg = f"Unexpected error generating summary: {str(e)}"
        logger.error(error_msg, exc_info=True)
        send_telegram_message(f"❌ {error_msg}")
        return None, None, None

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
    channels = fetch_filtered_discord_channels(GUILD_ID)
    channel_name = next((c['name'] for c in channels if c['id'] == channel_id), 'unknown-channel')
    
    message = f"Selected channel: *#{channel_name}*\n\nSelect timeframe for the report:"
    
    # Store the selected channel ID in user state
    user_states[TELEGRAM_CHAT_ID] = {"selected_channel": channel_id}
    send_telegram_message(message, reply_markup=create_timeframe_keyboard())

def handle_timeframe_selection(channel_id: str, hours: int) -> None:
    """Handle timeframe selection and generate report"""
    logger.info(f"Generating report for channel {channel_id} for past {hours} hours")
    
    channels = fetch_filtered_discord_channels(GUILD_ID)
    channel_name = next((c['name'] for c in channels if c['id'] == channel_id), 'unknown-channel')
    
    messages = fetch_bot_messages_in_timeframe(channel_id, hours)
    
    send_telegram_message(f"Found {len(messages)} messages in #{channel_name} for the last {hours} hour(s).")
    
    if not messages:
        logger.info(f"No messages found in {channel_name} for the last {hours} hours")
        send_telegram_message(f"No messages found in #{channel_name} for the last {hours} hour(s).")
        return
    
    try:
        summary, period_start, period_end = create_ai_summary(messages, channel_name, hours)
        
        if not summary:
            send_telegram_message(f"❌ Error: AI summary generation returned empty result for #{channel_name}")
            return
            
        try:
            save_summary_to_storage(channel_name, summary, period_start, period_end, f"{hours}h")
        except Exception as storage_error:
            logger.error(f"Failed to save summary: {str(storage_error)}")
            send_telegram_message(f"⚠️ Warning: Summary generated but failed to save to storage: {str(storage_error)}")
            
        try:
            send_telegram_message(summary)
        except Exception as send_error:
            logger.error(f"Failed to send summary: {str(send_error)}")
            send_telegram_message(f"❌ Error: Summary generated but failed to send: {str(send_error)}")
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to generate summary: {error_msg}", exc_info=True)
        send_telegram_message(f"❌ Error generating summary for #{channel_name}: {error_msg}")

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
            send_telegram_message("❌ Please select a channel first using /channels")
            return
            
        handle_timeframe_selection(channel_id, hours)
        # Clear user state after processing
        user_states.pop(TELEGRAM_CHAT_ID, None)
        
    elif data.startswith('activity_'):
        timeframe = data.split('_')[1]
        check_channel_activity(timeframe)

def setup_bot_commands():
    """Set up the bot's command menu in Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setMyCommands"
    commands = [
        {"command": "channels", "description": "📊 List available channels"},
        {"command": "check_activity", "description": "📈 Check activity in all channels"},
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

def execute_help_command() -> None:
    """Execute the help command and display available commands"""
    help_text = """🤖 *Discord Report Bot*

Available commands:
- /channels - List channels
- /check_activity - Check activity in all channels
- /help - Show help"""
    send_telegram_message(help_text)

def execute_channels_command() -> None:
    """Execute the channels command and display channel selection keyboard"""
    logger.info("Fetching channels from Discord...")
    channels = fetch_filtered_discord_channels(GUILD_ID)
    if channels:
        logger.info(f"Successfully fetched {len(channels)} channels")
        message = "*Select a channel to generate a report:*"
        reply_markup = create_channel_selection_keyboard(channels)
        send_telegram_message(message, reply_markup)
    else:
        logger.error("Failed to fetch channels from Discord")
        send_telegram_message("Error: Could not fetch channels")

def process_telegram_command(message: str) -> None:
    """Process incoming Telegram commands"""
    parts = message.lower().split()
    command = parts[0]
    
    if command == '/help':
        execute_help_command()
    elif command == '/channels':
        execute_channels_command()
    elif command == '/check_activity':
        message = "*Select timeframe for activity check:*"
        reply_markup = create_activity_timeframe_keyboard()
        send_telegram_message(message, reply_markup)
    elif command.startswith('/'):  # Any other command
        # Check if it's a timeframe input for a selected channel
        if command[1:].replace('.', '').isdigit() or command[1:].endswith(('m', 'h')):
            timeframe = command[1:]  # Remove the leading slash
            user_state = user_states.get(TELEGRAM_CHAT_ID, {})
            channel_id = user_state.get('selected_channel')
            
            if not channel_id:
                send_telegram_message("❌ Please select a channel first using /channels")
                return
                
            try:
                if timeframe.endswith('m'):
                    minutes = int(timeframe[:-1])
                    hours = minutes / 60
                elif timeframe.endswith('h'):
                    hours = int(timeframe[:-1])
                else:
                    send_telegram_message("❌ Invalid timeframe format. Use 'm' for minutes or 'h' for hours (e.g., 10m, 1h, 24h)")
                    return
                    
                handle_timeframe_selection(channel_id, hours)
                # Clear user state after processing
                user_states.pop(TELEGRAM_CHAT_ID, None)
            except ValueError:
                send_telegram_message("❌ Invalid timeframe value. Please use numbers (e.g., 10m, 1h, 24h)")
        else:
            send_telegram_message("❌ Unknown command. Use /help to see available commands")

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

def generate_report_if_threshold_met(channel_id: str, channel_name: str, timeframe: str, min_messages: int) -> Tuple[int, bool]:
    """Generate and optionally send a report if message threshold is met
    Returns: (message_count, whether_report_was_saved)"""
    # Convert timeframe to hours for message fetching
    if timeframe.endswith('m'):
        minutes = int(timeframe[:-1])
        hours = minutes / 60
    else:
        hours = int(timeframe[:-1])
    
    messages = fetch_bot_messages_in_timeframe(channel_id, hours=hours)
    if not messages:
        logger.info(f"No messages found for #{channel_name} in the last {timeframe}")
        return 0, False
        
    message_count = len(messages)
    logger.info(f"Found {message_count} messages for #{channel_name} in the last {timeframe}")
    
    # Generate report regardless of threshold
    summary, period_start, period_end = create_ai_summary(messages, channel_name, hours)
    if summary:
        save_summary_to_storage(channel_name, summary, period_start, period_end, timeframe)
        
        # Only send if threshold is met
        if message_count >= min_messages:
            send_telegram_message(f"*📊 Report for #{channel_name} ({timeframe})*\nMessages in timeframe: {message_count}")
            send_telegram_message(summary)
        
        return message_count, True
    return message_count, False

def execute_10min_reports() -> None:
    """Execute 10-minute reports for all channels"""
    logger.info("Running 10-minute reports...")
    send_telegram_message("🔄 Running 10-minute report check...")
    
    channels = fetch_filtered_discord_channels(GUILD_ID)
    if not channels:
        logger.error("Failed to fetch channels")
        send_telegram_message("❌ Error: Failed to fetch channels")
        return
    
    channel_stats = {}
    reports_saved = 0
    
    for channel in channels:
        message_count, was_saved = generate_report_if_threshold_met(channel['id'], channel['name'], "10m", min_messages=3)
        if message_count > 0:
            channel_stats[channel['name']] = message_count
        if was_saved:
            reports_saved += 1
        time.sleep(1)  # Rate limiting protection
    
    if channel_stats:
        summary = "*📊 10-minute Report Summary*\n\n"
        summary += "\n".join(f"• #{name}: {count} messages" for name, count in channel_stats.items())
        summary += f"\n\nReports saved for {reports_saved} channels"
        if not any(count >= 3 for count in channel_stats.values()):
            summary += "\nNo channels met threshold (3 messages) for sending report"
        send_telegram_message(summary)
    else:
        send_telegram_message("ℹ️ No activity in any channel in the last 10 minutes")

def execute_1h_reports() -> None:
    """Execute 1-hour reports for all channels"""
    logger.info("Running 1-hour reports...")
    send_telegram_message("🔄 Running hourly report check...")
    
    channels = fetch_filtered_discord_channels(GUILD_ID)
    if not channels:
        logger.error("Failed to fetch channels")
        send_telegram_message("❌ Error: Failed to fetch channels")
        return
    
    channel_stats = {}
    reports_saved = 0
    
    for channel in channels:
        message_count, was_saved = generate_report_if_threshold_met(channel['id'], channel['name'], "1h", min_messages=5)
        if message_count > 0:
            channel_stats[channel['name']] = message_count
        if was_saved:
            reports_saved += 1
        time.sleep(1)  # Rate limiting protection
    
    if channel_stats:
        summary = "*📊 Hourly Report Summary*\n\n"
        summary += "\n".join(f"• #{name}: {count} messages" for name, count in channel_stats.items())
        summary += f"\n\nReports saved for {reports_saved} channels"
        if not any(count >= 5 for count in channel_stats.values()):
            summary += "\nNo channels met threshold (5 messages) for sending report"
        send_telegram_message(summary)
    else:
        send_telegram_message("ℹ️ No activity in any channel in the last hour")

def execute_24h_reports() -> None:
    """Execute 24-hour reports for all channels"""
    logger.info("Running 24-hour reports...")
    send_telegram_message("🔄 Running daily report check...")
    
    channels = fetch_filtered_discord_channels(GUILD_ID)
    if not channels:
        logger.error("Failed to fetch channels")
        send_telegram_message("❌ Error: Failed to fetch channels")
        return
    
    channel_stats = {}
    reports_saved = 0
    
    for channel in channels:
        message_count, was_saved = generate_report_if_threshold_met(channel['id'], channel['name'], "24h", min_messages=10)
        if message_count > 0:
            channel_stats[channel['name']] = message_count
        if was_saved:
            reports_saved += 1
        time.sleep(1)  # Rate limiting protection
    
    if channel_stats:
        summary = "*📊 Daily Report Summary*\n\n"
        summary += "\n".join(f"• #{name}: {count} messages" for name, count in channel_stats.items())
        summary += f"\n\nReports saved for {reports_saved} channels"
        if not any(count >= 10 for count in channel_stats.values()):
            summary += "\nNo channels met threshold (10 messages) for sending report"
        send_telegram_message(summary)
    else:
        send_telegram_message("ℹ️ No activity in any channel in the last 24 hours")

def create_activity_timeframe_keyboard() -> Dict:
    """Create inline keyboard for activity check timeframe selection"""
    return {
        "inline_keyboard": [
            [
                {"text": "30 minutes", "callback_data": "activity_30m"},
                {"text": "1 hour", "callback_data": "activity_1h"}
            ],
            [
                {"text": "2 hours", "callback_data": "activity_2h"},
                {"text": "4 hours", "callback_data": "activity_4h"}
            ]
        ]
    }

def check_channel_activity(timeframe: str) -> None:
    """Check activity across all channels for a given timeframe"""
    logger.info(f"Checking activity for all channels in the last {timeframe}")
    send_telegram_message(f"🔄 Checking channel activity for the last {timeframe}...")
    
    channels = fetch_filtered_discord_channels(GUILD_ID)
    if not channels:
        logger.error("Failed to fetch channels")
        send_telegram_message("❌ Error: Failed to fetch channels")
        return
    
    channel_stats = {}
    
    # Convert timeframe to hours/minutes for message fetching
    if timeframe.endswith('m'):
        minutes = int(timeframe[:-1])
        hours = minutes / 60
    else:
        hours = int(timeframe[:-1])
    
    for channel in channels:
        messages = fetch_bot_messages_in_timeframe(channel['id'], hours=hours)
        message_count = len(messages) if messages else 0
        if message_count > 0:
            channel_stats[channel['name']] = message_count
        time.sleep(1)  # Rate limiting protection
    
    if channel_stats:
        # Sort channels by message count in descending order
        sorted_stats = dict(sorted(channel_stats.items(), key=lambda x: x[1], reverse=True))
        summary = f"*📊 Channel Activity ({timeframe})*\n\n"
        summary += "\n".join(f"• #{name}: {count} messages" for name, count in sorted_stats.items())
        send_telegram_message(summary)
    else:
        send_telegram_message(f"ℹ️ No activity in any channel in the last {timeframe}")

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
        
        welcome_message = """🤖 *Discord Report Bot*

*Available commands:*
/channels \- List channels
/check\_activity \- Check activity in all channels
/help \- Show help"""

        logger.info("Sending welcome message...")
        send_telegram_message(welcome_message)
        logger.info("Starting message handler...")
        run_telegram_message_loop()
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--10min-report":
            execute_10min_reports()
            sys.exit(0)
        elif sys.argv[1] == "--1h-report":
            execute_1h_reports()
            sys.exit(0)
        elif sys.argv[1] == "--24h-report":
            execute_24h_reports()
            sys.exit(0)
    else:
        # Normal bot operation
        main()
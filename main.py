import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import requests
import json
from typing import List, Dict, Optional
import time
import anthropic
import textwrap

# Load environment variables
load_dotenv()
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = os.getenv("GUILD_ID")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def send_telegram_message(message: str, reply_markup=None):
    """Send a message to Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
        
    try:
        print(f"Sending message to Telegram...")
        response = requests.post(url, json=payload)
        result = response.json()
        print(f"Telegram API response: {result}")
        return result
    except Exception as e:
        print(f"Error sending Telegram message: {e}")
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
    
    while True:
        batch = get_batch_messages(channel_id, last_message_id)
        if not batch:
            break
            
        # Process batch and get bot messages
        for msg in batch:
            msg_time = datetime.fromisoformat(msg['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc)
            if (msg['author'].get('username') == 'FaytuksBot' and 
                msg['author'].get('discriminator') == '7032' and 
                msg_time >= cutoff_time):
                messages.append(msg)
        
        # Check if we should stop
        last_msg_time = datetime.fromisoformat(batch[-1]['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc)
        if last_msg_time < cutoff_time:
            break
            
        last_message_id = batch[-1]['id']
    
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
                {"text": "6 hours", "callback_data": f"report_{channel_id}_6"},
                {"text": "12 hours", "callback_data": f"report_{channel_id}_12"}
            ],
            [
                {"text": "24 hours", "callback_data": f"report_{channel_id}_24"},
                {"text": "48 hours", "callback_data": f"report_{channel_id}_48"}
            ],
            [
                {"text": "72 hours", "callback_data": f"report_{channel_id}_72"}
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
        timestamp = datetime.fromisoformat(msg['timestamp'].rstrip('Z')).strftime('%Y-%m-%d %H:%M UTC')
        content = msg.get('content', '')
        formatted_messages.append(f"[{timestamp}]\n{content}\n")
    
    return "\n---\n".join(formatted_messages)

def generate_summary(messages: List[dict]) -> str:
    """Generate a summary of the messages using Claude"""
    if not messages:
        return "No messages found in the specified timeframe."
        
    # Calculate time difference between oldest and newest messages
    timestamps = [datetime.fromisoformat(msg['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc) 
                 for msg in messages]
    oldest = min(timestamps)
    newest = max(timestamps)
    hours_diff = round((newest - oldest).total_seconds() / 3600, 1)
        
    formatted_text = format_messages_for_summary(messages)
    
    prompt = f"""You are a news analyst specializing in clear, structured summaries. Below are news updates from the last {hours_diff} hours. 
    Please provide a summary in the following strict format:

    Main Topic/Region Update - Current Date

    Overview:
    Write a focused 5-7 sentence overview covering the most significant developments. If there are multiple unrelated but important developments, mention them all briefly.

    Key Developments:

    Primary Event/Topic:
    - Detailed point with specific facts (numbers, names, locations)
    - Another specific point with clear impact or significance
    - Additional key detail with concrete information

    Secondary Developments:
    - Important but separate development with specific details
    - Another significant but unrelated event
    - Additional noteworthy development from different area/topic

    Tertiary Developments:
    - Additional development from different area/topic
    - Another significant but unrelated event
    - Additional noteworthy development from different area/topic

    Additional Details/Impact:
    - Clear, factual point with specific information
    - Another detailed development
    - Another detailed development
    - Another detailed development

    Guidelines:
    - Primary category should cover the main event/crisis
    - Secondary Developments category must include other significant events, even if unrelated
    - Each bullet point must contain specific facts (numbers, names, locations)
    - Include both major developments and significant tangential events
    - Maintain clear cause-and-effect relationships
    - Avoid vague language or speculation
    - Keep a neutral, analytical tone

    News Updates to Summarize:
    {formatted_text}

    Summary:"""
    
    system="""You are an expert news analyst that creates clear, structured summaries.
    Focus on specific facts and concrete details.
    Avoid vague language like 'multiple', 'various', or 'several'.
    Use precise numbers, names, and locations whenever possible.
    Include both primary events and significant secondary developments.
    Ensure no important information is omitted, even if it seems tangential.
    Maintain consistent formatting and professional tone."""

    try:
        response = claude_client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        return response.content[0].text
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return "Error generating summary. Please try again."

def send_long_message(text: str):
    """Split and send long messages"""
    # Maximum length for a single Telegram message
    MAX_LENGTH = 4096
    
    # Split text into chunks
    chunks = textwrap.wrap(text, MAX_LENGTH, replace_whitespace=False, break_long_words=True)
    
    # Send each chunk
    for i, chunk in enumerate(chunks, 1):
        if len(chunks) > 1:
            chunk = f"Part {i}/{len(chunks)}:\n\n{chunk}"
        send_telegram_message(chunk)

def handle_callback_query(callback_query):
    """Handle callback queries from inline keyboards"""
    data = callback_query.get('data', '')
    
    if data.startswith('channel_'):
        # User selected a channel, show timeframe options
        channel_id = data.split('_')[1]
        message = "Select timeframe for the report:"
        reply_markup = create_timeframe_keyboard(channel_id)
        send_telegram_message(message, reply_markup)
        
    elif data.startswith('report_'):
        # User selected a timeframe, generate report
        _, channel_id, hours = data.split('_')
        try:
            hours = int(hours)
            messages = get_channel_messages(channel_id, hours)
            channels = get_guild_channels(GUILD_ID)
            channel_name = next((c['name'] for c in channels if c['id'] == channel_id), 'unknown-channel')
            
            if messages:
                # Only generate and send the summary
                summary = generate_summary(messages)
                send_telegram_message(f"📊 Summary for #{channel_name} (last {hours} hours):\n\n{summary}")
            else:
                send_telegram_message(f"No messages found in #{channel_name} for the last {hours} hours.")
            
        except Exception as e:
            send_telegram_message(f"Error generating report: {str(e)}")

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
    
    print("Bot started and listening for messages...")
    
    while True:
        try:
            params = {'timeout': 100, 'offset': last_update_id}
            response = requests.get(url, params=params)
            updates = response.json().get('result', [])
            
            if updates:
                print(f"Found {len(updates)} new updates")
            
            for update in updates:
                last_update_id = update['update_id'] + 1
                
                # Handle callback queries (button clicks)
                if 'callback_query' in update:
                    handle_callback_query(update['callback_query'])
                    continue
                
                # Handle regular messages
                message = update.get('message', {}).get('text', '')
                if message and message.startswith('/'):
                    print(f"Processing command: {message}")
                    handle_telegram_command(message)
                    
            time.sleep(1)
        except Exception as e:
            print(f"Error handling incoming messages: {e}")

def main():
    print("Starting Discord Report Bot...")
    
    if not all([DISCORD_TOKEN, GUILD_ID, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID]):
        print("Error: Missing required environment variables!")
        print(f"DISCORD_TOKEN: {'✓' if DISCORD_TOKEN else '✗'}")
        print(f"GUILD_ID: {'✓' if GUILD_ID else '✗'}")
        print(f"TELEGRAM_BOT_TOKEN: {'✓' if TELEGRAM_BOT_TOKEN else '✗'}")
        print(f"TELEGRAM_CHAT_ID: {'✓' if TELEGRAM_CHAT_ID else '✗'}")
        return

    welcome_message = """
Bot is running!

Commands:
/channels - List channels
/report <channel_id> <hours> - Get report
/help - Show help

Type /help for more info."""

    print("Sending welcome message...")
    send_telegram_message(welcome_message)
    print("Starting message handler...")
    handle_incoming_messages()

if __name__ == "__main__":
    main()
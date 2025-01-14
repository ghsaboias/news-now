import logging
import json
import requests
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta

class DiscordClient:
    def __init__(self, token: str, guild_id: str, logger=None):
        self.token = token
        self.guild_id = guild_id
        self.logger = logger or logging.getLogger(__name__)
        self.headers = {'Authorization': token}
        self.base_url = 'https://discord.com/api/v10'
        
    def fetch_channels(self) -> Optional[List[Dict]]:
        """Fetch and filter Discord channels based on predefined criteria"""
        url = f'{self.base_url}/guilds/{self.guild_id}/channels'
        
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code != 200:
                self.logger.error(f"Error fetching channels: {response.status_code}")
                return None
                
            channels = response.json()
            
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
            
            self.logger.info(f"Successfully fetched {len(filtered_channels)} channels")
            return filtered_channels
            
        except Exception as e:
            self.logger.error(f"Error fetching channels: {str(e)}")
            return None
            
    def fetch_message_batch(self, channel_id: str, last_message_id: Optional[str] = None) -> Optional[List[Dict]]:
        """Fetch a single batch of messages from Discord channel"""
        url = f'{self.base_url}/channels/{channel_id}/messages?limit=100'
        if last_message_id:
            url += f'&before={last_message_id}'
            
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code != 200:
                self.logger.error(f"Error fetching messages: {response.status_code}")
                return None
                
            return response.json()
            
        except Exception as e:
            self.logger.error(f"Error fetching message batch: {str(e)}")
            return None
            
    def fetch_messages_in_timeframe(self, channel_id: str, hours: float = 24, minutes: float = None) -> List[Dict]:
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
        
        self.logger.info(f"Fetching messages from channel {channel_id} for past {time_str}")
        
        while True:
            batch = self.fetch_message_batch(channel_id, last_message_id)
            if not batch:
                self.logger.warning(f"No messages received from channel {channel_id}")
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
            
            self.logger.info(f"Processed batch of {len(batch)} messages, found {batch_bot_messages} bot messages")
            
            # Check if we should stop
            last_msg_time = datetime.fromisoformat(batch[-1]['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc)
            if last_msg_time < cutoff_time:
                break
                
            last_message_id = batch[-1]['id']
        
        self.logger.info(f"Total bot messages found: {len(messages)}")
        return messages  # Always return the list, even if empty
        
    def format_raw_message_report(self, channel_name: str, messages: List[Dict]) -> str:
        """Format raw messages into a basic report format"""
        report = f"📊 Report for #{channel_name}\n\n"
        
        for msg in messages:
            timestamp = datetime.fromisoformat(msg['timestamp'].rstrip('Z')).strftime('%Y-%m-%d %H:%M UTC')
            content = msg.get('content', '')
            report += f"🕒 `{timestamp}`\n{content}\n\n"
        
        if not messages:
            report += "No messages found in the specified timeframe\\."
        
        return report 
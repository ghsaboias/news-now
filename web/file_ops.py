import os
import json
from datetime import datetime, timezone
from typing import Optional, Dict, List
import shutil
import logging

logger = logging.getLogger(__name__)

class FileOps:
    def __init__(self, base_dir: str = "data"):
        self.base_dir = base_dir
        
    def _ensure_channel_dir(self, channel_name: str) -> str:
        """Create and return channel directory path with subdirectories"""
        channel_dir = os.path.join(self.base_dir, channel_name)
        messages_dir = os.path.join(channel_dir, "messages")
        summaries_dir = os.path.join(channel_dir, "summaries")
        
        try:
            os.makedirs(messages_dir, exist_ok=True)
            os.makedirs(summaries_dir, exist_ok=True)
            return channel_dir
        except Exception as e:
            logger.error(f"Error creating directories for {channel_name}: {e}")
            raise

    def append_formatted_messages(self, channel_name: str, messages: str, period_start: datetime, period_end: datetime) -> None:
        """Store unique messages chronologically"""
        channel_dir = self._ensure_channel_dir(channel_name)
        date_str = period_start.strftime('%Y-%m-%d')
        messages_file = os.path.join(channel_dir, "messages", f"{date_str}.txt")
        
        # Split incoming messages into individual entries
        new_messages = [msg.strip() for msg in messages.split("\n---\n") if msg.strip()]
        
        try:
            existing_messages = set()
            if os.path.exists(messages_file):
                with open(messages_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.strip():
                            # Extract just the message content for comparison
                            # Assuming format: [timestamp]\nURL\nTitle/Description/etc
                            message_parts = line.strip().split('\n', 2)
                            if len(message_parts) >= 1:
                                existing_messages.add(message_parts[0])  # Use timestamp as unique identifier
            
            # Filter out messages that already exist
            unique_messages = []
            for msg in new_messages:
                message_parts = msg.split('\n', 2)
                if len(message_parts) >= 1:
                    timestamp = message_parts[0]
                    if timestamp not in existing_messages:
                        unique_messages.append(msg)
                        existing_messages.add(timestamp)
            
            if not unique_messages:
                logger.info(f"No new messages to append")
                return
            
            # Append unique messages
            with open(messages_file, 'a', encoding='utf-8') as f:
                for msg in unique_messages:
                    f.write(f"{msg}\n---\n")
                logger.info(f"Appended {len(unique_messages)} new messages to {messages_file}")
                
        except Exception as e:
            logger.error(f"Error writing messages to {messages_file}: {e}")
            raise

    def save_summary(self, channel_name: str, summary_data: Dict) -> None:
        """Save summary organized by timeframe with deduplication"""
        channel_dir = self._ensure_channel_dir(channel_name)
        timeframe = summary_data['timeframe']
        summaries_file = os.path.join(channel_dir, "summaries", f"{timeframe}_summaries.json")
        
        try:
            # Load existing summaries for this timeframe
            if os.path.exists(summaries_file):
                with open(summaries_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                data = {"summaries": []}
            
            # Check for duplicate period
            period_exists = any(
                s['period_start'] == summary_data['period_start'] and 
                s['period_end'] == summary_data['period_end']
                for s in data['summaries']
            )
            
            if not period_exists:
                # Add new summary at the beginning
                data["summaries"].insert(0, summary_data)
                
                # Write back to file
                with open(summaries_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
            else:
                logger.info(f"Summary for period already exists in {summaries_file}, skipping")
                
        except Exception as e:
            logger.error(f"Error saving summary to {summaries_file}: {e}")
            raise

    def get_latest_summary(self, channel_name: str, current_timeframe: str) -> Optional[Dict]:
        """Get the most recent summary, prioritizing same timeframe"""
        channel_dir = self._ensure_channel_dir(channel_name)
        summaries_dir = os.path.join(channel_dir, "summaries")
        
        try:
            # First try to get summary from same timeframe
            same_timeframe_file = os.path.join(summaries_dir, f"{current_timeframe}_summaries.json")
            if os.path.exists(same_timeframe_file):
                with open(same_timeframe_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data["summaries"]:
                        return data["summaries"][0]
            
            # If not found, get most recent summary from any timeframe
            latest_summary = None
            latest_timestamp = None
            
            for filename in os.listdir(summaries_dir):
                if filename.endswith('_summaries.json'):
                    file_path = os.path.join(summaries_dir, filename)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if data["summaries"]:
                            summary = data["summaries"][0]
                            timestamp = datetime.fromisoformat(summary['period_end'])
                            if latest_timestamp is None or timestamp > latest_timestamp:
                                latest_timestamp = timestamp
                                latest_summary = summary
            
            return latest_summary
            
        except Exception as e:
            logger.error(f"Error reading summary for {channel_name}: {e}")
            return None

    def check_disk_space(self) -> bool:
        """Check if there's sufficient disk space available"""
        try:
            total, used, free = shutil.disk_usage(self.base_dir)
            free_gb = free / (2**30)  # Convert to GB
            if free_gb < 1:  # Alert if less than 1GB free
                logger.warning(f"Low disk space: {free_gb:.2f}GB remaining")
                return False
            return True
        except Exception as e:
            logger.error(f"Error checking disk space: {e}")
            return False
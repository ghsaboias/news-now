import os
import json
from datetime import datetime, timezone
from typing import Optional, Dict, List
import shutil
import logging
import sys

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATA_DIR, SUMMARY_RETENTION, LOG_FORMAT

# Configure logging
logging.basicConfig(format=LOG_FORMAT)
logger = logging.getLogger(__name__)

class FileOps:
    def __init__(self, base_dir: str = DATA_DIR):
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

    def _cleanup_old_summaries(self, summaries_file: str, timeframe: str) -> None:
        """Clean up old summaries based on retention policy"""
        try:
            if os.path.exists(summaries_file):
                with open(summaries_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Get retention limit for this timeframe
                retain_count = SUMMARY_RETENTION.get(timeframe, 30)  # Default to 30 if not specified
                
                if len(data['summaries']) > retain_count:
                    # Keep only the most recent summaries
                    data['summaries'] = data['summaries'][:retain_count]
                    
                    # Write back to file
                    with open(summaries_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    
                    logger.info(f"Cleaned up {summaries_file}, keeping {retain_count} most recent summaries")
        except Exception as e:
            logger.error(f"Error cleaning up old summaries in {summaries_file}: {e}")

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
                    
                # Clean up old summaries based on retention policy
                self._cleanup_old_summaries(summaries_file, timeframe)
            else:
                logger.info(f"Summary for period already exists in {summaries_file}, skipping")
                
        except Exception as e:
            logger.error(f"Error saving summary to {summaries_file}: {e}")
            raise

    def get_latest_summary(self, channel_name: str, timeframe: str) -> Optional[Dict]:
        """Get the latest summary for a channel and timeframe"""
        try:
            channel_dir = os.path.join(self.base_dir, channel_name)
            summaries_file = os.path.join(channel_dir, "summaries", f"{timeframe}_summaries.json")
            
            if os.path.exists(summaries_file):
                with open(summaries_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data['summaries']:
                        return data['summaries'][0]  # Return most recent summary
            return None
        except Exception as e:
            logger.error(f"Error reading latest summary for {channel_name}: {e}")
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
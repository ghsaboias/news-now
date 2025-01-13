import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class FileOps:
    def __init__(self, max_age_days: int = 7):
        self.max_age_days = max_age_days
        self.cleanup_counter = 0
        self.CLEANUP_FREQUENCY = 100  # Cleanup every 100 operations

    def save_summary(self, channel_name: str, summary_data: Dict) -> None:
        """Save a summary to storage with periodic cleanup"""
        try:
            # Increment cleanup counter
            self.cleanup_counter += 1
            
            # Run cleanup periodically
            if self.cleanup_counter >= self.CLEANUP_FREQUENCY:
                self.cleanup_old_files()
                self.cleanup_counter = 0
            
            # Create channel directory if it doesn't exist
            channel_dir = os.path.join(os.getenv('DATA_DIR', 'data'), channel_name)
            summaries_dir = os.path.join(channel_dir, 'summaries')
            os.makedirs(summaries_dir, exist_ok=True)
            
            # Save summary based on timeframe
            timeframe = summary_data.get('timeframe', '1h')
            filename = f"{timeframe}_summaries.json"
            filepath = os.path.join(summaries_dir, filename)
            
            # Load existing summaries or create new file
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r') as f:
                        data = json.load(f)
                except json.JSONDecodeError:
                    data = {"summaries": []}
            else:
                data = {"summaries": []}
            
            # Add new summary at the beginning
            data['summaries'].insert(0, {
                'content': summary_data['content'],
                'period_start': summary_data['period_start'],
                'period_end': summary_data['period_end']
            })
            
            # Keep only last 100 summaries
            data['summaries'] = data['summaries'][:100]
            
            # Save to file
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                
            logger.debug(f"Saved summary to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving summary: {str(e)}")
            raise

    def get_latest_summary(self, channel_name: str, timeframe: str) -> Optional[Dict]:
        """Get the latest summary for a channel and timeframe"""
        try:
            channel_dir = os.path.join(os.getenv('DATA_DIR', 'data'), channel_name)
            summaries_dir = os.path.join(channel_dir, 'summaries')
            filepath = os.path.join(summaries_dir, f"{timeframe}_summaries.json")
            
            if not os.path.exists(filepath):
                return None
                
            with open(filepath, 'r') as f:
                data = json.load(f)
                
            if not data['summaries']:
                return None
                
            return data['summaries'][0]
            
        except Exception as e:
            logger.error(f"Error getting latest summary: {str(e)}")
            return None

    def cleanup_old_files(self) -> None:
        """Clean up old summary files"""
        try:
            logger.info("Starting file cleanup...")
            data_dir = os.getenv('DATA_DIR', 'data')
            cutoff_date = datetime.now() - timedelta(days=self.max_age_days)
            files_removed = 0
            space_freed = 0
            
            for channel_name in os.listdir(data_dir):
                channel_dir = os.path.join(data_dir, channel_name)
                if not os.path.isdir(channel_dir):
                    continue
                    
                summaries_dir = os.path.join(channel_dir, 'summaries')
                if not os.path.exists(summaries_dir):
                    continue
                    
                for filename in os.listdir(summaries_dir):
                    filepath = os.path.join(summaries_dir, filename)
                    if not os.path.isfile(filepath):
                        continue
                        
                    # Check file modification time
                    mod_time = datetime.fromtimestamp(os.path.getmtime(filepath))
                    if mod_time < cutoff_date:
                        # Get file size before removing
                        file_size = os.path.getsize(filepath)
                        try:
                            os.remove(filepath)
                            files_removed += 1
                            space_freed += file_size
                            logger.debug(f"Removed old file: {filepath}")
                        except OSError as e:
                            logger.error(f"Error removing file {filepath}: {str(e)}")
                            
            logger.info(f"Cleanup complete. Removed {files_removed} files, freed {space_freed/1024/1024:.2f}MB")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            # Don't raise the error - cleanup failure shouldn't break normal operation
import logging
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import time

class ReportManager:
    def __init__(self, discord_client, telegram_bot, report_generator, file_ops, logger=None):
        self.discord_client = discord_client
        self.telegram_bot = telegram_bot
        self.report_generator = report_generator
        self.file_ops = file_ops
        self.logger = logger or logging.getLogger(__name__)
        
    def generate_report(self, channel_id: str, channel_name: str, hours: float) -> Optional[Dict]:
        """Generate a report for a channel within a timeframe"""
        self.logger.info(f"Generating report for channel {channel_id} for past {hours} hours")
        
        messages = self.discord_client.fetch_messages_in_timeframe(channel_id, hours)
        if not messages:
            self.logger.info(f"No messages found in {channel_name} for the last {hours} hours")
            return None
            
        self.logger.info(f"Found {len(messages)} messages for #{channel_name}")
        
        try:
            timeframe_str = f"{hours}h"
            previous_summary = self.file_ops.get_latest_summary(channel_name, timeframe_str)
            summary, period_start, period_end = self.report_generator.create_ai_summary(
                messages, channel_name, hours, previous_summary
            )
            
            if summary:
                self._save_summary_to_storage(channel_name, summary, period_start, period_end, timeframe_str)
                return {
                    'summary': summary,
                    'message_count': len(messages),
                    'period_start': period_start,
                    'period_end': period_end
                }
                
        except Exception as e:
            self.logger.error(f"Failed to generate report: {str(e)}", exc_info=True)
            
        return None
        
    def _save_summary_to_storage(self, channel_name: str, content: Dict, 
                               period_start: datetime, period_end: datetime, timeframe: str) -> None:
        """Save the generated summary to storage"""
        if period_start and period_end:
            summary_data = {
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "timeframe": timeframe,
                "channel": channel_name,
                "content": content
            }
            
            self.file_ops.save_summary(channel_name, summary_data)
            
    def format_summary_for_telegram(self, summary: Dict) -> str:
        """Format a summary for Telegram display"""
        return f"{summary['headline']}\n{summary['location']}\n\n{summary['body']}" 
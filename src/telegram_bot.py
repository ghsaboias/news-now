import logging
import json
import requests
from typing import Dict, Optional, Callable, List

class TelegramBot:
    def __init__(self, token: str, chat_id: str, logger=None):
        self.token = token
        self.chat_id = chat_id
        self.logger = logger or logging.getLogger(__name__)
        self.base_url = f'https://api.telegram.org/bot{token}'
        
    def send_message(self, message: str, parse_mode: str = None, reply_markup: Dict = None) -> bool:
        """Send a message to Telegram chat"""
        try:
            payload = {
                'chat_id': self.chat_id,
                'text': message
            }
            
            if reply_markup:
                payload['reply_markup'] = reply_markup
                
            self.logger.debug(f"Sending message to Telegram with payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                f'{self.base_url}/sendMessage',
                json=payload
            )
            
            if not response.ok:
                self.logger.error(f"Failed to send message. Status code: {response.status_code}")
                self.logger.error(f"Response: {json.dumps(response.json(), indent=2)}")
                return False
                
            return True
        except Exception as e:
            self.logger.error(f"Error sending message: {str(e)}")
            return False
            
    def setup_commands(self, commands: list) -> bool:
        """Set up the bot's command menu in Telegram"""
        try:
            response = requests.post(
                f'{self.base_url}/setMyCommands',
                json={"commands": commands}
            )
            if response.status_code == 200:
                self.logger.info("Successfully set up bot commands menu")
                return True
            else:
                self.logger.error(f"Failed to set up commands menu: {response.status_code}")
                return False
        except Exception as e:
            self.logger.error(f"Error setting up commands menu: {e}")
            return False
            
    def start_polling(self, callback: Callable, timeout: int = 100) -> None:
        """Start polling for updates"""
        last_update_id = None
        consecutive_errors = 0
        
        self.logger.info("Bot started and listening for messages...")
        
        while True:
            try:
                params = {'timeout': timeout}
                if last_update_id is not None:
                    params['offset'] = last_update_id
                    
                response = requests.get(
                    f'{self.base_url}/getUpdates',
                    params=params,
                    timeout=timeout + 20
                )
                response.raise_for_status()
                updates = response.json().get('result', [])
                
                if updates:
                    self.logger.info(f"Found {len(updates)} new updates")
                
                for update in updates:
                    try:
                        callback(update)
                        # Only update the offset after successfully processing the message
                        last_update_id = update['update_id'] + 1
                        
                    except Exception as e:
                        self.logger.error(f"Error processing update {update['update_id']}: {e}", exc_info=True)
                        # Still update offset to avoid getting stuck on a problematic message
                        last_update_id = update['update_id'] + 1
                
                # Reset error counter on successful iteration
                consecutive_errors = 0
                
            except requests.exceptions.RequestException as e:
                consecutive_errors += 1
                self.logger.error(f"Network error: {e}")
                
                # Exponential backoff with max delay of 5 minutes
                delay = min(300, 2 ** consecutive_errors)
                self.logger.info(f"Retrying in {delay} seconds...")
                import time
                time.sleep(delay)
                
    def create_timeframe_keyboard(self) -> Dict:
        """Create inline keyboard for timeframe selection"""
        return {
            "inline_keyboard": [
                [
                    {"text": "1 hour", "callback_data": "timeframe_1"},
                    {"text": "24 hours", "callback_data": "timeframe_24"}
                ]
            ]
        }

    def create_channel_selection_keyboard(self, channels: List[Dict]) -> Dict:
        """Create inline keyboard for channel selection"""
        keyboard = []
        row = []
        
        for channel in channels:
            button = {
                "text": f"#{self._clean_channel_name(channel['name'])}",
                "callback_data": f"channel_{channel['id']}"
            }
            row.append(button)
            
            if len(row) == 2:  # 2 buttons per row
                keyboard.append(row)
                row = []
        
        if row:  # Add any remaining buttons
            keyboard.append(row)
            
        return {"inline_keyboard": keyboard}
        
    def create_activity_timeframe_keyboard(self) -> Dict:
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
        
    @staticmethod
    def _clean_channel_name(name: str) -> str:
        """Clean channel name for Telegram display by removing problematic characters."""
        return name.replace('-', ' ') 
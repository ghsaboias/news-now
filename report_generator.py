import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple

class ReportGenerator:
    def __init__(self, claude_client, logger=None):
        self.claude_client = claude_client
        self.logger = logger or logging.getLogger(__name__)

    def format_messages_for_claude(self, messages: List[dict]) -> str:
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

    def parse_ai_summary(self, text: str) -> Dict:
        """Parse AI summary text into structured format"""
        lines = text.split('\n')
        headline = lines[0].strip()
        location = lines[1].strip()
        body = '\n'.join(lines[3:]).strip()
        
        return {
            "headline": headline,
            "location": location,
            "body": body
        }

    def create_ai_summary(self, messages: List[dict], channel_name: str, requested_hours: int, previous_summary: Optional[Dict] = None) -> Tuple[Optional[Dict], Optional[datetime], Optional[datetime]]:
        """Generate an AI summary of messages using Claude"""
        if not messages:
            return None, None, None

        # Calculate time period from timestamps
        timestamps = [datetime.fromisoformat(msg['timestamp'].rstrip('Z')).replace(tzinfo=timezone.utc) 
                     for msg in messages]
        
        period_start = min(timestamps)
        period_end = max(timestamps)

        formatted_text = self.format_messages_for_claude(messages)
        
        # Format previous summary context if available
        previous_summary_text = ""
        if previous_summary:
            previous_summary_text = f"""CONTEXT FROM PREVIOUS REPORT
            Time period: {datetime.fromisoformat(previous_summary['period_start']).strftime('%B %d, %Y %H:%M')} to {datetime.fromisoformat(previous_summary['period_end']).strftime('%B %d, %Y %H:%M')} UTC

            {previous_summary['content']}

            -------------------
            NEW UPDATES TO INCORPORATE
            """
        
        prompt = f"""Create a concise, journalistic report covering the key developments, incorporating context from the previous report when relevant.

        {previous_summary_text} Updates to analyze:
        {formatted_text}

        Requirements:
        - Start with ONE headline in ALL CAPS that captures the most significant development
        - Second line must be in format: City, Month Day, Year (use location of main development)
        - First paragraph must summarize the most important verified development
        - Subsequent paragraphs should cover other significant developments
        - Do NOT include additional headlines - weave all events into a cohesive narrative
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
            response = self.claude_client.messages.create(
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
                self.logger.error(error_msg)
                return None, None, None
                
            # Parse the summary into structured format
            structured_summary = self.parse_ai_summary(response.content[0].text)
            return structured_summary, period_start, period_end
                
        except Exception as e:
            error_msg = f"Unexpected error generating summary: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            return None, None, None 
import os
import json
import logging
from datetime import datetime, timezone
from functools import lru_cache
from flask import Flask, render_template, request
from typing import Optional, Dict, List
import re
import unicodedata

# Add parent directory to path to import config
from config import DATA_DIR, LOG_FORMAT

# Configure logging
logging.basicConfig(level=logging.DEBUG, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='static')

# Add datetime to Jinja globals
app.jinja_env.globals.update(datetime=datetime)

# Use centralized data directories
SUMMARIES_DIR = DATA_DIR
logger.debug(f"SUMMARIES_DIR set to: {SUMMARIES_DIR}")

# Cache timeouts
CACHE_TIMEOUT = 60  # 1 minute for most operations

@lru_cache(maxsize=100)
def format_channel_name(name: str) -> str:
    """Format channel name for display by removing emojis and special suffixes."""
    try:
        # Remove all emojis using regex
        clean_name = re.sub(r'[^\x00-\x7F]+', '', name)
        
        # Split by hyphens and filter out common suffixes
        parts = [part for part in clean_name.split('-') if part not in ['live', 'confirmed']]
        
        # Capitalize each word in each part
        formatted_parts = []
        for part in parts:
            # Split by spaces and capitalize each word
            words = [word.capitalize() for word in part.split()]
            formatted_parts.append(' '.join(words))
        
        return ' - '.join(formatted_parts).strip()
    except Exception as e:
        logger.error(f"Error formatting channel name '{name}': {str(e)}")
        return name  # Return original name if formatting fails

def get_priority(channel_name: str) -> str:
    """Determine priority based on channel prefix."""
    if '🔴' in channel_name:
        return 'high'
    return 'medium'

@lru_cache(maxsize=100)
def get_latest_summary(channel_dir: str, include_user_reports: bool = True) -> dict:
    """Cache summaries for 1 minute. Returns the most recent summary from any timeframe."""
    try:
        logger.debug(f"Getting latest summary from: {channel_dir}")
        summaries = []
        
        # Get regular summaries
        regular_summaries = _get_summaries_from_dir(os.path.join(channel_dir, 'summaries'))
        if regular_summaries:
            summaries.extend(regular_summaries)
        
        if not summaries:
            return None
            
        # Find the most recent summary
        latest_summary = max(summaries, key=lambda x: datetime.fromisoformat(x['period_end']))
        
        logger.debug(f"Latest summary: {latest_summary}")
        return latest_summary
            
    except Exception as e:
        logger.error(f"Error reading summary for {channel_dir}: {str(e)}")
        return None

def _get_summaries_from_dir(summaries_dir: str) -> List[Dict]:
    """Helper function to get summaries from a directory"""
    summaries = []
    if not os.path.exists(summaries_dir):
        return summaries
        
    for filename in os.listdir(summaries_dir):
        if not filename.endswith('_summaries.json'):
            continue
            
        filepath = os.path.join(summaries_dir, filename)
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                if 'summaries' in data and isinstance(data['summaries'], list):
                    summaries.extend(data['summaries'])
        except Exception as e:
            logger.error(f"Error reading {filepath}: {str(e)}")
            continue
    
    return summaries

def get_channel_slug(name: str) -> str:
    """Convert any channel name to a URL-friendly slug.
    Handles emojis, special characters, and unicode in a generic way."""
    try:
        # Normalize unicode characters
        normalized = unicodedata.normalize('NFKD', name)
        
        # Remove non-ASCII characters (including emojis)
        ascii_text = normalized.encode('ASCII', 'ignore').decode('ASCII')
        
        # Convert to lowercase and trim
        lowercase = ascii_text.lower().strip()
        
        # Replace any non-alphanumeric characters with hyphens
        slug = re.sub(r'[^a-z0-9]+', '-', lowercase)
        
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        
        # Replace multiple hyphens with single hyphen
        slug = re.sub(r'-+', '-', slug)
        
        return slug or 'untitled'  # Fallback if slug is empty
    except Exception as e:
        logger.error(f"Error creating slug for channel '{name}': {str(e)}")
        return 'untitled'  # Safe fallback

def clean_channel_name(name: str) -> str:
    """Clean channel name for Telegram display by removing problematic characters."""
    return name.replace('-', ' ')

def extract_channel_tags(channel_name: str) -> List[str]:
    """Extract meaningful tags from a channel name by removing emojis, splitting on hyphens,
    and filtering out common suffixes. Uses smart text processing to generate clean, unique tags."""
    
    # Remove any leading emojis and special characters
    clean_name = re.sub(r'^[^\x00-\x7F]+', '', channel_name)
    
    # Common words that shouldn't be standalone tags
    noise_words = {'live', 'confirmed', 'updates', 'news', 'breaking', 'latest', 'feed'}
    
    # Split by hyphens and clean each part
    parts = [part.strip() for part in clean_name.split('-') if part.strip()]
    
    # Process multi-word combinations first
    tags = set()  # Using set for automatic deduplication
    for i, part in enumerate(parts):
        words = [w for w in part.split() if w.lower() not in noise_words]
        if not words:
            continue
            
        # If it's all uppercase and 2-5 letters, preserve the case (e.g., US, UN, NATO)
        if len(words) == 1 and words[0].isupper() and 2 <= len(words[0]) <= 5:
            tags.add(words[0])
            continue
            
        # For longer sequences, properly capitalize each word
        tag = ' '.join(word.capitalize() for word in words)
        if tag:
            tags.add(tag)
    
    return sorted(list(tags))

@app.route('/')
def index():
    try:
        logger.debug("Starting index route")
        
        # Get filter parameters
        selected_topics = request.args.getlist('topics')
        timeframe = request.args.get('timeframe')
        
        news_items = []
        all_topics = set()  # To collect all available topics
        
        if not os.path.exists(SUMMARIES_DIR):
            logger.error(f"SUMMARIES_DIR does not exist: {SUMMARIES_DIR}")
            return render_template('index.html', news_items=[], error="Configuration error - summary directory not found")
            
        for channel_name in os.listdir(SUMMARIES_DIR):
            channel_dir = os.path.join(SUMMARIES_DIR, channel_name)
            logger.debug(f"Processing channel: {channel_name}")
            
            if os.path.isdir(channel_dir):
                latest = get_latest_summary(channel_dir)
                if latest and latest['content']:
                    # Skip if timeframe filter is active and doesn't match
                    if timeframe and latest['timeframe'] != timeframe:
                        continue
                        
                    summary_content = latest['content']
                    channel_slug = get_channel_slug(channel_name)
                    tags = extract_channel_tags(channel_name)
                    
                    # Add tags to all_topics set
                    all_topics.update(tags)
                    
                    # Skip if topic filter is active and no matching tags
                    if selected_topics and not any(tag in selected_topics for tag in tags):
                        continue
                    
                    news_item = {
                        'channel': channel_name,
                        'channel_slug': channel_slug,
                        'display_name': format_channel_name(channel_name),
                        'headline': summary_content['headline'],
                        'location': summary_content.get('location', 'Location Unknown'),
                        'body': summary_content['body'],
                        'timestamp': datetime.fromisoformat(latest['period_end']),
                        'priority': get_priority(channel_name),
                        'timeframe': latest['timeframe'],
                        'tags': tags
                    }
                    logger.debug(f"Created news item: {str(news_item)[:100]}...")
                    news_items.append(news_item)
        
        if not news_items:
            logger.warning("No news items found")
            return render_template('index.html', 
                                news_items=[],
                                all_topics=sorted(all_topics),
                                selected_topics=selected_topics,
                                timeframe=timeframe)
            
        news_items.sort(key=lambda x: x['timestamp'], reverse=True)
        logger.debug(f"Returning {len(news_items)} news items")
        return render_template('index.html', 
                             news_items=news_items,
                             all_topics=sorted(all_topics),
                             selected_topics=selected_topics,
                             timeframe=timeframe)
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}")
        return render_template('index.html', 
                             news_items=[], 
                             error=str(e),
                             all_topics=[],
                             selected_topics=[],
                             timeframe=None)

@app.route('/channel/<channel_slug>')
def channel(channel_slug):
    try:
        # Find the actual channel name from the slug
        for channel_name in os.listdir(SUMMARIES_DIR):
            if get_channel_slug(channel_name) == channel_slug:
                break
        else:
            return "Channel not found", 404
        
        # Get all summaries for the channel
        summaries = []
        now = datetime.now(timezone.utc)  # Make now timezone-aware with UTC
        
        # Get regular summaries
        channel_dir = os.path.join(SUMMARIES_DIR, channel_name)
        regular_summaries = _get_summaries_from_dir(os.path.join(channel_dir, 'summaries'))
        if regular_summaries:
            summaries.extend(regular_summaries)
        
        # Process summaries
        processed_summaries = []
        for summary in summaries:
            # Ensure period_end is timezone-aware
            period_end = datetime.fromisoformat(summary['period_end'])
            if period_end.tzinfo is None:
                period_end = period_end.replace(tzinfo=timezone.utc)
            
            minutes_ago = int((now - period_end).total_seconds() / 60)
            
            processed_summaries.append({
                'timeframe': summary.get('timeframe', '1h'),
                'content': summary['content'],
                'period_start': datetime.fromisoformat(summary['period_start']).strftime('%B %d, %Y %H:%M UTC'),
                'period_end': period_end.strftime('%B %d, %Y %H:%M UTC'),
                'minutes_ago': minutes_ago,
                'is_live': minutes_ago < 30,  # Less than 30 minutes old
                'is_user_report': summary.get('is_user_report', False)
            })
        
        # Sort by timestamp
        processed_summaries.sort(key=lambda x: x['minutes_ago'])
        
        return render_template('channel.html', 
                             channel_name=channel_name,
                             channel_slug=channel_slug,
                             display_name=format_channel_name(channel_name),
                             summaries=processed_summaries,
                             datetime=datetime)
    except Exception as e:
        logger.error(f"Error in channel route: {str(e)}")
        return f"An error occurred: {str(e)}", 500

@app.route('/generate-report/<channel_slug>')
def generate_report(channel_slug):
    """Show the report generation form"""
    try:
        # Find the actual channel name from the slug
        for channel_name in os.listdir(SUMMARIES_DIR):
            if get_channel_slug(channel_name) == channel_slug:
                break
        else:
            return "Channel not found", 404
            
        return render_template('generate_report.html',
                             channel_name=channel_name,
                             channel_slug=channel_slug,
                             display_name=format_channel_name(channel_name))
    except Exception as e:
        logger.error(f"Error in generate_report route: {str(e)}")
        return f"An error occurred: {str(e)}", 500

@app.route('/filtered-news')
def filtered_news():
    try:
        selected_topics = request.args.getlist('topics')
        timeframe = request.args.get('timeframe')
        
        news_items = []
        all_topics = set()
        
        for channel_name in os.listdir(SUMMARIES_DIR):
            channel_dir = os.path.join(SUMMARIES_DIR, channel_name)
            
            if os.path.isdir(channel_dir):
                latest = get_latest_summary(channel_dir)
                if latest and latest['content']:
                    if timeframe and latest['timeframe'] != timeframe:
                        continue
                        
                    summary_content = latest['content']
                    channel_slug = get_channel_slug(channel_name)
                    tags = extract_channel_tags(channel_name)
                    
                    all_topics.update(tags)
                    
                    if selected_topics and not any(tag in selected_topics for tag in tags):
                        continue
                    
                    news_item = {
                        'channel': channel_name,
                        'channel_slug': channel_slug,
                        'display_name': format_channel_name(channel_name),
                        'headline': summary_content['headline'],
                        'location': summary_content.get('location', 'Location Unknown'),
                        'body': summary_content['body'],
                        'timestamp': datetime.fromisoformat(latest['period_end']),
                        'priority': get_priority(channel_name),
                        'timeframe': latest['timeframe'],
                        'tags': tags
                    }
                    news_items.append(news_item)
        
        news_items.sort(key=lambda x: x['timestamp'], reverse=True)
        return render_template('news_items.html', news_items=news_items)
        
    except Exception as e:
        logger.error(f"Error in filtered_news route: {str(e)}")
        return "Error loading news items", 500

if __name__ == '__main__':
    app.run(debug=True) 
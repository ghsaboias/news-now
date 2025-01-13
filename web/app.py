import os
import json
import sys
import logging
from datetime import datetime, timedelta
from functools import lru_cache
from flask import Flask, render_template, jsonify
from typing import Optional, Dict, List
import re
import unicodedata

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATA_DIR, LOG_FORMAT

# Configure logging
logging.basicConfig(level=logging.DEBUG, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='static')

# Add datetime to Jinja globals
app.jinja_env.globals.update(datetime=datetime)

# Use centralized data directory
SUMMARIES_DIR = DATA_DIR
logger.debug(f"SUMMARIES_DIR set to: {SUMMARIES_DIR}")

# Cache timeouts
CACHE_TIMEOUT = 60  # 1 minute for most operations

@lru_cache(maxsize=100)
def format_channel_name(name: str) -> str:
    """Format channel name for display by removing emojis and special suffixes."""
    try:
        # Remove emojis and split
        clean_name = name.replace('🟡', '').replace('🔴', '').replace('🟠', '').replace('⚫', '').replace('🔥', '')
        
        # Split by hyphens and filter out common suffixes
        parts = [part for part in clean_name.split('-') if part not in ['live', 'confirmed']]
        
        # Capitalize each word in each part
        formatted_parts = []
        for part in parts:
            # Split by spaces and capitalize each word
            words = [word.capitalize() for word in part.split()]
            formatted_parts.append(' '.join(words))
        
        return ' - '.join(formatted_parts)
    except Exception as e:
        logger.error(f"Error formatting channel name '{name}': {str(e)}")
        return name  # Return original name if formatting fails

def get_priority(channel_name: str) -> str:
    """Determine priority based on channel prefix."""
    if '🔴' in channel_name:
        return 'high'
    return 'medium'

@lru_cache(maxsize=100)
def get_latest_summary(channel_dir: str) -> dict:
    """Cache summaries for 1 minute"""
    try:
        logger.debug(f"Getting latest summary from: {channel_dir}")
        summaries_dir = os.path.join(channel_dir, 'summaries')
        
        if not os.path.exists(summaries_dir):
            logger.debug(f"Summaries directory not found: {summaries_dir}")
            return None
            
        summary_file = os.path.join(summaries_dir, '1h_summaries.json')
        if not os.path.exists(summary_file):
            logger.debug(f"Summary file not found: {summary_file}")
            return None
        
        # Get file modification time
        mod_time = os.path.getmtime(summary_file)
        if datetime.fromtimestamp(mod_time) < datetime.now() - timedelta(minutes=1):
            # Clear cache if file is older than 1 minute
            get_latest_summary.cache_clear()
        
        with open(summary_file) as f:
            data = json.load(f)
            
        if not data.get('summaries'):
            logger.debug("No summaries found in file")
            return None
            
        # Get the most recent summary
        latest_summary = data['summaries'][0]
        
        result = {
            'summary': latest_summary['content'],
            'timestamp': datetime.fromisoformat(latest_summary['period_end']).strftime('%B %d, %Y %H:%M UTC')
        }
        logger.debug(f"Parsed summary: {str(result)[:100]}...")
        return result
            
    except Exception as e:
        logger.error(f"Error reading summary for {channel_dir}: {str(e)}")
        return None

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

@app.route('/')
def index():
    try:
        logger.debug("Starting index route")
        news_items = []
        
        if not os.path.exists(SUMMARIES_DIR):
            logger.error(f"SUMMARIES_DIR does not exist: {SUMMARIES_DIR}")
            return render_template('index.html', news_items=[], error="Configuration error - summary directory not found")
            
        for channel_name in os.listdir(SUMMARIES_DIR):
            channel_dir = os.path.join(SUMMARIES_DIR, channel_name)
            logger.debug(f"Processing channel: {channel_name}")
            
            if os.path.isdir(channel_dir):
                latest_summary = get_latest_summary(channel_dir)
                if latest_summary:
                    channel_slug = get_channel_slug(channel_name)
                    news_item = {
                        'channel': channel_name,
                        'channel_slug': channel_slug,
                        'display_name': format_channel_name(channel_name),
                        'summary': latest_summary['summary'],
                        'timestamp': latest_summary['timestamp'],
                        'priority': get_priority(channel_name)
                    }
                    logger.debug(f"Created news item: {str(news_item)[:100]}...")
                    news_items.append(news_item)
        
        if not news_items:
            logger.warning("No news items found")
            return render_template('index.html', news_items=[])
            
        news_items.sort(key=lambda x: x['timestamp'], reverse=True)
        logger.debug(f"Returning {len(news_items)} news items")
        return render_template('index.html', news_items=news_items)
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}")
        return render_template('index.html', news_items=[], error=str(e))

def get_summary_for_timeframe(channel_name: str, timeframe: str) -> dict:
    """Get summary for a specific timeframe from channel directory."""
    try:
        channel_dir = os.path.join(SUMMARIES_DIR, channel_name)
        if not os.path.isdir(channel_dir):
            return None
            
        # Get all summary files for the channel
        summary_files = [f for f in os.listdir(channel_dir) if f.endswith('.json')]
        if not summary_files:
            return None
            
        # Get latest file
        latest_file = sorted(summary_files)[-1]
        with open(os.path.join(channel_dir, latest_file)) as f:
            summary = json.load(f)
            
        # Use file timestamp as period end
        period_end = datetime.strptime(latest_file[:-5], '%Y%m%d%H%M%S')
        
        # Calculate period start based on timeframe
        if timeframe == '24h':
            period_start = period_end - timedelta(days=1)
        elif timeframe == '1h':
            period_start = period_end - timedelta(hours=1)
        else:  # 10m
            period_start = period_end - timedelta(minutes=10)
            
        return {
            'content': summary['content'],
            'period_start': period_start.isoformat(),
            'period_end': period_end.isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting summary for timeframe {timeframe}: {str(e)}")
        return None

@app.route('/channel/<channel_slug>')
def channel(channel_slug):
    try:
        # Find the actual channel name from the slug
        for channel_name in os.listdir(SUMMARIES_DIR):
            if get_channel_slug(channel_name) == channel_slug:
                break
        else:
            return "Channel not found", 404
        
        # Get all summaries for a specific channel
        summaries = []
        timeframes = ["24h", "1h", "10m"]
        now = datetime.now()
        
        for timeframe in timeframes:
            summary = get_summary_for_timeframe(channel_name, timeframe)
            if summary:
                period_start = datetime.fromisoformat(summary['period_start'])
                period_end = datetime.fromisoformat(summary['period_end'])
                
                # Calculate minutes ago
                minutes_ago = int((now - period_end).total_seconds() / 60)
                
                summaries.append({
                    'timeframe': timeframe,
                    'content': summary['content'],
                    'period_start': period_start.strftime('%B %d, %Y %H:%M UTC'),
                    'period_end': period_end.strftime('%B %d, %Y %H:%M UTC'),
                    'minutes_ago': minutes_ago,
                    'is_live': minutes_ago < 30  # Less than 30 minutes old
                })
        
        return render_template('channel.html', 
                             channel_name=channel_name,
                             channel_slug=channel_slug,
                             display_name=format_channel_name(channel_name),
                             summaries=summaries,
                             datetime=datetime)
    except Exception as e:
        logger.error(f"Error in channel route: {str(e)}")
        return f"An error occurred: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True) 
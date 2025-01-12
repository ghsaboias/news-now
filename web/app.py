import os
import json
import logging
from datetime import datetime, timedelta
from flask import Flask, render_template, send_from_directory
import sys

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATA_DIR, LOG_FORMAT

# Configure logging
logging.basicConfig(level=logging.DEBUG, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')

# Use centralized data directory
SUMMARIES_DIR = DATA_DIR
logger.debug(f"SUMMARIES_DIR set to: {SUMMARIES_DIR}")

# Location database
LOCATIONS = {
    'israel': (31.0461, 34.8516),
    'gaza': (31.5017, 34.4668),
    'iran': (32.4279, 53.6880),
    'ukraine': (48.3794, 31.1656),
    'russia': (61.5240, 105.3188),
    'california': (36.7783, -119.4179),
    'syria': (34.8021, 38.9968),
    'lebanon': (33.8547, 35.8623),
    'turkey': (38.9637, 35.2433),
    'egypt': (26.8206, 30.8025),
    'sudan': (12.8628, 30.2176),
    'ethiopia': (9.1450, 40.4897),
    'somalia': (5.1521, 46.1996),
    'yemen': (15.5527, 48.5164),
    'iraq': (33.2232, 43.6793),
    'afghanistan': (33.9391, 67.7100),
    'pakistan': (30.3753, 69.3451),
    'india': (20.5937, 78.9629),
    'china': (35.8617, 104.1954),
    'north korea': (40.3399, 127.5101),
    'south korea': (35.9078, 127.7669),
    'japan': (36.2048, 138.2529),
    'taiwan': (23.5937, 121.0254),
    'philippines': (12.8797, 121.7740),
    'indonesia': (-0.7893, 113.9213),
    'australia': (-25.2744, 133.7751),
    'new zealand': (-40.9006, 174.8860),
    'brazil': (-14.2350, -51.9253),
    'argentina': (-38.4161, -63.6167),
    'chile': (-35.6751, -71.5430),
    'peru': (-9.1900, -75.0152),
    'colombia': (4.5709, -74.2973),
    'venezuela': (6.4238, -66.5897),
    'mexico': (23.6345, -102.5528),
    'canada': (56.1304, -106.3468),
    'united states': (37.0902, -95.7129),
    'france': (46.2276, 2.2137),
    'germany': (51.1657, 10.4515),
    'italy': (41.8719, 12.5674),
    'spain': (40.4637, -3.7492),
    'portugal': (39.3999, -8.2245),
    'united kingdom': (55.3781, -3.4360),
    'ireland': (53.1424, -7.6921),
    'netherlands': (52.1326, 5.2913),
    'belgium': (50.5039, 4.4699),
    'switzerland': (46.8182, 8.2275),
    'austria': (47.5162, 14.5501),
    'poland': (51.9194, 19.1451),
    'czech republic': (49.8175, 15.4730),
    'slovakia': (48.6690, 19.6990),
    'hungary': (47.1625, 19.5033),
    'romania': (45.9432, 24.9668),
    'bulgaria': (42.7339, 25.4858),
    'greece': (39.0742, 21.8243),
    'cyprus': (35.1264, 33.4299),
    'malta': (35.9375, 14.3754),
}

def extract_location(text: str, channel_name: str) -> tuple:
    """Extract location from text or fallback to channel name."""
    try:
        text = text.lower()
        logger.debug(f"Extracting location from text: {text[:100]}...")
        
        # First try headline
        for loc, coords in LOCATIONS.items():
            if loc in text:
                logger.debug(f"Found location {loc} in text with coords {coords}")
                return coords
        
        # Fallback to channel name
        channel_clean = channel_name.lower().replace('🟡', '').replace('🔴', '').replace('🟠', '').replace('⚫', '')
        logger.debug(f"Trying channel name: {channel_clean}")
        for loc, coords in LOCATIONS.items():
            if loc in channel_clean:
                logger.debug(f"Found location {loc} in channel name with coords {coords}")
                return coords
        
        logger.debug("No location found, returning None, None")
        return None, None
    except Exception as e:
        logger.error(f"Error in extract_location: {str(e)}")
        return None, None

def get_priority(channel_name: str) -> str:
    """Determine priority based on channel prefix."""
    if '🔴' in channel_name:
        return 'high'
    return 'medium'

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

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

@app.route('/')
def index():
    try:
        logger.debug("Starting index route")
        news_items = []
        
        if not os.path.exists(SUMMARIES_DIR):
            logger.error(f"SUMMARIES_DIR does not exist: {SUMMARIES_DIR}")
            return "Configuration error - summary directory not found", 500
            
        for channel_name in os.listdir(SUMMARIES_DIR):
            channel_dir = os.path.join(SUMMARIES_DIR, channel_name)
            logger.debug(f"Processing channel: {channel_name}")
            
            if os.path.isdir(channel_dir):
                latest_summary = get_latest_summary(channel_dir)
                if latest_summary:
                    lat, lng = extract_location(latest_summary['summary'], channel_name)
                    news_item = {
                        'channel': channel_name,
                        'display_name': format_channel_name(channel_name),
                        'summary': latest_summary['summary'],
                        'timestamp': latest_summary['timestamp'],
                        'lat': lat,
                        'lng': lng,
                        'priority': get_priority(channel_name)
                    }
                    logger.debug(f"Created news item: {str(news_item)[:100]}...")
                    news_items.append(news_item)
        
        if not news_items:
            logger.warning("No news items found")
            return render_template('index.html', news_items=[], datetime=datetime)
            
        news_items.sort(key=lambda x: x['timestamp'], reverse=True)
        logger.debug(f"Returning {len(news_items)} news items")
        return render_template('index.html', news_items=news_items, datetime=datetime)
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}")
        return f"An error occurred: {str(e)}", 500

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

@app.route('/channel/<channel_name>')
def channel(channel_name):
    try:
        # Get all summaries for a specific channel
        summaries = []
        timeframes = ["24h", "1h", "10m"]
        
        for timeframe in timeframes:
            summary = get_summary_for_timeframe(channel_name, timeframe)
            if summary:
                period_start = datetime.fromisoformat(summary['period_start'])
                period_end = datetime.fromisoformat(summary['period_end'])
                
                summaries.append({
                    'timeframe': timeframe,
                    'content': summary['content'],
                    'period_start': period_start.strftime('%B %d, %Y %H:%M UTC'),
                    'period_end': period_end.strftime('%B %d, %Y %H:%M UTC')
                })
        
        return render_template('channel.html', 
                             channel_name=channel_name,
                             display_name=format_channel_name(channel_name),
                             summaries=summaries)
    except Exception as e:
        logger.error(f"Error in channel route: {str(e)}")
        return f"An error occurred: {str(e)}", 500

def get_latest_summary(channel_dir):
    """Get the latest summary file from a channel directory."""
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

if __name__ == '__main__':
    app.run(debug=True) 
import os
import json
from datetime import datetime
from flask import Flask, render_template
from web.file_ops import FileOps

app = Flask(__name__)
file_ops = FileOps()

def format_channel_name(name: str) -> str:
    """Format channel name for display by removing emojis and special suffixes."""
    # Remove emojis and split
    # Synced with allowed_emojis in main.py: {'🟡', '🔴', '🟠', '⚫'}
    clean_name = name.replace('🟡', '').replace('🔴', '').replace('🟠', '').replace('⚫', '').replace('🔥', '')
    parts = clean_name.split('-')
    
    # Filter and capitalize parts, removing duplicates while maintaining order
    seen = set()
    formatted_parts = []
    for part in parts:
        if part not in ['live', 'confirmed'] and part not in seen:
            formatted_parts.append(part.title())
            seen.add(part)
    
    return ' '.join(formatted_parts)

@app.route('/')
def index():
    # Get summaries from the last 24 hours
    channels = []
    for channel_dir in os.listdir('data'):
        if channel_dir.startswith('.'):
            continue
        
        channel_name = channel_dir
        latest_summary = file_ops.get_latest_summary(channel_name, "24h")
        
        if latest_summary:
            period_start = datetime.fromisoformat(latest_summary['period_start'])
            period_end = datetime.fromisoformat(latest_summary['period_end'])
            
            channels.append({
                'name': channel_name,
                'display_name': format_channel_name(channel_name),
                'summary': latest_summary['content'],
                'period_start': period_start.strftime('%B %d, %Y %H:%M UTC'),
                'period_end': period_end.strftime('%B %d, %Y %H:%M UTC')
            })
    
    # Sort channels by name
    channels.sort(key=lambda x: x['display_name'])
    
    return render_template('index.html', channels=channels, datetime=datetime)

@app.route('/channel/<channel_name>')
def channel(channel_name):
    # Get all summaries for a specific channel
    summaries = []
    timeframes = ["24h", "1h", "10m"]
    
    for timeframe in timeframes:
        summary = file_ops.get_latest_summary(channel_name, timeframe)
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
                         summaries=summaries, 
                         datetime=datetime)

if __name__ == '__main__':
    app.run(debug=True) 
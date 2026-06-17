import os
import re
import html
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Cache configuration
CACHE_DURATION_SEC = 3600  # 1 hour
feed_cache = {
    'data': None,
    'last_updated': 0
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_for_tweet(html_content, update_type, date_str, link_url):
    """
    Cleans HTML content to extract plain text and formats it into a tweet.
    Ensures it fits within Twitter's 280-character limit.
    """
    # Replace links with just their text: <a href="...">text</a> -> text
    text = re.sub(r'<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'\2', html_content)
    # Remove code tags and style nicely: <code>code</code> -> code
    text = re.sub(r'<code[^>]*>(.*?)</code>', r'\1', text)
    # Remove all other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities (e.g. &amp;, &lt;, &gt;)
    text = html.unescape(text)
    # Normalize whitespaces and newlines
    text = ' '.join(text.split())
    
    # Structure: "BigQuery [Type] ([Date]): [Text] [Link]"
    prefix = f"BigQuery {update_type} ({date_str}): "
    suffix = f" {link_url}"
    
    # Calculate available characters for text
    max_text_len = 280 - len(prefix) - len(suffix) - 3  # -3 for "..."
    
    if max_text_len > 0 and len(text) > max_text_len:
        # Try to break at a space
        truncated = text[:max_text_len].rsplit(' ', 1)[0]
        # In case the first word is longer than max_text_len
        if len(truncated) == 0:
            truncated = text[:max_text_len]
        text = truncated + "..."
        
    tweet = f"{prefix}{text}{suffix}"
    return tweet

def fetch_and_parse_feed():
    """
    Fetches the BigQuery release notes XML feed and parses it into a structured format.
    Splits individual days into distinct, selectable updates.
    """
    req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    for entry_elem in root.findall('atom:entry', ns):
        title_elem = entry_elem.find('atom:title', ns)
        date_str = title_elem.text.strip() if title_elem is not None else ""
        
        updated_elem = entry_elem.find('atom:updated', ns)
        updated_str = updated_elem.text.strip() if updated_elem is not None else ""
        
        link_elem = entry_elem.find('atom:link[@rel="alternate"]', ns)
        if link_elem is None:
            link_elem = entry_elem.find('atom:link', ns)
        link_url = link_elem.attrib.get('href', '').strip() if link_elem is not None else ""
        
        content_elem = entry_elem.find('atom:content', ns)
        content_html = content_elem.text.strip() if content_elem is not None else ""
        
        # Parse the HTML content to extract separate release notes items
        # Typically structured as:
        # <h3>Type (e.g. Feature, Issue, Announcement, Deprecation)</h3>
        # <p>Content description...</p>
        updates = []
        
        # Match <h3>Type</h3> followed by all HTML until next <h3> or end of string
        pattern = re.compile(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', re.DOTALL | re.IGNORECASE)
        matches = pattern.findall(content_html)
        
        if matches:
            for idx, (update_type, update_content) in enumerate(matches):
                u_type = update_type.strip()
                u_content = update_content.strip()
                
                # Strip leading/trailing <p> tags or general empty blocks inside update content
                u_content_clean = re.sub(r'^\s*<p>\s*|\s*</p>\s*$', '', u_content, flags=re.IGNORECASE)
                
                # Check for standard types or default
                display_type = u_type.capitalize()
                
                # Generate unique ID for frontend selection
                update_id = f"{date_str.replace(' ', '_').replace(',', '')}_{idx}"
                
                # Generate tweet draft
                tweet_draft = clean_html_for_tweet(u_content_clean, display_type, date_str, link_url)
                
                updates.append({
                    'id': update_id,
                    'type': display_type,
                    'content': u_content,
                    'tweet_draft': tweet_draft
                })
        else:
            # Fallback if no <h3> tags found
            tweet_draft = clean_html_for_tweet(content_html, "Update", date_str, link_url)
            updates.append({
                'id': f"{date_str.replace(' ', '_').replace(',', '')}_0",
                'type': 'Update',
                'content': content_html,
                'tweet_draft': tweet_draft
            })
            
        entries.append({
            'date': date_str,
            'updated_str': updated_str,
            'link': link_url,
            'updates': updates
        })
        
    return entries

def get_release_notes(force_refresh=False):
    now = time.time()
    if not force_refresh and feed_cache['data'] and (now - feed_cache['last_updated'] < CACHE_DURATION_SEC):
        return feed_cache['data'], False
        
    try:
        data = fetch_and_parse_feed()
        feed_cache['data'] = data
        feed_cache['last_updated'] = now
        return data, True
    except Exception as e:
        # Fallback to cache if request fails
        if feed_cache['data']:
            return feed_cache['data'], False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, was_fetched = get_release_notes(force_refresh)
        return jsonify({
            'success': True,
            'data': data,
            'source': 'network' if was_fetched else 'cache',
            'last_updated': feed_cache['last_updated']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Default Flask port is 5000
    app.run(debug=True, port=5000)

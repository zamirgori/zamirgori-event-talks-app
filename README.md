# BigQuery Release Notes Explorer

A beautiful, responsive web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that aggregates, filters, and shares BigQuery release notes.

## Features

- **Automated Feed Aggregation**: Dynamically fetches the BigQuery XML Release Notes feed, parses Atom entries, and caches results to optimize loading times.
- **Granular Update Parsing**: Splits bulk daily feed updates into individual, discrete cards (e.g., Features, Announcements, Issues, Deprecations) for precise reading and sharing.
- **Rich Dark Theme & Timeline**: Uses modern design styling, a glowing vertical timeline, responsive grids, type-specific badges, and subtle micro-animations.
- **Real-Time Client-Side Filtering**:
  - Filter updates by type (Features, Announcements, Issues, Deprecations) via tab selectors.
  - Search by keyword with dynamic search term highlighting.
- **X (Twitter) Share Workflow**:
  - Click **"Tweet Update"** on any release note to open a custom draft editor.
  - Features an **interactive editor** with a live character count (280-character limit check) and an **X mockup card preview**.
  - Automatically redirects and pre-fills your tweet on X in a new tab upon confirmation.

## Project Structure

```
bq-release-notes/
├── app.py                  # Flask application server & feed parser logic
├── requirements.txt        # Python dependency manifest
├── README.md               # User guide and setup instructions
├── templates/
│   └── index.html          # Dashboard page template
└── static/
    ├── css/
    │   └── style.css       # Core stylesheets and dark-mode tokens
    └── js/
        └── app.js          # Live search/filter UI actions & tweet sharing modal
```

## Quick Start Setup

### 1. Install Dependencies
Make sure you have Python installed, then run:
```bash
pip install -r requirements.txt
```

### 2. Run the App
Launch the Flask development server:
```bash
python app.py
```

### 3. Open in Browser
Visit the application at:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

## Technical Architecture

- **Backend Cache**: The feed parser caches XML responses locally in-memory for 1 hour to avoid rate-limiting. Clicking the **"Refresh"** button overrides the cache to fetch the live feed.
- **Tweet Content Generator**: The backend intelligently strips HTML formatting, updates syntax tags, resolves links, and compiles a clean, short summary containing the date, type, and source link while keeping it under 280 characters.

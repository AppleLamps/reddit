# Reddit Thread Scraper

A retro terminal-style web app to scrape Reddit threads and export them as JSON.

## Features

- 🖥️ Retro green/yellow terminal aesthetic with CRT scanlines
- 🔗 Just paste any Reddit URL - automatically handles `.json` conversion
- 📊 Real-time post score and comment count stats
- 📥 One-click JSON download
- ⚡ Serverless backend via Vercel Edge Functions

## Deploy to Vercel

### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/reddit-scraper)

### Option 2: CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option 3: GitHub Integration

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Deploy automatically

## Local Development

```bash
vercel dev
```

Open <http://localhost:3000>

## Usage

1. Paste a Reddit thread URL (e.g., `https://www.reddit.com/r/...`)
2. Click **[ EXECUTE SCRAPE ]**
3. View results and stats
4. Click **[ DOWNLOAD_JSON ]** to save

## Project Structure

```
├── index.html      # Frontend (vanilla JS + CSS)
├── api/
│   └── scrape.js   # Vercel serverless function
├── vercel.json     # Vercel config
└── package.json
```

## License

MIT

## File Structure

```
.
├── index.html           # Main frontend page
├── api/
│   └── scrape.js       # Serverless function for scraping
├── vercel.json         # Vercel configuration
├── package.json        # Node.js dependencies
└── README.md          # This file
```

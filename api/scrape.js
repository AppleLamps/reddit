export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Parse URL to handle query parameters and trailing slashes correctly
        let jsonUrl;
        try {
            const urlObj = new URL(url);
            // Remove query parameters
            urlObj.search = '';
            // Remove trailing slash from pathname
            if (urlObj.pathname.endsWith('/')) {
                urlObj.pathname = urlObj.pathname.slice(0, -1);
            }
            // Append .json if not present
            if (!urlObj.pathname.endsWith('.json')) {
                urlObj.pathname += '.json';
            }
            // Use old.reddit.com as it's more permissive with API requests
            urlObj.hostname = 'old.reddit.com';
            jsonUrl = urlObj.toString();
        } catch (e) {
            // Fallback for simple string manipulation if URL parsing fails
            jsonUrl = url.split('?')[0];
            jsonUrl = jsonUrl.replace('www.reddit.com', 'old.reddit.com');
            if (!jsonUrl.endsWith('.json')) {
                jsonUrl = jsonUrl.replace(/\/$/, '') + '.json';
            }
        }

        // Fetch Reddit data with retry logic
        let response;
        let responseText;

        for (let attempt = 0; attempt < 2; attempt++) {
            response = await fetch(jsonUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; RedditScraper/1.0; +https://github.com)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache',
                }
            });

            responseText = await response.text();

            // If we got valid JSON, break out of retry loop
            if (responseText && !responseText.trim().startsWith('<')) {
                break;
            }

            // Wait a bit before retry
            if (attempt < 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!response.ok) {
            throw new Error(`Reddit returned ${response.status}: ${response.statusText}`);
        }

        if (!responseText || responseText.trim() === '') {
            throw new Error('Reddit returned an empty response. Please try again.');
        }

        // Check if we got HTML instead of JSON (usually an error page)
        if (responseText.trim().startsWith('<') || responseText.trim().startsWith('<!') || responseText.includes('<!DOCTYPE')) {
            throw new Error('Reddit blocked the request. Try again in a few seconds.');
        }

        // Check if response looks like valid JSON (Reddit API returns arrays or objects)
        const trimmedResponse = responseText.trim();
        if (!trimmedResponse.startsWith('[') && !trimmedResponse.startsWith('{')) {
            // This is likely a plain text error message from Reddit
            if (trimmedResponse.toLowerCase().includes('page not found') ||
                trimmedResponse.toLowerCase().includes('the page') ||
                trimmedResponse.toLowerCase().includes('not available')) {
                throw new Error('This Reddit post could not be found. It may have been deleted or made private.');
            }
            throw new Error('Reddit returned an unexpected response. The post may not be accessible.');
        }

        let rawData;
        try {
            rawData = JSON.parse(responseText);
        } catch (parseError) {
            // Include part of the response in error for debugging
            const preview = responseText.substring(0, 100);
            throw new Error(`Failed to parse Reddit response: ${preview}...`);
        }

        // Verify we have valid Reddit data structure
        if (!Array.isArray(rawData) || rawData.length < 2) {
            throw new Error('Invalid Reddit data structure. Please ensure this is a valid thread URL.');
        }

        // Clean the data
        const cleanedData = cleanRedditThread(rawData);

        return res.status(200).json({
            success: true,
            data: cleanedData
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: error.message || 'An error occurred while scraping'
        });
    }
}

function extractComments(replies, depth = 0) {
    const comments = [];

    if (!replies || replies === "") {
        return comments;
    }

    if (typeof replies === 'object' && replies.kind === 'Listing') {
        const children = replies.data?.children || [];

        for (const child of children) {
            if (child.kind === 't1') {  // t1 = comment
                const data = child.data || {};
                const author = data.author || '[deleted]';
                const body = data.body || '';
                const score = data.score || 0;

                if (body && author !== '[deleted]') {
                    comments.push({
                        author: author,
                        content: body,
                        score: score,
                        depth: depth
                    });
                }

                // Recursively get nested replies
                const nestedReplies = data.replies || '';
                comments.push(...extractComments(nestedReplies, depth + 1));
            }
        }
    }

    return comments;
}

function cleanRedditThread(data) {
    const result = {
        post: {},
        comments: []
    };

    // First element contains the main post
    if (data.length > 0) {
        const postListing = data[0];
        const children = postListing.data?.children || [];

        if (children.length > 0) {
            const postData = children[0].data || {};
            result.post = {
                title: postData.title || '',
                author: postData.author || '',
                content: postData.selftext || '',
                subreddit: postData.subreddit || '',
                score: postData.score || 0,
                num_comments: postData.num_comments || 0,
                url: postData.url || '',
                created_utc: postData.created_utc || 0,
                permalink: postData.permalink || ''
            };
        }
    }

    // Second element contains the comments
    if (data.length > 1) {
        const commentsListing = data[1];
        const children = commentsListing.data?.children || [];

        for (const child of children) {
            if (child.kind === 't1') {  // t1 = comment
                const childData = child.data || {};
                const author = childData.author || '[deleted]';
                const body = childData.body || '';
                const score = childData.score || 0;

                if (body && author !== '[deleted]') {
                    result.comments.push({
                        author: author,
                        content: body,
                        score: score,
                        depth: 0
                    });
                }

                // Get nested replies
                const replies = childData.replies || '';
                result.comments.push(...extractComments(replies, 1));
            }
        }
    }

    return result;
}

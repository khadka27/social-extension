/**
 * SocialShare - Background Service Worker
 * Handles context menus, cross-origin URL fetching, and metadata parsing.
 */

// Initialize context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'socialshare-page',
    title: 'Share Page with SocialShare',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'socialshare-link',
    title: 'Share Link with SocialShare',
    contexts: ['link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  if (targetUrl) {
    // Store selected URL for popup consumption
    await chrome.storage.local.set({ pendingShareUrl: targetUrl });
    
    // Open action popup or notification
    if (chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {
        // Fallback: create notification if popup couldn't open automatically
      });
    }
  }
});

// Message listener for external URL fetching and background tasks
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_EXTERNAL_METADATA') {
    const url = request.url;
    fetchExternalMetadata(url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async fetch
  }
});

/**
 * Fetches an external URL and extracts metadata using string/regex parsing
 * (Service Worker compatible)
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchExternalMetadata(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('Please provide a valid HTTP or HTTPS URL.');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page (${response.status} ${response.statusText})`);
  }

  const html = await response.text();
  return parseHtmlMetadata(html, url);
}

/**
 * Regex-based HTML metadata parser suitable for Service Workers
 * @param {string} html
 * @param {string} url
 * @returns {Object}
 */
function parseHtmlMetadata(html, url) {
  function getMeta(propertyOrName) {
    // Match property="og:title" content="..." or name="..." content="..."
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${propertyOrName}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propertyOrName}["']`, 'i')
    ];
    for (const regex of patterns) {
      const match = html.match(regex);
      if (match && match[1]) {
        return decodeHtmlEntities(match[1].trim());
      }
    }
    return '';
  }

  function decodeHtmlEntities(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  // 1. Title
  let title = getMeta('og:title') || getMeta('twitter:title') || getMeta('title');
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = decodeHtmlEntities(titleMatch[1].trim());
    }
  }

  // 2. Description
  let description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');

  // 3. Image
  let primaryImage = getMeta('og:image') || getMeta('og:image:secure_url') || getMeta('twitter:image') || getMeta('twitter:image:src');
  if (primaryImage && !primaryImage.startsWith('http')) {
    try {
      primaryImage = new URL(primaryImage, url).href;
    } catch (e) {}
  }

  // 4. Site Name
  let siteName = getMeta('og:site_name') || getMeta('application-name');
  if (!siteName) {
    try {
      siteName = new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {}
  }

  // 5. Author
  let author = getMeta('author') || getMeta('article:author') || getMeta('twitter:creator');

  // 6. Keywords
  let tags = [];
  const metaKeywords = getMeta('keywords');
  if (metaKeywords) {
    tags = metaKeywords.split(',').map(t => t.trim()).filter(Boolean);
  }

  // 7. Extract all image URLs from HTML
  const imageRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const imagesSet = new Set();
  if (primaryImage) imagesSet.add(primaryImage);

  let match;
  while ((match = imageRegex.exec(html)) !== null) {
    let src = match[1];
    if (src && !src.startsWith('data:') && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo')) {
      try {
        const fullUrl = new URL(src, url).href;
        if (fullUrl.startsWith('http')) {
          imagesSet.add(fullUrl);
        }
      } catch (e) {}
    }
    if (imagesSet.size >= 10) break;
  }

  return {
    title: title || 'Untitled Blog Post',
    description: description || '',
    url: url,
    cleanUrl: url.split('?')[0],
    image: primaryImage || Array.from(imagesSet)[0] || '',
    images: Array.from(imagesSet),
    siteName: siteName || '',
    author: author || '',
    tags: tags.slice(0, 8),
    extractedAt: new Date().toISOString()
  };
}

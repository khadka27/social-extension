/**
 * SocialShare - Background Service Worker
 * Handles context menus, keyboard shortcuts, background auto-posting,
 * cross-origin URL fetching, and metadata parsing.
 */

try {
  importScripts('extractor.js', 'social-share.js');
} catch (e) {
  console.log('Scripts imported in service worker');
}

// Initialize context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'socialshare-autopost',
    title: '⚡ Instant Auto-Post to Social Media',
    contexts: ['page']
  });

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

// Handle keyboard shortcuts (e.g. Alt+Shift+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'auto-post-current-tab') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
      triggerBackgroundAutoPost(activeTab);
    }
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'socialshare-autopost') {
    if (tab && tab.id) {
      triggerBackgroundAutoPost(tab);
    }
    return;
  }

  const targetUrl = info.linkUrl || info.pageUrl || tab?.url;
  if (targetUrl) {
    // Store selected URL for popup consumption
    await chrome.storage.local.set({ pendingShareUrl: targetUrl });
    
    // Open action popup
    if (chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {});
    }
  }
});

/**
 * Triggers background auto-posting for an active tab
 * Extracts metadata, generates unique copy per platform, and opens all share tabs in background
 */
async function triggerBackgroundAutoPost(tab) {
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
    showNotification('Cannot Auto-Post', 'Internal browser pages cannot be shared.');
    return;
  }

  try {
    // 1. Extract metadata from tab
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_METADATA' }, async (response) => {
      let data = response?.data;

      // Fallback if content script not yet injected
      if (!data) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['scripts/extractor.js', 'scripts/content.js']
          });

          const retryRes = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_METADATA' }, (res) => resolve(res));
          });
          data = retryRes?.data;
        } catch (e) {}
      }

      if (!data) {
        data = {
          title: tab.title || 'Untitled Blog Post',
          url: tab.url,
          description: '',
          image: '',
          tags: []
        };
      }

      // 2. Read user's platform preferences
      const stored = await chrome.storage.local.get(['autoPostPlatforms', 'autoRandomize']);
      const platforms = stored.autoPostPlatforms && stored.autoPostPlatforms.length > 0 
        ? stored.autoPostPlatforms 
        : ['twitter', 'linkedin', 'threads', 'reddit'];

      const shouldRandomize = typeof stored.autoRandomize === 'boolean' ? stored.autoRandomize : true;

      // 3. Open share intent tabs sequentially
      let openedCount = 0;
      platforms.forEach((platKey, index) => {
        const platform = SocialShare.PLATFORMS[platKey];
        if (!platform) return;

        let postTitle = data.title;
        if (shouldRandomize && typeof SocialShare.makeUnique === 'function') {
          postTitle = SocialShare.makeUnique(data.title, data.description);
        }

        const shareUrl = platform.getUrl({
          title: postTitle,
          description: data.description,
          url: data.url,
          image: data.image,
          siteName: data.siteName,
          author: data.author,
          tags: SocialShare.formatHashtags(data.tags)
        });

        if (shareUrl) {
          if (platKey === 'facebook') {
            const templateFn = SocialShare.TEMPLATES.standard;
            const fullPost = templateFn({
              title: postTitle,
              description: data.description,
              url: data.url,
              hashtags: SocialShare.formatHashtags(data.tags)
            });
            chrome.storage.local.set({
              pendingFacebookPost: {
                text: fullPost,
                title: postTitle,
                description: data.description,
                timestamp: Date.now()
              }
            });
          }

          setTimeout(() => {
            if (platKey === 'tiktok' || platKey === 'youtube') {
              chrome.tabs.create({ url: shareUrl, active: false });
            } else {
              chrome.tabs.create({ url: shareUrl, active: false });
            }
          }, index * 400);
          openedCount++;
        }
      });

      showNotification(
        '⚡ SocialShare Auto-Post Complete!',
        `Successfully launched ${openedCount} social share tabs in background.`
      );
    });
  } catch (err) {
    showNotification('Auto-Post Error', err.message || 'Could not complete auto-post.');
  }
}

/**
 * System notification helper
 */
function showNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message,
      priority: 2
    });
  }
}

// Message listener for external URL fetching and background tasks
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_EXTERNAL_METADATA') {
    const url = request.url;
    fetchExternalMetadata(url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async fetch
  }

  if (request.action === 'BACKGROUND_AUTO_POST') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) triggerBackgroundAutoPost(tab);
    });
    sendResponse({ success: true });
    return true;
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

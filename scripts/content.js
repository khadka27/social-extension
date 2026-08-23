/**
 * SocialShare - Content Script
 * Runs in the context of the active webpage to extract live metadata.
 */

(function () {
  'use strict';

  const chromeApi = typeof chrome !== 'undefined' && chrome.runtime ? chrome : (typeof browser !== 'undefined' ? browser : null);
  if (!chromeApi) return;

  // Listen for messages from popup or background script
  chromeApi.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXTRACT_METADATA') {
      try {
        if (typeof SocialExtractor !== 'undefined') {
          const metadata = SocialExtractor.extractMetadata(document, window.location.href);
          sendResponse({ success: true, data: metadata });
        } else {
          // Fallback simple extraction if extractor script hasn't loaded
          const title = document.title || '';
          const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
          sendResponse({
            success: true,
            data: {
              title,
              description: metaDesc,
              image: ogImage,
              images: ogImage ? [ogImage] : [],
              url: window.location.href,
              tags: []
            }
          });
        }
      } catch (err) {
        console.error('[SocialShare Content Script] Extraction error:', err);
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // Keep channel open for async response
  });
})();

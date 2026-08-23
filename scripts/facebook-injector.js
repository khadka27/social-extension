/**
 * SocialShare - Facebook Auto-Fill Content Script
 * Automatically inserts Title, Description, and Hashtags into Facebook's
 * "What's on your mind?" or "Say something about this..." composer.
 */

(function () {
  'use strict';

  // Check for pending post text intended for Facebook
  chrome.storage.local.get(['pendingFacebookPost'], (res) => {
    if (!res || !res.pendingFacebookPost) return;

    const postData = res.pendingFacebookPost;
    const now = Date.now();

    // Only process if created within the last 60 seconds
    if (now - (postData.timestamp || 0) > 60000) {
      chrome.storage.local.remove('pendingFacebookPost');
      return;
    }

    const fullText = postData.text || '';
    if (!fullText) return;

    // Attempt to inject text into Facebook composer
    attemptFacebookInjection(fullText);
  });

  /**
   * Attempts to locate Facebook's composer and inject text
   */
  function attemptFacebookInjection(text) {
    let attempts = 0;
    const maxAttempts = 30; // Try for up to 15 seconds

    const interval = setInterval(() => {
      attempts++;

      // Selectors for Facebook Sharer dialog and Main Feed Composer
      const selectors = [
        'div[contenteditable="true"][role="textbox"]',
        'div[aria-label*="What\'s on your mind"]',
        'div[aria-label*="Say something about this"]',
        'div[aria-label*="Write something"]',
        'div[aria-label*="Create a post"]',
        'div[aria-label*="Post"]',
        'div[data-lexical-editor="true"]',
        'div[contenteditable="true"]',
        'textarea[name="xhpc_message"]'
      ];

      let composer = null;
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        for (const el of found) {
          if (el.offsetParent !== null && !el.getAttribute('aria-hidden')) {
            composer = el;
            break;
          }
        }
        if (composer) break;
      }

      if (composer) {
        clearInterval(interval);
        injectTextIntoElement(composer, text);
        // Clear pending storage once successfully injected
        chrome.storage.local.remove('pendingFacebookPost');
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }

  /**
   * Injects text cleanly into Facebook's rich text editor
   */
  function injectTextIntoElement(element, text) {
    element.focus();

    // Check if element is already populated
    if (element.textContent && element.textContent.trim().length > 5) {
      return;
    }

    try {
      // 1. Scoped selection restricted to element only
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(element);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const success = document.execCommand('insertText', false, text);
      if (sel) sel.removeAllRanges();

      if (!success || !element.textContent) {
        // 2. Fallback to InputEvent
        element.innerHTML = '';
        const lines = text.split('\n');
        lines.forEach((line, idx) => {
          const p = document.createElement('p');
          p.className = 'xdj266r x11i5rnm xat24cr x1mh8g0r';
          if (line.trim() === '') {
            p.innerHTML = '<br>';
          } else {
            p.textContent = line;
          }
          element.appendChild(p);
        });

        // Dispatch input and change events so Facebook's React state registers it
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    } catch (e) {
      // Fallback
      element.innerText = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
})();

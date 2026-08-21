/**
 * SocialShare - Universal Social Media Auto-Fill Content Script
 * Automatically detects and injects Title, Description, and Hashtags directly into
 * post composers across Facebook, LinkedIn, 𝕏 (Twitter), Threads, Reddit, YouTube Studio, and TikTok.
 */

(function () {
  'use strict';

  // Platform Composer Selectors Dictionary
  const PLATFORM_SELECTORS = {
    facebook: [
      'div[contenteditable="true"][role="textbox"]',
      'div[aria-label*="What\'s on your mind"]',
      'div[aria-label*="Say something about this"]',
      'div[aria-label*="Write something"]',
      'div[aria-label*="Create a post"]',
      'div[aria-label*="Post"]',
      'div[data-lexical-editor="true"]',
      'textarea[name="xhpc_message"]'
    ],
    linkedin: [
      'div.ql-editor[contenteditable="true"]',
      'div[aria-label*="What do you want to talk about"]',
      'div[aria-label*="Share your thoughts"]',
      'div[data-placeholder*="What do you want to talk about"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[data-test-ql-editor="true"]'
    ],
    twitter: [
      'div[data-testid="tweetTextarea_0"]',
      'div[role="textbox"][data-testid*="tweet"]',
      'div[aria-label*="Post text"]',
      'div[aria-label*="Tweet text"]'
    ],
    threads: [
      'div[role="textbox"][contenteditable="true"]',
      'div[aria-label*="Start a thread"]',
      'div[aria-label*="Post"]'
    ],
    reddit: [
      'div[role="textbox"][contenteditable="true"]',
      'div[data-lexical-editor="true"]',
      'textarea[name="text"]',
      'textarea[placeholder*="Text"]'
    ],
    youtube: [
      'ytcp-text-box[contenteditable="true"]',
      '#textbox[contenteditable="true"]',
      'div[contenteditable="true"][id="textbox"]',
      'div[aria-label*="Create a post"]',
      'div[aria-label*="Tell viewers about your video"]',
      'div[aria-label*="Add a title that describes your video"]',
      'ytcp-social-suggestions-textbox[id="title-textarea"] #textbox',
      'ytcp-social-suggestions-textbox[id="description-textarea"] #textbox'
    ]
  };

  // Determine current platform
  function detectCurrentPlatform() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('facebook.com')) return 'facebook';
    if (host.includes('linkedin.com')) return 'linkedin';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
    if (host.includes('threads.net')) return 'threads';
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('youtube.com')) return 'youtube';
    return null;
  }

  // Listen for pending post
  chrome.storage.local.get(['pendingSocialPost', 'pendingFacebookPost'], (res) => {
    const postData = res.pendingSocialPost || res.pendingFacebookPost;
    if (!postData) return;

    const now = Date.now();
    // Only process if created within the last 90 seconds
    if (now - (postData.timestamp || 0) > 90000) {
      chrome.storage.local.remove(['pendingSocialPost', 'pendingFacebookPost']);
      return;
    }

    const currentPlat = detectCurrentPlatform();
    if (!currentPlat) return;

    const textToInject = postData.text || `${postData.title}\n\n${postData.description}`;
    if (!textToInject) return;

    // Special YouTube Dashboard Trigger: Auto-trigger Upload Modal if on dashboard
    if (currentPlat === 'youtube') {
      handleYouTubeStudioAutoTrigger(postData);
    }

    // Start polling to find the composer
    attemptComposerInjection(currentPlat, textToInject);
  });

  /**
   * Automatically triggers YouTube Studio upload dialog if user landed on dashboard
   */
  function handleYouTubeStudioAutoTrigger(postData) {
    let triggered = false;
    const triggerInterval = setInterval(() => {
      if (triggered) {
        clearInterval(triggerInterval);
        return;
      }

      // Check for upload modal already open
      const uploadModal = document.querySelector('ytcp-uploads-dialog');
      if (uploadModal) {
        triggered = true;
        clearInterval(triggerInterval);
        return;
      }

      // Look for dashboard upload buttons and click
      const uploadBtn = document.querySelector('ytcp-button#upload-icon, button#upload-button, ytcp-button[aria-label*="Upload"], #create-icon, button[aria-label="Create"]');
      if (uploadBtn) {
        uploadBtn.click();
        triggered = true;
        clearInterval(triggerInterval);
        showAutoFillBadge('youtube', 'Opening YouTube Upload Dialog...');
      }
    }, 600);

    setTimeout(() => clearInterval(triggerInterval), 10000);
  }

  /**
   * Polls DOM to find active composer element on the current platform
   */
  function attemptComposerInjection(platform, text) {
    const selectors = PLATFORM_SELECTORS[platform] || [];
    let attempts = 0;
    const maxAttempts = 40; // Try for up to 20 seconds

    const interval = setInterval(() => {
      attempts++;

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
        injectTextIntoComposer(composer, text, platform);
        // Clear pending storage once injected
        chrome.storage.local.remove(['pendingSocialPost', 'pendingFacebookPost']);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }

  /**
   * Injects formatted text into contenteditable / textarea and triggers React/Vue events
   */
  function injectTextIntoComposer(composer, text, platform) {
    composer.focus();

    // Avoid overwriting if user already typed something long
    if (composer.textContent && composer.textContent.trim().length > 15) {
      return;
    }

    try {
      // 1. Try standard execCommand
      document.execCommand('selectAll', false, null);
      const success = document.execCommand('insertText', false, text);

      if (!success || !composer.textContent || composer.textContent.trim().length === 0) {
        // 2. DOM construction fallback
        composer.innerHTML = '';
        const lines = text.split('\n');
        lines.forEach((line) => {
          const p = document.createElement('p');
          if (line.trim() === '') {
            p.innerHTML = '<br>';
          } else {
            p.textContent = line;
          }
          composer.appendChild(p);
        });

        composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    } catch (e) {
      // Direct text fallback
      composer.innerText = text;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    }

    showAutoFillBadge(platform);
  }

  /**
   * Displays a floating badge notifying the user that text was auto-filled
   */
  function showAutoFillBadge(platform, customMessage = null) {
    const existing = document.getElementById('socialshare-toast-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'socialshare-toast-badge';
    badge.style.cssText = `
      position: fixed;
      top: 18px;
      right: 18px;
      background: rgba(15, 23, 42, 0.96);
      border: 1px solid #6366F1;
      color: #FFFFFF;
      padding: 9px 16px;
      border-radius: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5), 0 0 12px rgba(99,102,241,0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: fadeInSlide 0.3s ease-out;
      pointer-events: none;
    `;
    badge.innerHTML = customMessage ? `✨ SocialShare: ${customMessage}` : `✨ SocialShare: Auto-filled Title & Description!`;
    document.body.appendChild(badge);

    setTimeout(() => {
      badge.style.opacity = '0';
      badge.style.transition = 'opacity 0.4s ease';
      setTimeout(() => badge.remove(), 400);
    }, 3200);
  }
})();

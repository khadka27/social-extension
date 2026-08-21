/**
 * SocialShare - Universal Social Media Auto-Fill Content Script
 * Automatically detects and injects Title, Description, and Hashtags directly into
 * post composers across Facebook, LinkedIn, 𝕏 (Twitter), Threads, Reddit, YouTube Studio, and TikTok Studio.
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
    ],
    tiktok: [
      'div.public-DraftEditor-content[contenteditable="true"]',
      'div[contenteditable="true"][data-text="true"]',
      'div[contenteditable="true"][class*="caption"]',
      'div[contenteditable="true"][class*="editor"]',
      'div[contenteditable="true"][aria-label*="Caption"]',
      'div[contenteditable="true"][data-placeholder*="caption"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="caption"]',
      'textarea[placeholder*="Describe your video"]',
      'input[placeholder*="caption"]'
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
    if (host.includes('tiktok.com')) return 'tiktok';
    return null;
  }

  // Listen for pending post
  chrome.storage.local.get(['pendingSocialPost', 'pendingFacebookPost'], (res) => {
    const postData = res.pendingSocialPost || res.pendingFacebookPost;
    if (!postData) return;

    const now = Date.now();
    // Only process if created within the last 180 seconds
    if (now - (postData.timestamp || 0) > 180000) {
      chrome.storage.local.remove(['pendingSocialPost', 'pendingFacebookPost']);
      return;
    }

    const currentPlat = detectCurrentPlatform();
    if (!currentPlat) return;

    const textToInject = postData.text || `${postData.title}\n\n${postData.description}`;
    if (!textToInject) return;

    // Special YouTube Dashboard Trigger & Assistant
    if (currentPlat === 'youtube') {
      handleYouTubeStudioAutoTrigger(postData);
      renderYouTubeFloatingHelper(postData);
    }

    // Special TikTok Assistant Widget & Live Polling
    if (currentPlat === 'tiktok') {
      renderTikTokFloatingHelper(postData);
      highlightTikTokDropzone();
    }

    // Start polling to find the composer
    attemptComposerInjection(currentPlat, textToInject);
  });

  /**
   * Highlights TikTok dropzone with visual animation
   */
  function highlightTikTokDropzone() {
    let checkCount = 0;
    const interval = setInterval(() => {
      checkCount++;
      const dropzone = document.querySelector('.upload-container, div[class*="drop-zone"], div[class*="upload-card"], div[class*="uploader"]');
      if (dropzone) {
        clearInterval(interval);
        dropzone.style.transition = 'all 0.3s ease';
        dropzone.style.border = '2px dashed #FE2C55';
        dropzone.style.backgroundColor = 'rgba(254, 44, 85, 0.04)';
      }
      if (checkCount > 20) clearInterval(interval);
    }, 500);
  }

  /**
   * Renders a floating helper assistant on YouTube Studio
   */
  function renderYouTubeFloatingHelper(postData) {
    const existing = document.getElementById('socialshare-youtube-helper');
    if (existing) existing.remove();

    const helper = document.createElement('div');
    helper.id = 'socialshare-youtube-helper';
    helper.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 310px;
      background: #12151C;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 14px;
      color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.65), 0 0 1px rgba(255, 255, 255, 0.2);
      z-index: 9999999;
      animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const titleSnippet = postData.title ? (postData.title.slice(0, 42) + (postData.title.length > 42 ? '...' : '')) : 'YouTube Video';
    const textToUse = postData.text || postData.title || '';

    helper.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 600; font-size: 12.5px; color: #F1F5F9; display: flex; align-items: center; gap: 6px;">
          🎥 YouTube Studio Helper
        </span>
        <button id="close-yt-helper-btn" style="background: none; border: none; color: #64748B; cursor: pointer; font-size: 16px; padding: 0 4px;">&times;</button>
      </div>
      <p style="font-size: 11px; color: #94A3B8; margin: 0 0 10px 0; line-height: 1.35;">
        ${escapeHtml(titleSnippet)}
      </p>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="yt-select-file-btn" style="background: #2563EB; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); padding: 7px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          📂 Select Video From Downloads
        </button>
        <button id="yt-autofill-btn" style="background: #1A1D27; border: 1px solid rgba(255, 255, 255, 0.1); color: #E2E8F0; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 11.5px; cursor: pointer;">
          ✨ Auto-Fill Title & Description
        </button>
        <button id="yt-copy-btn" style="background: #141720; border: 1px solid rgba(255, 255, 255, 0.08); color: #94A3B8; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer;">
          📋 Copy Description & Tags
        </button>
      </div>
      <p style="font-size: 10px; color: #64748B; margin: 8px 0 0 0; text-align: center;">
        💡 Select downloaded video or drag into box above!
      </p>
    `;

    document.body.appendChild(helper);

    helper.querySelector('#close-yt-helper-btn').addEventListener('click', () => helper.remove());

    helper.querySelector('#yt-select-file-btn').addEventListener('click', () => {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.click();
      } else {
        const uploadBtn = document.querySelector('ytcp-button#upload-icon, button#upload-button, ytcp-button[aria-label*="Upload"], #create-icon, button[aria-label="Create"]');
        if (uploadBtn) uploadBtn.click();
      }
    });

    helper.querySelector('#yt-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(textToUse);
      helper.querySelector('#yt-copy-btn').textContent = '✅ Copied to Clipboard!';
      setTimeout(() => {
        helper.querySelector('#yt-copy-btn').textContent = '📋 Copy Description & Tags';
      }, 2000);
    });

    helper.querySelector('#yt-autofill-btn').addEventListener('click', () => {
      attemptComposerInjection('youtube', textToUse);
    });
  }

  /**
   * Renders a sleek floating helper assistant on TikTok Studio
   */
  function renderTikTokFloatingHelper(postData) {
    const existing = document.getElementById('socialshare-tiktok-helper');
    if (existing) existing.remove();

    const helper = document.createElement('div');
    helper.id = 'socialshare-tiktok-helper';
    helper.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 310px;
      background: #12151C;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 14px;
      color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.65), 0 0 1px rgba(255, 255, 255, 0.2);
      z-index: 9999999;
      animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const titleSnippet = postData.title ? (postData.title.slice(0, 42) + (postData.title.length > 42 ? '...' : '')) : 'Article Post';
    const textToUse = postData.text || postData.title || '';

    helper.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 600; font-size: 12.5px; color: #F1F5F9; display: flex; align-items: center; gap: 6px;">
          🎵 TikTok Studio Helper
        </span>
        <button id="close-tiktok-helper-btn" style="background: none; border: none; color: #64748B; cursor: pointer; font-size: 16px; padding: 0 4px;">&times;</button>
      </div>
      <p style="font-size: 11px; color: #94A3B8; margin: 0 0 10px 0; line-height: 1.35;">
        ${escapeHtml(titleSnippet)}
      </p>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="tiktok-select-file-btn" style="background: #2563EB; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); padding: 7px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          📂 Select Video From Downloads
        </button>
        <button id="tiktok-autofill-btn" style="background: #1A1D27; border: 1px solid rgba(255, 255, 255, 0.1); color: #E2E8F0; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 11.5px; cursor: pointer;">
          ✨ Auto-Fill Caption in Box
        </button>
        <button id="tiktok-copy-btn" style="background: #141720; border: 1px solid rgba(255, 255, 255, 0.08); color: #94A3B8; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer;">
          📋 Copy Caption & Hashtags
        </button>
      </div>
      <p style="font-size: 10px; color: #64748B; margin: 8px 0 0 0; text-align: center;">
        💡 Click "Select Video" or drag video file into box above!
      </p>
    `;

    document.body.appendChild(helper);

    helper.querySelector('#close-tiktok-helper-btn').addEventListener('click', () => helper.remove());

    // Trigger file chooser directly on TikTok input
    helper.querySelector('#tiktok-select-file-btn').addEventListener('click', () => {
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.click();
      } else {
        const selectBtn = document.querySelector('button[class*="upload"], button:has-text("Select video"), div[class*="select-button"]');
        if (selectBtn) selectBtn.click();
      }
    });

    helper.querySelector('#tiktok-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(textToUse);
      helper.querySelector('#tiktok-copy-btn').textContent = '✅ Copied to Clipboard!';
      setTimeout(() => {
        helper.querySelector('#tiktok-copy-btn').textContent = '📋 Copy Caption & Hashtags';
      }, 2000);
    });

    helper.querySelector('#tiktok-autofill-btn').addEventListener('click', () => {
      attemptComposerInjection('tiktok', textToUse);
    });

    // Listen for file drop / selection on TikTok to trigger auto-fill automatically
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        setTimeout(() => {
          attemptComposerInjection('tiktok', textToUse);
        }, 1500);
      });
    }
  }

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

      const uploadModal = document.querySelector('ytcp-uploads-dialog');
      if (uploadModal) {
        triggered = true;
        clearInterval(triggerInterval);
        return;
      }

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
    const maxAttempts = 60; // Try for up to 30 seconds (allows time for photo/video drop)

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
        chrome.storage.local.remove(['pendingSocialPost', 'pendingFacebookPost']);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }

  /**
   * Injects formatted text into contenteditable / textarea and triggers React/Vue/DraftJS events
   */
  function injectTextIntoComposer(composer, text, platform) {
    composer.focus();

    if (composer.textContent && composer.textContent.trim().length > 15) {
      return;
    }

    try {
      // 1. Standard execCommand
      document.execCommand('selectAll', false, null);
      const success = document.execCommand('insertText', false, text);

      if (!success || !composer.textContent || composer.textContent.trim().length === 0) {
        // 2. DraftJS / Lexical construction fallback
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
    }, 3500);
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();

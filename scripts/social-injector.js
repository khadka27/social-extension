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
      'div.ql-editor',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="What do you want to talk about" i]',
      'div[contenteditable="true"][aria-label*="Share your thoughts" i]',
      'div[contenteditable="true"][data-placeholder*="What do you want to talk about" i]',
      'div[contenteditable="true"][data-placeholder*="Start a post" i]',
      'div[data-test-ql-editor="true"]'
    ],
    linkedin_page: [
      'div.ql-editor[contenteditable="true"]',
      'div.ql-editor',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][aria-label*="What do you want to talk about" i]',
      'div[contenteditable="true"][aria-label*="Share your thoughts" i]',
      'div[contenteditable="true"][data-placeholder*="What do you want to talk about" i]',
      'div[contenteditable="true"][data-placeholder*="Start a post" i]',
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
      '#description-textarea #textbox[contenteditable="true"]',
      '#title-textarea #textbox[contenteditable="true"]',
      'ytcp-social-suggestions-textbox #textbox',
      'ytcp-text-box[contenteditable="true"]',
      '#textbox[contenteditable="true"]',
      'div[contenteditable="true"][id="textbox"]',
      'div[aria-label*="Create a post"]',
      'div[aria-label*="Tell viewers about your video"]',
      'div[aria-label*="Add a title that describes your video"]',
      'div[id="contenteditable-textarea"]'
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
  function detectCurrentPlatform(pendingPlat) {
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (host.includes('facebook.com')) return 'facebook';
    if (host.includes('linkedin.com')) {
      if (pendingPlat === 'linkedin_page' || path.includes('/company/') || path.includes('/school/') || path.includes('/admin/') || path.includes('/page-posts/')) {
        return 'linkedin_page';
      }
      return 'linkedin';
    }
    if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
    if (host.includes('threads.net')) return 'threads';
    if (host.includes('reddit.com')) return 'reddit';
    if (host.includes('youtube.com')) return 'youtube';
    if (host.includes('tiktok.com')) return 'tiktok';
    return null;
  }

  const chromeApi = typeof chrome !== 'undefined' && chrome.storage ? chrome : (typeof browser !== 'undefined' ? browser : null);

  /**
   * Builds the fallback text if postData.text is missing
   */
  function buildFallbackPostText(postData) {
    if (!postData) return '';
    if (postData.text) return postData.text;
    if (typeof SocialShare !== 'undefined' && SocialShare.TEMPLATES && SocialShare.TEMPLATES.review) {
      return SocialShare.TEMPLATES.review(postData);
    }
    const parts = [];
    if (postData.title) parts.push(postData.title);
    if (postData.url) parts.push(postData.url);
    return parts.join('\n\n');
  }

  /**
   * Helper to verify if the text in the composer matches the target text
   */
  function isTextFullyInjected(currentText, targetText) {
    if (!currentText || !targetText) return false;
    const cur = currentText.trim();
    const target = targetText.trim();

    if (cur === target) return true;

    const startSnippet = target.slice(0, 20).trim();
    const endSnippet = target.slice(-25).trim();

    if (startSnippet && cur.includes(startSnippet)) {
      if (endSnippet && cur.includes(endSnippet)) {
        return true;
      }
      if (target.length <= 40) {
        return true;
      }
    }
    return false;
  }

  let lastProcessedTimestamp = 0;

  /**
   * Processes a pending post payload and triggers UI helpers & composer injection
   */
  function processPendingPost(postData) {
    if (!postData) return;

    const now = Date.now();
    // Only process if created within the last 300 seconds
    if (now - (postData.timestamp || 0) > 300000) {
      return;
    }

    if (postData.timestamp && postData.timestamp === lastProcessedTimestamp) {
      return;
    }
    lastProcessedTimestamp = postData.timestamp || 0;

    const currentPlat = detectCurrentPlatform(postData.platform);
    if (!currentPlat) return;

    const textToInject = buildFallbackPostText(postData);
    if (!textToInject) return;

    // Special LinkedIn Assistant & Auto-Trigger
    if (currentPlat === 'linkedin' || currentPlat === 'linkedin_page') {
      handleLinkedInAutoTrigger();
      renderLinkedInFloatingHelper(postData);
    }

    // Special Twitter / X Floating Helper
    if (currentPlat === 'twitter') {
      renderTwitterFloatingHelper(postData);
    }

    // Special YouTube Studio Trigger & Assistant
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
    attemptComposerInjection(currentPlat, textToInject, postData);
  }

  // 1. Check storage on initial script load
  if (chromeApi && chromeApi.storage && chromeApi.storage.local) {
    chromeApi.storage.local.get(['pendingSocialPost', 'pendingFacebookPost'], (res) => {
      if (res) {
        processPendingPost(res.pendingSocialPost || res.pendingFacebookPost);
      }
    });

    // 2. Listen live for storage updates (Fixes Brave tab pre-rendering & concurrent tab shares)
    if (chromeApi.storage.onChanged) {
      chromeApi.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.pendingSocialPost && changes.pendingSocialPost.newValue) {
            processPendingPost(changes.pendingSocialPost.newValue);
          } else if (changes.pendingFacebookPost && changes.pendingFacebookPost.newValue) {
            processPendingPost(changes.pendingFacebookPost.newValue);
          }
        }
      });
    }
  }

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
        dropzone.style.border = '2px dashed #3B82F6';
        dropzone.style.backgroundColor = 'rgba(59, 130, 246, 0.04)';
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          YouTube Studio Helper
        </span>
        <button id="close-yt-helper-btn" style="background: none; border: none; color: #64748B; cursor: pointer; font-size: 16px; padding: 0 4px;">&times;</button>
      </div>
      <p style="font-size: 11px; color: #94A3B8; margin: 0 0 10px 0; line-height: 1.35;">
        ${escapeHtml(titleSnippet)}
      </p>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="yt-open-upload-btn" style="background: #2563EB; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); padding: 7px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Open Upload Video Dialog
        </button>
        <button id="yt-autofill-btn" style="background: #1A1D27; border: 1px solid rgba(255, 255, 255, 0.1); color: #E2E8F0; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Auto-Fill Title & Description
        </button>
        <button id="yt-copy-btn" style="background: #141720; border: 1px solid rgba(255, 255, 255, 0.08); color: #94A3B8; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy Description & Tags
        </button>
      </div>
      <p style="font-size: 10px; color: #64748B; margin: 8px 0 0 0; text-align: center;">
        Select video file from Downloads to begin
      </p>
    `;

    document.body.appendChild(helper);

    helper.querySelector('#close-yt-helper-btn').addEventListener('click', () => helper.remove());

    helper.querySelector('#yt-open-upload-btn').addEventListener('click', () => {
      triggerYouTubeUploadDialog();
    });

    helper.querySelector('#yt-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(textToUse);
      helper.querySelector('#yt-copy-btn').textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        helper.querySelector('#yt-copy-btn').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Description & Tags`;
      }, 2000);
    });

    helper.querySelector('#yt-autofill-btn').addEventListener('click', () => {
      attemptComposerInjection('youtube', textToUse, postData);
    });
  }

  /**
   * Helper that clicks YouTube Studio's Create / Upload video elements
   */
  function triggerYouTubeUploadDialog() {
    // 1. Direct file input click
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput && fileInput.offsetParent !== null) {
      fileInput.click();
      return;
    }

    // 2. Central Upload button in dashboard
    const uploadBtn = document.querySelector('#upload-button, button[aria-label*="Upload"], ytcp-button#upload-button');
    if (uploadBtn) {
      uploadBtn.click();
      return;
    }

    // 3. Top-right Create button
    const createBtn = document.querySelector('#create-icon, button[aria-label*="Create"], ytcp-button#create-icon');
    if (createBtn) {
      createBtn.click();
      setTimeout(() => {
        const uploadOption = document.querySelector('tp-yt-paper-item#text-item-0, ytcp-text-menu #text-item-0, yt-formatted-string:contains("Upload videos")');
        if (uploadOption) uploadOption.click();
      }, 350);
    }
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#FE2C55"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3.14 15.68a6.34 6.34 0 0 0 10.82 4.48 6.27 6.27 0 0 0 1.86-4.49v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
          TikTok Studio Helper
        </span>
        <button id="close-tiktok-helper-btn" style="background: none; border: none; color: #64748B; cursor: pointer; font-size: 16px; padding: 0 4px;">&times;</button>
      </div>
      <p style="font-size: 11px; color: #94A3B8; margin: 0 0 10px 0; line-height: 1.35;">
        ${escapeHtml(titleSnippet)}
      </p>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="tiktok-select-file-btn" style="background: #2563EB; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); padding: 7px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          Select Video From Downloads
        </button>
        <button id="tiktok-autofill-btn" style="background: #1A1D27; border: 1px solid rgba(255, 255, 255, 0.1); color: #E2E8F0; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Auto-Fill Caption in Box
        </button>
        <button id="tiktok-copy-btn" style="background: #141720; border: 1px solid rgba(255, 255, 255, 0.08); color: #94A3B8; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy Caption & Hashtags
        </button>
      </div>
      <p style="font-size: 10px; color: #64748B; margin: 8px 0 0 0; text-align: center;">
        Select video or drag video file into dropzone above
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
      helper.querySelector('#tiktok-copy-btn').textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        helper.querySelector('#tiktok-copy-btn').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Caption & Hashtags`;
      }, 2000);
    });

    helper.querySelector('#tiktok-autofill-btn').addEventListener('click', () => {
      attemptComposerInjection('tiktok', textToUse, postData);
    });

    // Listen for file drop / selection on TikTok to trigger auto-fill automatically
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.addEventListener('change', () => {
        setTimeout(() => {
          attemptComposerInjection('tiktok', textToUse, postData);
        }, 1500);
      });
    }
  }

  /**
   * Automatically triggers YouTube Studio upload dialog if user landed on dashboard
   */
  function handleYouTubeStudioAutoTrigger(postData) {
    let attempts = 0;
    const triggerInterval = setInterval(() => {
      attempts++;

      // Check if upload modal already open
      const uploadModal = document.querySelector('ytcp-uploads-dialog');
      if (uploadModal) {
        clearInterval(triggerInterval);
        return;
      }

      // Try triggering
      triggerYouTubeUploadDialog();

      if (attempts >= 15) {
        clearInterval(triggerInterval);
      }
    }, 800);
  }

  /**
   * Helper that checks if an element is visible in the DOM
   * (Reliable even in position:fixed modals where offsetParent is null)
   */
  function isElementVisible(el) {
    if (!el) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // Elements inside active modal dialogs are always considered visible
    if (el.closest && el.closest('div[role="dialog"], div.artdeco-modal, div.share-box, div.share-creation-state, .editor-content')) {
      return true;
    }
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0 || (el.getClientRects && el.getClientRects().length > 0)) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  /**
   * Polls DOM to find active composer element on the current platform
   */
  function attemptComposerInjection(platform, text, postData, forceOverwrite = false) {
    const selectors = PLATFORM_SELECTORS[platform] || [];
    let attempts = 0;
    const maxAttempts = 60;

    const interval = setInterval(() => {
      attempts++;

      if (platform === 'youtube') {
        // Special multi-field injection for YouTube Video details (Title + Description)
        const titleEl = document.querySelector(
          '#title-textarea #textbox[contenteditable="true"], ytcp-social-suggestions-textbox[id="title-textarea"] #textbox, ytcp-video-title-editor #textbox, #title-textarea textarea, [aria-label*="title" i][contenteditable="true"], [aria-label*="Titel" i][contenteditable="true"]'
        );
        const descEl = document.querySelector(
          '#description-textarea #textbox[contenteditable="true"], ytcp-social-suggestions-textbox[id="description-textarea"] #textbox, ytcp-video-description-editor #textbox, #description-textarea textarea, [aria-label*="description" i][contenteditable="true"], [aria-label*="Beschreibung" i][contenteditable="true"]'
        );

        let titleUpdated = false;
        let descUpdated = false;

        if (titleEl && postData && postData.title) {
          const currentTitle = titleEl.textContent ? titleEl.textContent.trim() : '';
          if (currentTitle !== postData.title.trim()) {
            injectTextIntoComposer(titleEl, postData.title, platform, true, postData);
          }
          titleUpdated = (titleEl.textContent && titleEl.textContent.trim() === postData.title.trim());
        }

        if (descEl && postData) {
          const descToInject = postData.description
            ? [
                postData.description,
                postData.url ? `Read full article: ${postData.url}` : '',
                postData.tags && postData.tags.length ? postData.tags.join(' ') : ''
              ].filter(Boolean).join('\n\n')
            : (postData.text || text);

          const currentDesc = descEl.textContent ? descEl.textContent.trim() : '';
          if (currentDesc !== descToInject.trim()) {
            injectTextIntoComposer(descEl, descToInject, platform, true, postData);
          }
          descUpdated = (descEl.textContent && descEl.textContent.trim().length > 0);
        }

        if (titleUpdated && descUpdated) {
          clearInterval(interval);
          return;
        }
      }

      let composer = null;
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        for (const el of found) {
          if (isElementVisible(el)) {
            composer = el;
            break;
          }
        }
        if (composer) break;
      }

      // Universal fallback for LinkedIn modal dialogs
      if (!composer && (platform === 'linkedin' || platform === 'linkedin_page')) {
        const modal = document.querySelector('div[role="dialog"], div.share-box, div.share-creation-state, div.artdeco-modal, div.editor-content');
        if (modal) {
          const editable = modal.querySelector('div.ql-editor[contenteditable="true"], div.ql-editor, div[contenteditable="true"], textarea');
          if (editable && isElementVisible(editable)) {
            composer = editable;
          }
        }
      }

      if (composer) {
        injectTextIntoComposer(composer, text, platform, forceOverwrite, postData);
        clearInterval(interval);
        return;
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 400);
  }

  /**
   * Helper that dispatches focus, mousedown, mouseup, and click events to trigger web components
   */
  function clickElement(el) {
    if (!el) return false;
    try {
      el.focus();
      const opts = { bubbles: true, cancelable: true, view: window, composed: true };
      el.dispatchEvent(new MouseEvent('mousedown', opts));
      el.dispatchEvent(new MouseEvent('mouseup', opts));
      el.dispatchEvent(new MouseEvent('click', opts));
      if (typeof el.click === 'function') {
        el.click();
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Safely selects node contents ONLY inside the target composer element
   * (Prevents document-level selectAll from selecting the entire webpage)
   */
  function selectComposerContentsOnly(composer) {
    if (!composer) return;
    try {
      composer.focus();
      // Ensure composer has a child block node so selection range is inside a text node
      if (!composer.firstChild) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        composer.appendChild(p);
      }
      const targetChild = composer.querySelector('p, span, [data-text="true"]') || composer.firstChild || composer;
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(targetChild);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {}
  }

  /**
   * Helper to check if text is already cleanly present in X (Twitter) composer
   */
  function isTwitterTextInjected(composer, text) {
    if (!composer || !text) return false;
    const cur = (composer.textContent || '').trim();
    if (!cur) return false;

    // If current text starts with hashtags (pre-filled junk), it is NOT cleanly injected
    if (cur.startsWith('#') && !text.trim().startsWith('#')) {
      return false;
    }

    const target = text.trim();
    if (cur === target) return true;

    const headerSnippet = target.slice(0, 25).trim();
    if (headerSnippet && cur.startsWith(headerSnippet)) {
      return true;
    }
    return false;
  }

  /**
   * Dedicated clean text injector for X (Twitter) Draft.js composer
   */
  function injectTwitterText(composer, text) {
    if (!composer || !text) return;
    try {
      composer.focus();
      const range = document.createRange();
      range.selectNodeContents(composer);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {}

    let execOk = false;
    try {
      execOk = document.execCommand('insertText', false, text);
    } catch (e) {}

    if (!execOk) {
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const pasteEvt = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        composer.dispatchEvent(pasteEvt);
      } catch (e) {}
    }

    try {
      composer.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
      composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } catch (e) {}
  }

  /**
   * Injects formatted text into contenteditable / textarea and triggers React/Vue/DraftJS/Polymer events
   */
  function injectTextIntoComposer(composer, text, platform, forceOverwrite = false, postData = null) {
    if (!composer || !text) return;

    if (platform === 'twitter') {
      const isAlreadyInjected = isTwitterTextInjected(composer, text);
      if (!isAlreadyInjected || forceOverwrite) {
        injectTwitterText(composer, text);
      }
      const imageToAttach = (postData && (postData.imageDataUrl || postData.image || (postData.imagesDataUrls && postData.imagesDataUrls[0]) || (postData.images && postData.images[0]))) || '';
      if (imageToAttach) {
        autoAttachTwitterImage(composer, imageToAttach);
        showAutoFillBadge(platform, 'Auto-filled Tweet & Attached Cover Photo!');
      } else {
        showAutoFillBadge(platform);
      }
      return;
    }

    // Resolve composer to exact contenteditable element if wrapper was passed
    if (!composer.isContentEditable && composer.getAttribute('contenteditable') !== 'true') {
      const childEditable = composer.querySelector('div.ql-editor[contenteditable="true"], div[contenteditable="true"], p[contenteditable="true"], [contenteditable="true"], textarea');
      if (childEditable) {
        composer = childEditable;
      }
    }

    const trimmedText = text.trim();
    const currentText = (composer.textContent || '').trim();

    // If composer already has the target text injected, skip
    if (!forceOverwrite && isTextFullyInjected(currentText, trimmedText)) {
      return;
    }

    // Ensure element is editable using standard isContentEditable property or element type
    const isEditable = composer.isContentEditable || 
                       composer.getAttribute('contenteditable') === 'true' || 
                       composer.getAttribute('contenteditable') === '' || 
                       composer.tagName === 'TEXTAREA' || 
                       composer.tagName === 'INPUT' || 
                       composer.classList.contains('ql-editor') ||
                       composer.classList.contains('editor-content');
    if (!isEditable) return;

    try {
      composer.focus();
      if (typeof composer.click === 'function') {
        composer.click();
      }

      // Always select composer contents first so partial pre-filled title gets cleanly replaced
      selectComposerContentsOnly(composer);

      // Method A: Try native document.execCommand('insertText') (works best in Chrome/Brave rich-text editors)
      let execSuccess = false;
      try {
        execSuccess = document.execCommand('insertText', false, text);
      } catch (ie) {}

      // Method B: Try Clipboard paste event synthesis if execCommand failed or didn't complete text
      if (!execSuccess || !isTextFullyInjected((composer.textContent || '').trim(), trimmedText)) {
        try {
          const dt = new DataTransfer();
          dt.setData('text/plain', text);
          const pasteEvt = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
          });
          composer.dispatchEvent(pasteEvt);
        } catch (pe) {}
      }

      // Method C: Direct DOM insertion fallback (Quill / DraftJS / ProseMirror paragraphs)
      if (!isTextFullyInjected((composer.textContent || '').trim(), trimmedText)) {
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
        try {
          composer.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
          composer.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
        } catch (e) {}
      }

      // Remove Quill placeholder overlay if present inside modal
      const modal = composer.closest('div[role="dialog"], div.artdeco-modal, div.share-box, div.share-creation-state') || document;
      const placeholder = modal.querySelector('.ql-placeholder, [data-placeholder]');
      if (placeholder && placeholder !== composer) {
        placeholder.style.display = 'none';
      }

      // Clear any selection ranges so entire page or text is never left highlighted
      try {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      } catch (e) {}

      // Comprehensive event dispatching for Draft.js, ProseMirror & Quill (LinkedIn, FB, Threads)
      try {
        composer.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
      } catch (ie) {
        composer.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }
      composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      composer.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter' }));
      composer.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: ' ', code: 'Space' }));
    } catch (e) {
      composer.innerText = text;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (platform === 'linkedin' || platform === 'linkedin_page') {
      const imageToAttach = (postData && (postData.imageDataUrl || postData.image)) || '';
      if (imageToAttach) {
        autoAttachLinkedInImage(composer, imageToAttach);
      }
      const label = platform === 'linkedin_page' ? 'Auto-filled LinkedIn Page Post & Attached Image!' : 'Auto-filled LinkedIn Post & Attached Image!';
      showAutoFillBadge(platform, label);
    } else {
      showAutoFillBadge(platform);
    }
  }

  /**
   * Automatically attaches a single primary image to X (Twitter) tweet composer
   */
  async function autoAttachTwitterImage(composer, imageSource) {
    if (!imageSource) return;
    const src = Array.isArray(imageSource) ? imageSource[0] : imageSource;
    if (!src) return;

    // Helper to check if media is ALREADY attached to X composer DOM
    const hasExistingTwitterMedia = () => {
      const targetScope = composer ? (composer.closest('div[role="dialog"]') || composer.closest('div[data-testid="tweetTextarea_0_Group"]') || document.body) : document.body;
      return !!(
        targetScope.querySelector('div[data-testid="attachments"]') ||
        targetScope.querySelector('div[data-testid="removeMedia"]') ||
        targetScope.querySelector('button[aria-label*="Remove" i]') ||
        targetScope.querySelector('div[data-testid="tweetPhoto"]') ||
        targetScope.querySelector('div[aria-label="Media"]')
      );
    };

    // If composer already has attached media, do not attempt attach again
    if (hasExistingTwitterMedia()) return;

    let blob = null;
    if (src.startsWith('data:')) {
      blob = dataUrlToBlob(src);
    } else if (src.startsWith('http')) {
      try {
        const response = await fetch(src);
        if (response.ok) blob = await response.blob();
      } catch (e) {}
    }

    if (!blob) return;

    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const file = new File([blob], `product-cover.${ext}`, { type: blob.type || 'image/jpeg' });
    const dt = new DataTransfer();
    dt.items.add(file);

    // Target X (Twitter) hidden media file inputs (input[data-testid="fileInput"])
    const attachToTwitterFileInputs = () => {
      if (hasExistingTwitterMedia()) return;
      const fileInputs = document.querySelectorAll(
        'input[data-testid="fileInput"], input[type="file"][accept*="image"], input[type="file"]'
      );
      for (const input of fileInputs) {
        try {
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set;
          if (nativeSetter) {
            nativeSetter.call(input, dt.files);
          } else {
            input.files = dt.files;
          }
          input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        } catch (e) {}
      }
    };

    attachToTwitterFileInputs();
    setTimeout(() => { if (!hasExistingTwitterMedia()) attachToTwitterFileInputs(); }, 500);
  }

  /**
   * Renders a floating helper assistant on X (Twitter)
   */
  function renderTwitterFloatingHelper(postData) {
    const existing = document.getElementById('socialshare-twitter-helper');
    if (existing) existing.remove();

    const helper = document.createElement('div');
    helper.id = 'socialshare-twitter-helper';
    helper.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 310px !important;
      background: #12151C !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      border-radius: 12px !important;
      padding: 14px !important;
      color: #F1F5F9 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      box-shadow: 0 12px 40px rgba(0,0,0,0.85), 0 0 1px rgba(255, 255, 255, 0.3) !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      isolation: isolate !important;
      animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
    `;

    const titleSnippet = postData.title ? (postData.title.slice(0, 40) + (postData.title.length > 40 ? '...' : '')) : 'Tweet Post';
    const textToUse = postData.text || buildFallbackPostText(postData);
    const imgSource = (postData && (postData.imageDataUrl || postData.image || (postData.imagesDataUrls && postData.imagesDataUrls[0]) || (postData.images && postData.images[0]))) || '';

    helper.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 600; font-size: 12.5px; color: #F1F5F9; display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#F1F5F9"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          𝕏 (Twitter) Auto-Publisher
        </span>
        <button id="close-twitter-helper-btn" style="background: none; border: none; color: #64748B; cursor: pointer; font-size: 16px; padding: 0 4px;">&times;</button>
      </div>

      <p style="font-size: 11px; color: #94A3B8; margin: 0 0 10px 0; line-height: 1.35;">
        ${escapeHtml(titleSnippet)}
      </p>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="twitter-autofill-btn" style="background: #2563EB; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); padding: 7px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Auto-Fill Tweet & Attach Photo
        </button>
        ${imgSource ? `
          <button id="twitter-attach-img-btn" style="background: #1A1D27; border: 1px solid rgba(255, 255, 255, 0.1); color: #E2E8F0; padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Re-Attach Cover Photo
          </button>
        ` : ''}
        <button id="twitter-copy-btn" style="background: #141720; border: 1px solid rgba(255, 255, 255, 0.08); color: #94A3B8; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy Tweet Text
        </button>
      </div>
    `;

    (document.fullscreenElement || document.documentElement || document.body).appendChild(helper);

    helper.querySelector('#close-twitter-helper-btn').addEventListener('click', () => helper.remove());

    helper.querySelector('#twitter-autofill-btn').addEventListener('click', () => {
      attemptComposerInjection('twitter', textToUse, postData);
    });

    const attachBtn = helper.querySelector('#twitter-attach-img-btn');
    if (attachBtn) {
      attachBtn.addEventListener('click', () => {
        const composer = document.querySelector('div[data-testid="tweetTextarea_0"], div[role="textbox"]');
        autoAttachTwitterImage(composer, imgSource);
      });
    }

    helper.querySelector('#twitter-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(textToUse);
      helper.querySelector('#twitter-copy-btn').textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        helper.querySelector('#twitter-copy-btn').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Tweet Text`;
      }, 2000);
    });
  }

  /**
   * Helper that finds the "Start a post" or "+ Create" button on LinkedIn Page Admin or Feed
   */
  function findLinkedInTriggerButton() {
    // If active text editor composer is already open, no trigger button needed
    const activeComposer = document.querySelector('div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]');
    if (activeComposer && isElementVisible(activeComposer)) return null;

    // Check inside open modal overlays if present
    const openModals = document.querySelectorAll('div[role="dialog"], div.artdeco-modal');
    for (const modal of openModals) {
      if (modal.querySelector('div[contenteditable="true"]')) return null;

      const modalOptions = modal.querySelectorAll('button, li, div[role="button"], div[role="menuitem"], a, span, p, h3');
      for (const el of modalOptions) {
        const text = (el.textContent || '').trim().toLowerCase();
        if (text.includes('schedule') || text.includes('event') || text.includes('article') || text.includes('hiring') || text.includes('ad')) continue;
        if (text.includes('start a post') || text.includes('create a post') || text.startsWith('start a')) {
          return el.closest('button, li, div[role="button"], div[role="menuitem"], a') || el;
        }
      }

      // If modal is an empty "Editor" header overlay (with no options and no composer), close it so main feed trigger can be clicked
      const modalTitle = (modal.textContent || '').trim().toLowerCase();
      if (modalTitle.includes('editor') && !modalTitle.includes('post') && modalOptions.length <= 4) {
        const dismissBtn = modal.querySelector('button[aria-label*="Dismiss" i], button[aria-label*="Close" i], button.artdeco-modal__dismiss');
        if (dismissBtn) clickElement(dismissBtn);
      }
    }

    const selectors = [
      'button[aria-label*="Start a post" i]',
      'button.share-mb__button',
      '.share-box-feed-entry__trigger',
      'span.share-box-feed-entry__trigger',
      'div.share-box-feed-entry__trigger',
      'div.share-box-feed-entry',
      'div.share-box-feed-entry button',
      'button.artdeco-button[aria-label*="Start a post" i]',
      '.org-admin-page-posts__create-post-btn',
      'button.org-admin-header__create-btn',
      'button[data-view-name="org-admin-page-posts-create-post-btn"]',
      'button[aria-label*="Create" i]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.tagName !== 'A' && isElementVisible(el)) {
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (!aria.includes('schedule') && !aria.includes('calendar') && !aria.includes('event')) {
          return el;
        }
      }
    }

    // Text search fallback for buttons ONLY (never <a> navigation links)
    const candidates = document.querySelectorAll('button, div[role="button"], div.share-box-feed-entry, span.share-box-feed-entry__trigger, div.share-box-feed-entry__trigger');
    for (const el of candidates) {
      if (el.tagName !== 'A' && isElementVisible(el)) {
        const text = (el.textContent || '').trim().toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (aria.includes('schedule') || text.includes('schedule') || aria.includes('event')) continue;
        if (text.includes('start a post') || text.includes('create a post') || text === '+ create' || text.startsWith('+ create')) {
          return el;
        }
      }
    }

    return null;
  }

  /**
   * Auto-triggers LinkedIn post dialog on feed or company page admin if not open
   */
  function handleLinkedInAutoTrigger() {
    let hasClicked = false;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;

      // Check if active composer is open
      const activeComposer = document.querySelector(
        'div.ql-editor[contenteditable="true"], div.ql-editor, div[contenteditable="true"][role="textbox"], div[contenteditable="true"]'
      );
      if (activeComposer && isElementVisible(activeComposer)) {
        clearInterval(interval);
        return;
      }

      if (!hasClicked) {
        const triggerBtn = findLinkedInTriggerButton();
        if (triggerBtn) {
          hasClicked = true;
          clickElement(triggerBtn);

          // Polling loop to select "Start a post" inside dropdown menu or Create modal
          let menuAttempts = 0;
          const menuInterval = setInterval(() => {
            menuAttempts++;
            const candidates = document.querySelectorAll(
              'div[role="menu"] [role="menuitem"], div.artdeco-dropdown__content *, div.artdeco-dropdown__item, ul.artdeco-dropdown__content li, div[role="dialog"] *, button, span, li'
            );
            let itemClicked = false;
            for (const opt of candidates) {
              const optText = (opt.textContent || '').trim().toLowerCase();
              if (optText.includes('schedule') || optText.includes('event') || optText.includes('article') || optText.includes('hiring')) continue;
              if (optText.includes('start a post') || optText.includes('create a post') || optText === 'post' || optText.startsWith('start a')) {
                const clickable = opt.closest('li, div[role="menuitem"], button, div.artdeco-dropdown__item, a') || opt;
                clickElement(clickable);
                itemClicked = true;
                break;
              }
            }

            const openComposer = document.querySelector('div.ql-editor[contenteditable="true"], div[contenteditable="true"]');
            if (itemClicked || openComposer || menuAttempts >= 8) {
              clearInterval(menuInterval);
            }
          }, 200);
        }
      }

      if (attempts >= 15 || (hasClicked && attempts >= 6)) {
        clearInterval(interval);
      }
    }, 400);
  }

  /**
   * Renders a floating helper assistant on LinkedIn
   */
  function renderLinkedInFloatingHelper(postData) {
    const existing = document.getElementById('socialshare-linkedin-helper');
    if (existing) existing.remove();

    const path = window.location.pathname.toLowerCase();
    const isCompanyPage = path.includes('/company/') || path.includes('/school/') || path.includes('/admin/feed');

    const helper = document.createElement('div');
    helper.id = 'socialshare-linkedin-helper';
    helper.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 320px !important;
      background: #12151C !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      border-radius: 12px !important;
      padding: 14px !important;
      color: #F1F5F9 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      box-shadow: 0 12px 40px rgba(0,0,0,0.85), 0 0 1px rgba(255, 255, 255, 0.3) !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      isolation: isolate !important;
      animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
    `;

    const titleSnippet = postData.title ? (postData.title.slice(0, 40) + (postData.title.length > 40 ? '...' : '')) : 'Article Post';
    const textToUse = postData.text || `${postData.title || ''}\n\n${postData.description || ''}`;

    const badgeLabel = isCompanyPage ? 'LinkedIn Page Admin' : 'LinkedIn Personal Feed';
    const badgeColor = isCompanyPage ? '#38BDF8' : '#0A66C2';

    const imgSource = (postData && (postData.imageDataUrl || postData.image)) || '';

    helper.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 600; font-size: 12.5px; color: #F1F5F9; display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
          LinkedIn Auto-Publisher
        </span>
        <span style="font-size: 10px; font-weight: 600; background: ${badgeColor}22; color: ${badgeColor}; border: 1px solid ${badgeColor}55; padding: 2px 6px; border-radius: 4px;">
          ${badgeLabel}
        </span>
        <button id="close-linkedin-helper-btn" style="background: none; border: none; color: #64748B; cursor: pointer; font-size: 16px; padding: 0 4px;">&times;</button>
      </div>

      <p style="font-size: 11px; color: #94A3B8; margin: 0 0 8px 0; line-height: 1.35;">
        ${escapeHtml(titleSnippet)}
      </p>

      ${!isCompanyPage ? `
        <div style="background: rgba(56, 189, 248, 0.08); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 7px 9px; margin-bottom: 8px; font-size: 10.5px; color: #7DD3FC; line-height: 1.35;">
          💡 <strong>Post to a Page:</strong> In the composer, click your author profile dropdown at top -> Select your <strong>Company Page</strong>!
        </div>
      ` : ''}

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button id="linkedin-trigger-post-btn" style="background: #0A66C2; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); padding: 7px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          Start Post & Auto-Fill
        </button>

        ${imgSource ? `
          <button id="linkedin-attach-img-btn" style="background: #1E293B; border: 1px solid rgba(255, 255, 255, 0.1); color: #E2E8F0; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            Attach Cover Photo
          </button>
          <button id="linkedin-download-img-btn" style="background: #141720; border: 1px solid rgba(255, 255, 255, 0.08); color: #38BDF8; padding: 5px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Image File
          </button>
        ` : ''}

        ${postData.url ? `
          <button id="linkedin-comment-btn" style="background: #059669; color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            Auto-Fill Comment (Link)
          </button>
        ` : ''}

        <button id="linkedin-copy-btn" style="background: #141720; border: 1px solid rgba(255, 255, 255, 0.08); color: #94A3B8; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy Full Post Text
        </button>
      </div>
    `;

    (document.fullscreenElement || document.documentElement || document.body).appendChild(helper);

    helper.querySelector('#close-linkedin-helper-btn').addEventListener('click', () => helper.remove());

    helper.querySelector('#linkedin-trigger-post-btn').addEventListener('click', () => {
      const activeComposer = document.querySelector('div.ql-editor[contenteditable="true"], div[contenteditable="true"][role="textbox"], div[contenteditable="true"]');
      if (!activeComposer || !isElementVisible(activeComposer)) {
        const triggerBtn = findLinkedInTriggerButton();
        if (triggerBtn) {
          clickElement(triggerBtn);
        }
        handleLinkedInAutoTrigger();
      }
      attemptComposerInjection(isCompanyPage ? 'linkedin_page' : 'linkedin', textToUse, postData, true);
    });

    const attachImgBtn = helper.querySelector('#linkedin-attach-img-btn');
    if (attachImgBtn) {
      attachImgBtn.addEventListener('click', () => {
        const modal = document.querySelector('div[role="dialog"], div.share-box, div.artdeco-modal, div.share-creation-state');
        const composer = modal ? modal.querySelector('div.ql-editor[contenteditable="true"], div[contenteditable="true"]') : document.querySelector('div.ql-editor[contenteditable="true"]');
        autoAttachLinkedInImage(composer, imgSource);
      });
    }

    const commentBtn = helper.querySelector('#linkedin-comment-btn');
    if (commentBtn) {
      commentBtn.addEventListener('click', () => {
        const urlToComment = postData.url || '';
        if (!urlToComment) return;

        copyToClipboard(urlToComment, 'Article URL copied for comment!');

        // Find active comment input box on LinkedIn
        const commentBoxSelectors = [
          'div.comments-comment-box__content-editor[contenteditable="true"]',
          'div.comments-comment-texteditor div[contenteditable="true"]',
          'div[contenteditable="true"][aria-label*="comment" i]',
          'div[contenteditable="true"][data-placeholder*="comment" i]',
          'div[contenteditable="true"][aria-label*="add a comment" i]',
          'textarea[placeholder*="comment" i]',
          'div.comments-comment-box div[contenteditable="true"]'
        ];

        let commentBox = null;
        for (const sel of commentBoxSelectors) {
          const el = document.querySelector(sel);
          if (el && isElementVisible(el)) {
            commentBox = el;
            break;
          }
        }

        if (commentBox) {
          injectTextIntoComposer(commentBox, urlToComment, 'linkedin', true, postData);
          showAutoFillBadge('linkedin', 'Auto-filled Article URL in Comment Box!');
        } else {
          showAutoFillBadge('linkedin', 'Article URL Copied! Click comment box & press Ctrl+V');
        }
      });
    }

    const downloadImgBtn = helper.querySelector('#linkedin-download-img-btn');
    if (downloadImgBtn) {
      downloadImgBtn.addEventListener('click', async () => {
        let blob = null;
        if (imgSource.startsWith('data:')) {
          blob = dataUrlToBlob(imgSource);
        } else if (imgSource.startsWith('http')) {
          try {
            const res = await fetch(imgSource);
            if (res.ok) blob = await res.blob();
          } catch (e) {}
        }
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'article-cover.jpg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        downloadImgBtn.textContent = 'Downloaded!';
        setTimeout(() => {
          downloadImgBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download Image File`;
        }, 2000);
      });
    }

    helper.querySelector('#linkedin-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(textToUse);
      helper.querySelector('#linkedin-copy-btn').textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        helper.querySelector('#linkedin-copy-btn').innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Full Post Text`;
      }, 2000);
    });
  }

  /**
   * Helper to convert Base64 Data URL to Blob without network fetch
   */
  function dataUrlToBlob(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    try {
      const arr = dataUrl.split(',');
      const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      return null;
    }
  }

  /**
   * Automatically attaches an image to LinkedIn post composer
   */
  async function autoAttachLinkedInImage(composer, imageSource) {
    if (!imageSource) return;

    let blob = null;
    if (imageSource.startsWith('data:')) {
      blob = dataUrlToBlob(imageSource);
    } else if (imageSource.startsWith('http')) {
      try {
        if (chromeApi && chromeApi.runtime && chromeApi.runtime.sendMessage) {
          blob = await new Promise((resolve) => {
            chromeApi.runtime.sendMessage({ action: 'FETCH_IMAGE_BASE64', url: imageSource }, (res) => {
              if (res && res.success && res.dataUrl) {
                resolve(dataUrlToBlob(res.dataUrl));
              } else {
                resolve(null);
              }
            });
          });
        }
        if (!blob) {
          const response = await fetch(imageSource);
          if (response.ok) blob = await response.blob();
        }
      } catch (e) {}
    }

    if (!blob) return;

    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const file = new File([blob], `article-cover.${ext}`, { type: blob.type || 'image/jpeg' });
    const dt = new DataTransfer();
    dt.items.add(file);

    if (!composer) {
      const modal = document.querySelector('div[role="dialog"], div.artdeco-modal, div.share-box, div.share-creation-state');
      composer = modal ? modal.querySelector('div.ql-editor[contenteditable="true"], div[contenteditable="true"]') : document.querySelector('div.ql-editor[contenteditable="true"]');
    }

    // Synthesize paste event directly on composer (no local file picker popup)
    if (composer) {
      composer.focus();
      try {
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        composer.dispatchEvent(pasteEvent);
      } catch (e) {}
    }

    // Method 2: Target LinkedIn hidden/visible file inputs
    const attachToInputs = () => {
      const fileInputs = document.querySelectorAll(
        'input[type="file"][accept*="image"], input[type="file"].share-creation-state__file-input, input[type="file"]'
      );
      for (const input of fileInputs) {
        try {
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set;
          if (nativeSetter) {
            nativeSetter.call(input, dt.files);
          } else {
            input.files = dt.files;
          }
          input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        } catch (e) {}
      }
    };

    attachToInputs();
    setTimeout(attachToInputs, 400);
    setTimeout(attachToInputs, 1000);

    // Method 3: Automatically advance media editor if LinkedIn opens photo preview ("Next" / "Done")
    let advanceAttempts = 0;
    const advanceInterval = setInterval(() => {
      advanceAttempts++;
      const nextBtn = document.querySelector(
        'button.share-box-footer__primary-btn, button[aria-label="Next"], button[aria-label="Done"], button[aria-label="Save"], .media-editor__done-btn, .image-editor-toolbar__action-button'
      );
      if (nextBtn && nextBtn.offsetParent !== null) {
        nextBtn.click();
        clearInterval(advanceInterval);
      }
      if (advanceAttempts >= 12) {
        clearInterval(advanceInterval);
      }
    }, 350);
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
      background: #12151C;
      border: 1px solid #3B82F6;
      color: #F1F5F9;
      padding: 8px 15px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.65);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: fadeInSlide 0.25s ease-out;
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

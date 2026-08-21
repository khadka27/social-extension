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
   * Polls DOM to find active composer element on the current platform
   */
  function attemptComposerInjection(platform, text, postData) {
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
            injectTextIntoComposer(titleEl, postData.title, platform, true);
          }
          titleUpdated = (titleEl.textContent && titleEl.textContent.trim() === postData.title.trim());
        }

        if (descEl && postData) {
          // Format YouTube description: summary + article URL + hashtags (without repeating the title at the top)
          const descToInject = postData.description
            ? [
                postData.description,
                postData.url ? `Read full article: ${postData.url}` : '',
                postData.tags && postData.tags.length ? postData.tags.join(' ') : ''
              ].filter(Boolean).join('\n\n')
            : (postData.text || text);

          const currentDesc = descEl.textContent ? descEl.textContent.trim() : '';
          if (currentDesc !== descToInject.trim()) {
            injectTextIntoComposer(descEl, descToInject, platform, true);
          }
          descUpdated = (descEl.textContent && descEl.textContent.trim().length > 0);
        }

        if (titleUpdated && descUpdated) {
          clearInterval(interval);
          chrome.storage.local.remove(['pendingSocialPost', 'pendingFacebookPost']);
          return;
        }
      }

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
    }, 600);
  }

  /**
   * Injects formatted text into contenteditable / textarea and triggers React/Vue/DraftJS/Polymer events
   */
  function injectTextIntoComposer(composer, text, platform, forceOverwrite = false) {
    if (!composer || !text) return;

    if (composer.textContent && composer.textContent.trim() === text.trim()) {
      return;
    }

    if (!forceOverwrite && composer.textContent && composer.textContent.trim().length > 15) {
      return;
    }

    composer.focus();

    try {
      // 1. Select all & Delete existing text (e.g. video filename placeholder on YouTube)
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);

      // 2. Insert new clean text
      const success = document.execCommand('insertText', false, text);

      if (!success || composer.textContent.trim() !== text.trim()) {
        // Fallback insertion
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
      }

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

    if (platform === 'linkedin') {
      if (postData && postData.image) {
        autoAttachLinkedInImage(composer, postData.image);
      }
      showAutoFillBadge(platform, 'Auto-filled LinkedIn Post & Attached Image!');
    } else {
      showAutoFillBadge(platform);
    }
  }

  /**
   * Automatically attaches an image to LinkedIn post composer
   */
  async function autoAttachLinkedInImage(composer, imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('http')) return;

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return;
      const blob = await response.blob();
      const file = new File([blob], 'article-preview.jpg', { type: blob.type || 'image/jpeg' });

      const dt = new DataTransfer();
      dt.items.add(file);

      // Method 1: Synthesize paste event directly on composer
      if (composer) {
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
        composer.dispatchEvent(pasteEvent);
      }

      // Method 2: Target LinkedIn hidden file input
      setTimeout(() => {
        const fileInputs = document.querySelectorAll('input[type="file"][accept*="image"], input[type="file"].share-creation-state__file-input, input[type="file"]');
        for (const input of fileInputs) {
          try {
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            break;
          } catch (e) {}
        }
      }, 500);
    } catch (e) {
      // Fallback if CORS prevents direct fetch
    }
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

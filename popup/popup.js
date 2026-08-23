/**
 * SocialShare - Popup UI Controller
 * Orchestrates live tab metadata extraction, external URL parsing,
 * visual note card generation, sliding carousel video generation,
 * auto-posting, and 1-click social sharing.
 */

(function () {
  'use strict';

  // State
  const state = {
    title: '',
    description: '',
    url: '',
    cleanUrl: '',
    image: '',
    images: [],
    tags: [],
    siteName: '',
    author: '',
    template: 'standard',

    // Visual Note Card State
    cardTheme: 'notebook',
    cardHook: 'No hints. No clue. Just pure logic...!',
    cardText: '',
    cardFooter: 'No winner yet • What\'s your answer?',
    activeTabMode: 'standard',

    // Carousel Video State
    videoRatio: '9:16',
    videoSpeed: 2.5,
    generatedVideoBlob: null,
    generatedVideoUrl: null,
    generatedVideoDataUrl: null,
    selectedVideoImages: []
  };

  // DOM Elements
  const elements = {
    mainContent: document.getElementById('main-content'),
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    toggleUrlBtn: document.getElementById('toggle-url-input-btn'),
    urlDrawer: document.getElementById('url-drawer'),
    customUrlInput: document.getElementById('custom-url-input'),
    fetchUrlBtn: document.getElementById('fetch-url-btn'),
    urlSpinner: document.getElementById('url-spinner'),

    // Tabs
    tabStandardBtn: document.getElementById('tab-standard-btn'),
    tabVisualCardBtn: document.getElementById('tab-visual-card-btn'),
    tabCarouselVideoBtn: document.getElementById('tab-carousel-video-btn'),
    standardPreviewPanel: document.getElementById('standard-preview-panel'),
    visualCardPanel: document.getElementById('visual-card-panel'),
    carouselVideoPanel: document.getElementById('carousel-video-panel'),

    // Preview Elements
    siteBadge: document.getElementById('site-badge'),
    postImage: document.getElementById('post-image'),
    noImagePlaceholder: document.getElementById('no-image-placeholder'),
    imageCount: document.getElementById('image-count'),
    selectImageBtn: document.getElementById('select-image-btn'),
    downloadImageBtn: document.getElementById('download-image-btn'),
    imageGalleryDrawer: document.getElementById('image-gallery-drawer'),
    galleryGrid: document.getElementById('gallery-grid'),
    closeGalleryBtn: document.getElementById('close-gallery-btn'),
    customImageUrlInput: document.getElementById('custom-image-url-input'),
    applyCustomImgBtn: document.getElementById('apply-custom-img-btn'),

    // Input Fields
    postTitle: document.getElementById('post-title'),
    titleCharCount: document.getElementById('title-char-count'),
    makeUniqueBtn: document.getElementById('make-unique-btn'),
    postDescription: document.getElementById('post-description'),
    descCharCount: document.getElementById('desc-char-count'),
    postUrl: document.getElementById('post-url'),
    cleanUrlBtn: document.getElementById('clean-url-btn'),
    copyUrlBtn: document.getElementById('copy-url-btn'),

    // Tags & Templates
    tagsContainer: document.getElementById('tags-container'),
    newTagInput: document.getElementById('new-tag-input'),
    addTagBtn: document.getElementById('add-tag-btn'),
    templateChips: document.querySelectorAll('.chip[data-template]'),

    // Visual Note Card Elements
    noteCardCanvas: document.getElementById('note-card-canvas'),
    cardThemeChips: document.querySelectorAll('.card-theme-chip'),
    cardHookInput: document.getElementById('card-hook-input'),
    cardTextInput: document.getElementById('card-text-input'),
    cardFooterInput: document.getElementById('card-footer-input'),
    downloadNoteCardBtn: document.getElementById('download-note-card-btn'),
    copyNoteCardBtn: document.getElementById('copy-note-card-btn'),

    // Carousel Video Elements
    carouselVideoPlayer: document.getElementById('carousel-video-player'),
    carouselVideoPlaceholder: document.getElementById('carousel-video-placeholder'),
    videoProgressOverlay: document.getElementById('video-progress-overlay'),
    videoProgressFill: document.getElementById('video-progress-fill'),
    videoProgressText: document.getElementById('video-progress-text'),
    videoImageCountBadge: document.getElementById('video-image-count-badge'),
    videoSelectedCount: document.getElementById('video-selected-count'),
    videoImagesSelectorGrid: document.getElementById('video-images-selector-grid'),
    videoSelectAllBtn: document.getElementById('video-select-all-btn'),
    videoSelectNoneBtn: document.getElementById('video-select-none-btn'),
    videoCustomImageInput: document.getElementById('video-custom-image-input'),
    videoAddCustomImageBtn: document.getElementById('video-add-custom-image-btn'),
    videoRatioChips: document.querySelectorAll('.video-ratio-chip'),
    videoSpeedChips: document.querySelectorAll('.video-speed-chip'),
    generateVideoBtn: document.getElementById('generate-video-btn'),
    generateVideoBtnText: document.getElementById('generate-video-btn-text'),
    downloadVideoBtn: document.getElementById('download-video-btn'),
    videoDragBadge: document.getElementById('video-drag-badge'),
    videoPostTargets: document.getElementById('video-post-targets'),
    postVideoTiktokBtn: document.getElementById('post-video-tiktok-btn'),
    postVideoShortsBtn: document.getElementById('post-video-shorts-btn'),

    // Auto-Post Elements
    autoPostTriggerBtn: document.getElementById('auto-post-trigger-btn'),
    toggleAutoPostSettingsBtn: document.getElementById('toggle-autopost-settings-btn'),
    autoPostSettingsDrawer: document.getElementById('autopost-settings-drawer'),
    autoPlatChecks: document.querySelectorAll('.auto-plat-check'),
    selectAllPlatformsBtn: document.getElementById('select-all-platforms-btn'),
    selectNonePlatformsBtn: document.getElementById('select-none-platforms-btn'),
    autoRandomizeCheck: document.getElementById('auto-randomize-check'),
    autoPostOnOpenCheck: document.getElementById('auto-post-on-open-check'),
    linkedinPageInput: document.getElementById('linkedin-page-input'),

    // Copy & Social Buttons
    copyPostBtn: document.getElementById('copy-post-btn'),
    copyMarkdownBtn: document.getElementById('copy-markdown-btn'),
    copyHtmlBtn: document.getElementById('copy-html-btn'),
    socialButtons: document.querySelectorAll('.social-btn'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
  };

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupEventListeners();
    await loadAutoPostPreferences();
    await loadCachedVideo();
    await checkPendingOrActiveTab();
  }

  /**
   * Load saved Auto-Post preferences
   */
  async function loadAutoPostPreferences() {
    try {
      const stored = await chrome.storage.local.get(['autoPostPlatforms', 'autoRandomize', 'autoPostOnOpen', 'linkedinPageTarget']);
      if (stored.autoPostPlatforms && Array.isArray(stored.autoPostPlatforms)) {
        elements.autoPlatChecks.forEach(chk => {
          const plat = chk.getAttribute('data-platform');
          chk.checked = stored.autoPostPlatforms.includes(plat);
        });
      }
      if (typeof stored.autoRandomize === 'boolean' && elements.autoRandomizeCheck) {
        elements.autoRandomizeCheck.checked = stored.autoRandomize;
      }
      if (typeof stored.autoPostOnOpen === 'boolean' && elements.autoPostOnOpenCheck) {
        elements.autoPostOnOpenCheck.checked = stored.autoPostOnOpen;
      }
      if (stored.linkedinPageTarget && elements.linkedinPageInput) {
        elements.linkedinPageInput.value = stored.linkedinPageTarget;
      }
    } catch (e) {}
  }

  /**
   * Save Auto-Post preferences
   */
  function saveAutoPostPreferences() {
    try {
      const selectedPlatforms = Array.from(elements.autoPlatChecks)
        .filter(c => c.checked)
        .map(c => c.getAttribute('data-platform'));
      const autoRandomize = elements.autoRandomizeCheck ? elements.autoRandomizeCheck.checked : true;
      const autoPostOnOpen = elements.autoPostOnOpenCheck ? elements.autoPostOnOpenCheck.checked : false;
      const linkedinPageTarget = elements.linkedinPageInput ? elements.linkedinPageInput.value.trim() : '';
      chrome.storage.local.set({
        autoPostPlatforms: selectedPlatforms,
        autoRandomize: autoRandomize,
        autoPostOnOpen: autoPostOnOpen,
        linkedinPageTarget: linkedinPageTarget
      });
    } catch (e) {}
  }

  /**
   * Checks if there is a pending URL from context menu, or extracts from current active tab
   */
  async function checkPendingOrActiveTab() {
    try {
      const storage = await chrome.storage.local.get(['pendingShareUrl']);
      if (storage && storage.pendingShareUrl) {
        // Clear pending URL and fetch metadata
        await chrome.storage.local.remove('pendingShareUrl');
        elements.customUrlInput.value = storage.pendingShareUrl;
        elements.urlDrawer.classList.remove('hidden');
        elements.toggleUrlBtn.classList.add('active');
        fetchExternalUrlMetadata(storage.pendingShareUrl);
        return;
      }
    } catch (e) {}

    // Extract from active tab
    extractFromActiveTab();
  }

  /**
   * Extracts metadata from the active browser tab
   */
  async function extractFromActiveTab() {
    showLoading();
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id || !activeTab.url) {
        throw new Error('No active browser tab found.');
      }

      // Check if URL is inspectable (e.g. not chrome:// or edge://)
      if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:')) {
        showError('Cannot extract metadata from browser internal pages. Please open a blog or website article.');
        return;
      }

      // Try sending message to content script
      chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_METADATA' }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          // Attempt dynamic injection if content script wasn't ready
          try {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['scripts/extractor.js', 'scripts/content.js']
            });

            // Retry after injection
            chrome.tabs.sendMessage(activeTab.id, { action: 'EXTRACT_METADATA' }, (retryResponse) => {
              if (retryResponse && retryResponse.success && retryResponse.data) {
                populateData(retryResponse.data);
              } else {
                // Fallback: use tab title and URL directly
                populateData({
                  title: activeTab.title || 'Untitled Blog Post',
                  url: activeTab.url,
                  cleanUrl: activeTab.url.split('?')[0],
                  description: '',
                  image: activeTab.favIconUrl || '',
                  images: [],
                  tags: []
                });
              }
            });
          } catch (injectErr) {
            populateData({
              title: activeTab.title || 'Untitled Article',
              url: activeTab.url,
              cleanUrl: activeTab.url.split('?')[0],
              description: '',
              image: '',
              images: [],
              tags: []
            });
          }
        } else {
          populateData(response.data);
        }
      });
    } catch (err) {
      showError(err.message || 'Failed to extract metadata.');
    }
  }

  /**
   * Fetches metadata for an external URL via background service worker
   */
  async function fetchExternalUrlMetadata(url) {
    if (!url || !url.trim()) {
      showToast('Please enter a valid URL');
      return;
    }

    let validUrl = url.trim();
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = 'https://' + validUrl;
    }

    elements.urlSpinner.classList.remove('hidden');
    elements.fetchUrlBtn.querySelector('.btn-text').textContent = 'Fetching...';
    showLoading();

    chrome.runtime.sendMessage({ action: 'FETCH_EXTERNAL_METADATA', url: validUrl }, (response) => {
      elements.urlSpinner.classList.add('hidden');
      elements.fetchUrlBtn.querySelector('.btn-text').textContent = 'Extract';

      if (response && response.success && response.data) {
        populateData(response.data);
        showToast('Metadata extracted successfully.');
      } else {
        showError((response && response.error) || 'Could not fetch external URL metadata.');
      }
    });
  }

  /**
   * Populates extension state and UI with extracted metadata
   */
  function populateData(data) {
    state.title = data.title || '';
    state.description = data.description || '';
    state.url = data.url || '';
    state.cleanUrl = data.cleanUrl || (typeof SocialExtractor !== 'undefined' ? SocialExtractor.cleanUrl(data.url) : data.url);
    state.image = data.image || '';
    state.images = data.images && data.images.length > 0 ? data.images : (data.image ? [data.image] : []);
    state.tags = data.tags || [];
    state.siteName = data.siteName || '';
    state.author = data.author || '';

    // Update UI fields
    elements.postTitle.value = state.title;
    elements.postDescription.value = state.description;
    elements.postUrl.value = state.url;
    elements.siteBadge.textContent = state.siteName || (state.url ? new URL(state.url).hostname : 'Article');

    // Update Note Card text default
    elements.cardTextInput.value = state.description || state.title || '';
    state.cardText = elements.cardTextInput.value;

    // Update Video badge & Image Selector
    state.selectedVideoImages = [...state.images];
    renderVideoImageSelector();

    updateCharCounts();
    updateImagePreview();
    renderGalleryThumbnails();
    renderTags();
    renderNoteCard();

    showContent();

    // Auto-Post on Open trigger if enabled
    if (elements.autoPostOnOpenCheck && elements.autoPostOnOpenCheck.checked) {
      setTimeout(() => {
        executeAutoPost();
      }, 500);
    }
  }

  /**
   * Renders interactive image selector specifically for the Carousel Video generator
   */
  function renderVideoImageSelector() {
    if (!elements.videoImagesSelectorGrid) return;
    elements.videoImagesSelectorGrid.innerHTML = '';

    if (state.images.length === 0) {
      elements.videoImagesSelectorGrid.innerHTML = '<p style="color:var(--text-muted);font-size:11px;grid-column:1/-1;padding:8px 0;">No images extracted. Paste an image URL below to add slides.</p>';
      if (elements.videoSelectedCount) elements.videoSelectedCount.textContent = '0';
      if (elements.videoImageCountBadge) elements.videoImageCountBadge.textContent = '0 Images';
      return;
    }

    if (!Array.isArray(state.selectedVideoImages)) {
      state.selectedVideoImages = [...state.images];
    }

    state.images.forEach((imgUrl) => {
      const isSelected = state.selectedVideoImages.includes(imgUrl);
      const selectedIndex = state.selectedVideoImages.indexOf(imgUrl);

      const card = document.createElement('div');
      card.className = `video-thumb-card ${isSelected ? 'selected' : 'unselected'}`;
      card.title = isSelected ? 'Click to exclude from video' : 'Click to include in video';

      const img = document.createElement('img');
      img.src = imgUrl;
      img.className = 'video-thumb-img';
      img.loading = 'lazy';
      img.onerror = () => {
        img.style.display = 'none';
      };

      const badge = document.createElement('div');
      badge.className = 'video-thumb-badge';
      badge.textContent = isSelected ? `✓${selectedIndex + 1}` : '+';

      card.appendChild(img);
      card.appendChild(badge);

      card.addEventListener('click', () => {
        if (isSelected) {
          state.selectedVideoImages = state.selectedVideoImages.filter(u => u !== imgUrl);
        } else {
          state.selectedVideoImages.push(imgUrl);
        }
        renderVideoImageSelector();
      });

      elements.videoImagesSelectorGrid.appendChild(card);
    });

    // Update count display
    const count = state.selectedVideoImages.length;
    if (elements.videoSelectedCount) elements.videoSelectedCount.textContent = count;
    if (elements.videoImageCountBadge) {
      elements.videoImageCountBadge.textContent = `${count} of ${state.images.length} Selected`;
    }
  }

  /**
   * Updates preview image
   */
  function updateImagePreview() {
    if (state.image) {
      elements.postImage.src = state.image;
      elements.postImage.classList.remove('hidden');
      elements.noImagePlaceholder.classList.add('hidden');
      elements.downloadImageBtn.classList.remove('hidden');
    } else {
      elements.postImage.src = '';
      elements.postImage.classList.add('hidden');
      elements.noImagePlaceholder.classList.remove('hidden');
      elements.downloadImageBtn.classList.add('hidden');
    }
    elements.imageCount.textContent = state.images.length;
    if (elements.videoImageCountBadge) {
      elements.videoImageCountBadge.textContent = `${state.images.length} Images`;
    }
  }

  /**
   * Renders thumbnail gallery for discovered images
   */
  function renderGalleryThumbnails() {
    elements.galleryGrid.innerHTML = '';
    if (state.images.length === 0) {
      elements.galleryGrid.innerHTML = '<p style="color:var(--text-muted);font-size:11px;grid-column:1/-1;">No additional images found.</p>';
      return;
    }

    state.images.forEach(imgUrl => {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.className = 'gallery-thumb' + (imgUrl === state.image ? ' selected' : '');
      img.title = 'Click to use this image';
      img.addEventListener('click', () => {
        state.image = imgUrl;
        updateImagePreview();
        renderGalleryThumbnails();
        showToast('Preview image updated!');
      });
      elements.galleryGrid.appendChild(img);
    });
  }

  /**
   * Renders tag badges
   */
  function renderTags() {
    elements.tagsContainer.innerHTML = '';
    if (!state.tags || state.tags.length === 0) {
      elements.tagsContainer.innerHTML = '<span style="color:var(--text-muted);font-size:11px;">No hashtags added yet.</span>';
      return;
    }

    state.tags.forEach((tag, index) => {
      const formatted = tag.startsWith('#') ? tag : `#${tag}`;
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.innerHTML = `${escapeHtml(formatted)} <span class="tag-remove-x">&times;</span>`;
      badge.title = 'Click to remove tag';
      badge.addEventListener('click', () => {
        state.tags.splice(index, 1);
        renderTags();
      });
      elements.tagsContainer.appendChild(badge);
    });
  }

  /**
   * Adds a new tag
   */
  function addTag() {
    const val = elements.newTagInput.value.trim();
    if (val) {
      const clean = val.replace(/[^a-zA-Z0-9_]/g, '');
      if (clean && !state.tags.includes(clean)) {
        state.tags.push(clean);
        renderTags();
        elements.newTagInput.value = '';
      }
    }
  }

  /**
   * Updates character counters
   */
  function updateCharCounts() {
    elements.titleCharCount.textContent = elements.postTitle.value.length;
    elements.descCharCount.textContent = elements.postDescription.value.length;
  }

  /**
   * Renders the Canvas Visual Note Card
   */
  function renderNoteCard() {
    if (!elements.noteCardCanvas || typeof CardGenerator === 'undefined') return;

    state.cardHook = elements.cardHookInput.value.trim();
    state.cardText = elements.cardTextInput.value.trim();
    state.cardFooter = elements.cardFooterInput.value.trim();

    CardGenerator.renderCard(elements.noteCardCanvas, {
      theme: state.cardTheme,
      title: state.title || 'Article Highlight',
      text: state.cardText || state.description || '',
      hook: state.cardHook,
      footer: state.cardFooter,
      siteName: state.siteName,
      width: 700,
      height: 700
    });
  }

  /**
   * Generates a Sliding Carousel Video from extracted images
   */
  async function generateCarouselVideo() {
    if (typeof VideoGenerator === 'undefined') {
      showToast('Video Generator engine loading...');
      return;
    }

    const imagesToUse = (state.selectedVideoImages && state.selectedVideoImages.length > 0)
      ? state.selectedVideoImages
      : (state.images.length > 0 ? state.images : (state.image ? [state.image] : []));

    if (!imagesToUse || imagesToUse.length === 0) {
      showToast('Please select at least 1 image to make the video!');
      return;
    }

    syncInputsToState();
    elements.videoProgressOverlay.classList.remove('hidden');
    elements.generateVideoBtn.disabled = true;
    elements.generateVideoBtnText.textContent = 'Generating Video...';

    try {
      const result = await VideoGenerator.generateCarouselVideo({
        title: state.title || 'Article Story',
        description: state.description,
        url: state.url,
        siteName: state.siteName,
        images: imagesToUse,
        aspectRatio: state.videoRatio,
        secondsPerSlide: state.videoSpeed
      }, (percent, statusMsg) => {
        elements.videoProgressFill.style.width = `${percent}%`;
        elements.videoProgressText.textContent = `${statusMsg} (${percent}%)`;
      });

      state.generatedVideoBlob = result.blob;
      state.generatedVideoUrl = result.url;

      // Convert to Base64 Data URL for persistent storage and direct drag-and-drop
      try {
        state.generatedVideoDataUrl = await blobToDataURL(result.blob);
      } catch (e) {
        state.generatedVideoDataUrl = result.url;
      }

      // Persist generated video to IndexedDB (localStorage) so popup close never deletes it
      await saveCachedVideo(result.blob, {
        title: state.title,
        url: state.url,
        siteName: state.siteName,
        ratio: state.videoRatio
      }, state.generatedVideoDataUrl);

      // Reveal Video Player
      elements.carouselVideoPlaceholder.classList.add('hidden');
      elements.carouselVideoPlayer.src = result.url;
      elements.carouselVideoPlayer.classList.remove('hidden');
      elements.carouselVideoPlayer.play().catch(() => {});

      // Reveal download and sharing targets
      elements.downloadVideoBtn.classList.remove('hidden');
      if (elements.videoDragBadge) elements.videoDragBadge.classList.remove('hidden');
      elements.videoPostTargets.classList.remove('hidden');
      elements.videoProgressOverlay.classList.add('hidden');

      showToast('Carousel video saved & ready to drag or save.');
    } catch (err) {
      elements.videoProgressOverlay.classList.add('hidden');
      showToast(err.message || 'Could not generate video.');
    } finally {
      elements.generateVideoBtn.disabled = false;
      elements.generateVideoBtnText.textContent = 'Re-Generate Video';
    }
  }

  /**
   * Converts a Blob to a Base64 Data URL
   */
  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // =========================================================
  // IndexedDB Persistent Video Cache (Local Storage)
  // =========================================================

  function openVideoDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SocialShareVideoDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveCachedVideo(blob, metadata, dataUrl = null) {
    try {
      const db = await openVideoDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite');
        const store = tx.objectStore('videos');
        store.put({
          id: 'latest_carousel_video',
          blob: blob,
          dataUrl: dataUrl,
          metadata: metadata,
          timestamp: Date.now()
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Could not save video to IndexedDB:', e);
    }
  }

  async function loadCachedVideo() {
    try {
      const db = await openVideoDB();
      return new Promise((resolve) => {
        const tx = db.transaction('videos', 'readonly');
        const store = tx.objectStore('videos');
        const req = store.get('latest_carousel_video');
        req.onsuccess = async () => {
          const item = req.result;
          if (item && (item.blob || item.dataUrl)) {
            let blob = item.blob;
            let dataUrl = item.dataUrl;

            if (!dataUrl && blob) {
              try {
                dataUrl = await blobToDataURL(blob);
              } catch (e) {}
            }

            if (!blob && dataUrl) {
              try {
                const res = await fetch(dataUrl);
                blob = await res.blob();
              } catch (e) {}
            }

            // Restore generated video state
            state.generatedVideoBlob = blob;
            state.generatedVideoDataUrl = dataUrl;
            state.generatedVideoUrl = blob ? URL.createObjectURL(blob) : dataUrl;

            // Populate video player
            elements.carouselVideoPlaceholder.classList.add('hidden');
            elements.carouselVideoPlayer.src = state.generatedVideoUrl;
            elements.carouselVideoPlayer.classList.remove('hidden');

            elements.downloadVideoBtn.classList.remove('hidden');
            if (elements.videoDragBadge) elements.videoDragBadge.classList.remove('hidden');
            elements.videoPostTargets.classList.remove('hidden');
            elements.generateVideoBtnText.textContent = 'Re-Generate Video';
            resolve(true);
          } else {
            resolve(false);
          }
        };
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * Gets the formatted text based on current inputs and selected template
   */
  function getFormattedPost() {
    syncInputsToState();
    const templateFn = SocialShare.TEMPLATES[state.template] || SocialShare.TEMPLATES.standard;
    const formattedTags = SocialShare.formatHashtags(state.tags);
    return templateFn({
      title: state.title,
      description: state.description,
      url: state.url,
      author: state.author,
      hashtags: formattedTags
    });
  }

  /**
   * Synchronizes input values back into state
   */
  function syncInputsToState() {
    state.title = elements.postTitle.value.trim();
    state.description = elements.postDescription.value.trim();
    state.url = elements.postUrl.value.trim();
  }

  /**
   * Helper to convert an image URL to a self-contained Base64 Data URL
   */
  async function imageUrlToBase64(url) {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    try {
      const response = await fetch(url);
      if (!response.ok) return '';
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return '';
    }
  }

  /**
   * Shares to a single social media platform
   */
  async function shareToPlatform(platformKey, customTitle = null) {
    syncInputsToState();
    const platform = SocialShare.PLATFORMS[platformKey];
    if (!platform) return;

    const titleToUse = customTitle || state.title;
    const targetImage = state.image || (state.images && state.images[0]) || '';
    const imageDataUrl = await imageUrlToBase64(targetImage);

    const pageTargetVal = elements.linkedinPageInput ? elements.linkedinPageInput.value.trim() : '';

    const shareUrl = platform.getUrl({
      title: titleToUse,
      description: state.description,
      url: state.url,
      image: targetImage,
      siteName: state.siteName,
      author: state.author,
      pageTarget: pageTargetVal,
      tags: SocialShare.formatHashtags(state.tags)
    });

    if (shareUrl) {
      // Automatically store pending post for universal content script auto-fill
      const fullPost = getFormattedPost();
      chrome.storage.local.set({
        pendingSocialPost: {
          platform: platformKey,
          text: fullPost,
          title: titleToUse,
          description: state.description,
          url: state.url,
          image: targetImage,
          imageDataUrl: imageDataUrl,
          images: state.images || [],
          timestamp: Date.now()
        },
        pendingFacebookPost: {
          text: fullPost,
          title: titleToUse,
          description: state.description,
          image: targetImage,
          imageDataUrl: imageDataUrl,
          timestamp: Date.now()
        }
      });

      if (platformKey === 'email') {
        window.location.href = shareUrl;
      } else if (platformKey === 'tiktok') {
        const caption = platform.getCaption ? platform.getCaption({
          title: titleToUse,
          description: state.description,
          url: state.url,
          tags: SocialShare.formatHashtags(state.tags)
        }) : fullPost;
        
        copyToClipboard(caption, 'Opening TikTok Studio (Caption ready to auto-fill)...');

        // Auto-download primary photo if available so user can immediately drop it into TikTok
        if (state.image) {
          const dlLink = document.createElement('a');
          dlLink.href = state.image;
          dlLink.download = 'tiktok-article-photo.jpg';
          dlLink.target = '_blank';
          document.body.appendChild(dlLink);
          dlLink.click();
          dlLink.remove();
        }

        window.open('https://www.tiktok.com/tiktokstudio/upload', '_blank');
        return;
      } else if (platformKey === 'youtube') {
        const caption = platform.getCaption ? platform.getCaption({
          title: titleToUse,
          description: state.description,
          url: state.url,
          tags: SocialShare.formatHashtags(state.tags)
        }) : fullPost;
        
        copyToClipboard(caption, 'YouTube post copied! Opening YouTube...');
        window.open(shareUrl, '_blank');
        return;
      } else if (platformKey === 'facebook') {
        copyToClipboard(fullPost, 'Autofilling Title & Description in Facebook...');
        const width = 620;
        const height = 580;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
          shareUrl,
          `share_${platformKey}_${Date.now()}`,
          `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );
        return;
      } else {
        copyToClipboard(fullPost, `Opening ${platform.name} (Autofilling Title & Description)...`);

        const width = 600;
        const height = 540;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
          shareUrl,
          `share_${platformKey}_${Date.now()}`,
          `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );
      }
    }
  }

  /**
   * Auto-Posts to all selected platforms sequentially
   */
  async function executeAutoPost() {
    syncInputsToState();
    const selectedPlatforms = Array.from(elements.autoPlatChecks)
      .filter(c => c.checked)
      .map(c => c.getAttribute('data-platform'));

    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform in Auto-Post settings.');
      elements.autopostSettingsDrawer.classList.remove('hidden');
      return;
    }

    const shouldRandomize = elements.autoRandomizeCheck ? elements.autoRandomizeCheck.checked : true;
    showToast(`Auto-Posting across ${selectedPlatforms.length} platforms...`);

    for (let i = 0; i < selectedPlatforms.length; i++) {
      const plat = selectedPlatforms[i];
      let postTitle = state.title;

      if (shouldRandomize && typeof SocialShare.makeUnique === 'function') {
        postTitle = SocialShare.makeUnique(state.title, state.description);
      }

      setTimeout(() => {
        shareToPlatform(plat, postTitle);
      }, i * 450);
    }
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // Mode Tabs Switcher (Standard vs Visual Note Card vs Carousel Video)
    elements.tabStandardBtn.addEventListener('click', () => {
      elements.tabStandardBtn.classList.add('active');
      elements.tabVisualCardBtn.classList.remove('active');
      elements.tabCarouselVideoBtn.classList.remove('active');
      elements.standardPreviewPanel.classList.remove('hidden');
      elements.visualCardPanel.classList.add('hidden');
      elements.carouselVideoPanel.classList.add('hidden');
      state.activeTabMode = 'standard';
    });

    elements.tabVisualCardBtn.addEventListener('click', () => {
      elements.tabVisualCardBtn.classList.add('active');
      elements.tabStandardBtn.classList.remove('active');
      elements.tabCarouselVideoBtn.classList.remove('active');
      elements.visualCardPanel.classList.remove('hidden');
      elements.standardPreviewPanel.classList.add('hidden');
      elements.carouselVideoPanel.classList.add('hidden');
      state.activeTabMode = 'card';
      renderNoteCard();
    });

    elements.tabCarouselVideoBtn.addEventListener('click', () => {
      elements.tabCarouselVideoBtn.classList.add('active');
      elements.tabStandardBtn.classList.remove('active');
      elements.tabVisualCardBtn.classList.remove('active');
      elements.carouselVideoPanel.classList.remove('hidden');
      elements.standardPreviewPanel.classList.add('hidden');
      elements.visualCardPanel.classList.add('hidden');
      state.activeTabMode = 'video';
    });

    // Carousel Video Generator Controls
    elements.videoRatioChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.videoRatioChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.videoRatio = chip.getAttribute('data-ratio');
        showToast(`Video format: ${chip.textContent}`);
      });
    });

    elements.videoSpeedChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.videoSpeedChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.videoSpeed = parseFloat(chip.getAttribute('data-speed'));
        showToast(`Slide speed: ${chip.textContent}`);
      });
    });

    // Video Image Selector Actions
    if (elements.videoSelectAllBtn) {
      elements.videoSelectAllBtn.addEventListener('click', () => {
        state.selectedVideoImages = [...state.images];
        renderVideoImageSelector();
        showToast(`Selected all ${state.images.length} images for video.`);
      });
    }

    if (elements.videoSelectNoneBtn) {
      elements.videoSelectNoneBtn.addEventListener('click', () => {
        state.selectedVideoImages = [];
        renderVideoImageSelector();
        showToast('Cleared video image selection.');
      });
    }

    if (elements.videoAddCustomImageBtn && elements.videoCustomImageInput) {
      elements.videoAddCustomImageBtn.addEventListener('click', () => {
        const url = elements.videoCustomImageInput.value.trim();
        if (url && /^https?:\/\//i.test(url)) {
          if (!state.images.includes(url)) {
            state.images.push(url);
          }
          if (!state.selectedVideoImages.includes(url)) {
            state.selectedVideoImages.push(url);
          }
          elements.videoCustomImageInput.value = '';
          renderVideoImageSelector();
          renderGalleryThumbnails();
          showToast('Custom image added to video slides!');
        } else {
          showToast('Please enter a valid image URL starting with http:// or https://');
        }
      });

      elements.videoCustomImageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          elements.videoAddCustomImageBtn.click();
        }
      });
    }

    elements.generateVideoBtn.addEventListener('click', generateCarouselVideo);

    elements.downloadVideoBtn.addEventListener('click', () => {
      const videoData = state.generatedVideoDataUrl || state.generatedVideoUrl;
      if (videoData) {
        const a = document.createElement('a');
        a.href = videoData;
        a.download = `carousel-${state.siteName || 'article'}-video.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Video downloaded successfully.');
      }
    });

    elements.postVideoTiktokBtn.addEventListener('click', () => {
      const caption = getFormattedPost();
      copyToClipboard(caption, 'Video downloaded. Drag it into TikTok...');

      // Auto-download generated video
      const videoData = state.generatedVideoDataUrl || state.generatedVideoUrl;
      if (videoData) {
        const a = document.createElement('a');
        a.href = videoData;
        a.download = `tiktok-video-${state.siteName || 'story'}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      // Store pending post for TikTok auto-fill
      chrome.storage.local.set({
        pendingSocialPost: {
          platform: 'tiktok',
          text: caption,
          title: state.title,
          description: state.description,
          url: state.url,
          timestamp: Date.now()
        }
      });

      window.open('https://www.tiktok.com/tiktokstudio/upload', '_blank');
    });

    elements.postVideoShortsBtn.addEventListener('click', () => {
      const caption = getFormattedPost();
      copyToClipboard(caption, 'Video downloaded. Drag it into YouTube...');

      // Auto-download generated video
      const videoData = state.generatedVideoDataUrl || state.generatedVideoUrl;
      if (videoData) {
        const a = document.createElement('a');
        a.href = videoData;
        a.download = `youtube-shorts-${state.siteName || 'story'}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      // Store pending post for YouTube auto-fill
      chrome.storage.local.set({
        pendingSocialPost: {
          platform: 'youtube',
          text: caption,
          title: state.title,
          description: state.description,
          url: state.url,
          tags: state.tags || [],
          timestamp: Date.now()
        }
      });

      window.open('https://www.youtube.com/upload', '_blank');
    });

    // Draggable Video Helper (Dragstart & Click)
    if (elements.videoDragBadge) {
      elements.videoDragBadge.addEventListener('dragstart', (e) => {
        const videoData = state.generatedVideoDataUrl || state.generatedVideoUrl;
        if (videoData) {
          const fileName = `carousel-${state.siteName || 'article'}-video.webm`;
          // Self-contained Base64 Data URL prevents ERR_FILE_NOT_FOUND when popup closes
          e.dataTransfer.setData('DownloadURL', `video/webm:${fileName}:${videoData}`);
          e.dataTransfer.setData('text/plain', getFormattedPost());
          e.dataTransfer.effectAllowed = 'copyMove';

          chrome.storage.local.set({
            pendingSocialPost: {
              text: getFormattedPost(),
              title: state.title,
              description: state.description,
              url: state.url,
              timestamp: Date.now()
            }
          });
        }
      });

      elements.videoDragBadge.addEventListener('click', () => {
        const videoData = state.generatedVideoDataUrl || state.generatedVideoUrl;
        if (videoData) {
          const fileName = `carousel-${state.siteName || 'article'}-video.webm`;
          const a = document.createElement('a');
          a.href = videoData;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();

          copyToClipboard(getFormattedPost(), 'Video saved to Downloads! Drag it into TikTok or YouTube.');
        }
      });
    }

    // Note Card Inputs
    elements.cardHookInput.addEventListener('input', renderNoteCard);
    elements.cardTextInput.addEventListener('input', renderNoteCard);
    elements.cardFooterInput.addEventListener('input', renderNoteCard);

    // Note Card Theme Chips
    elements.cardThemeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.cardThemeChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.cardTheme = chip.getAttribute('data-card-theme');
        renderNoteCard();
        showToast(`Card style: ${chip.textContent}`);
      });
    });

    // Download Note Card Button
    elements.downloadNoteCardBtn.addEventListener('click', () => {
      if (elements.noteCardCanvas && typeof CardGenerator !== 'undefined') {
        CardGenerator.downloadCanvasImage(elements.noteCardCanvas, 'social-note-card.png');
        showToast('Note card image downloaded.');
      }
    });

    // Copy Note Card Button
    elements.copyNoteCardBtn.addEventListener('click', async () => {
      if (elements.noteCardCanvas && typeof CardGenerator !== 'undefined') {
        try {
          await CardGenerator.copyCanvasImage(elements.noteCardCanvas);
          showToast('Note card image copied to clipboard.');
        } catch (err) {
          showToast('Could not copy image directly. Click Download instead.');
        }
      }
    });

    // Auto-Post Trigger
    elements.autoPostTriggerBtn.addEventListener('click', executeAutoPost);

    // Auto-Post Settings Drawer Toggle
    elements.toggleAutoPostSettingsBtn.addEventListener('click', () => {
      elements.autopostSettingsDrawer.classList.toggle('hidden');
    });

    // Select All / None Platforms
    elements.selectAllPlatformsBtn.addEventListener('click', () => {
      elements.autoPlatChecks.forEach(c => c.checked = true);
      saveAutoPostPreferences();
      showToast('All platforms selected');
    });

    elements.selectNonePlatformsBtn.addEventListener('click', () => {
      elements.autoPlatChecks.forEach(c => c.checked = false);
      saveAutoPostPreferences();
      showToast('All platforms unselected');
    });

    elements.autoPlatChecks.forEach(chk => {
      chk.addEventListener('change', saveAutoPostPreferences);
    });

    if (elements.autoRandomizeCheck) {
      elements.autoRandomizeCheck.addEventListener('change', saveAutoPostPreferences);
    }

    if (elements.autoPostOnOpenCheck) {
      elements.autoPostOnOpenCheck.addEventListener('change', saveAutoPostPreferences);
    }

    if (elements.linkedinPageInput) {
      elements.linkedinPageInput.addEventListener('input', saveAutoPostPreferences);
    }

    // Input syncs
    elements.postTitle.addEventListener('input', () => {
      syncInputsToState();
      updateCharCounts();
    });

    // Make Unique Button (Randomize hook to prevent duplicate errors)
    if (elements.makeUniqueBtn) {
      elements.makeUniqueBtn.addEventListener('click', () => {
        if (state.title && typeof SocialShare !== 'undefined') {
          const uniqueTitle = SocialShare.makeUnique(state.title, state.description);
          elements.postTitle.value = uniqueTitle;
          state.title = uniqueTitle;
          updateCharCounts();
          showToast('Unique title variation generated.');
        }
      });
    }

    elements.postDescription.addEventListener('input', () => {
      syncInputsToState();
      updateCharCounts();
    });

    elements.postUrl.addEventListener('input', syncInputsToState);

    // Clean URL Button
    elements.cleanUrlBtn.addEventListener('click', () => {
      if (state.url) {
        state.url = SocialExtractor.cleanUrl(state.url);
        elements.postUrl.value = state.url;
        showToast('Tracking parameters stripped.');
      }
    });

    // Copy URL Button
    elements.copyUrlBtn.addEventListener('click', () => {
      if (elements.postUrl.value) {
        copyToClipboard(elements.postUrl.value, 'Article URL copied!');
      }
    });

    // Drawer Toggle
    elements.toggleUrlBtn.addEventListener('click', () => {
      elements.urlDrawer.classList.toggle('hidden');
      elements.toggleUrlBtn.classList.toggle('active');
      if (!elements.urlDrawer.classList.contains('hidden')) {
        elements.customUrlInput.focus();
      }
    });

    // Fetch URL Form
    elements.fetchUrlBtn.addEventListener('click', () => {
      fetchExternalUrlMetadata(elements.customUrlInput.value);
    });

    elements.customUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        fetchExternalUrlMetadata(elements.customUrlInput.value);
      }
    });

    // Refresh & Retry
    elements.refreshBtn.addEventListener('click', extractFromActiveTab);
    elements.retryBtn.addEventListener('click', extractFromActiveTab);

    // Gallery Drawer Toggle
    elements.selectImageBtn.addEventListener('click', () => {
      elements.imageGalleryDrawer.classList.toggle('hidden');
    });

    elements.closeGalleryBtn.addEventListener('click', () => {
      elements.imageGalleryDrawer.classList.add('hidden');
    });

    // Custom Image URL Apply
    elements.applyCustomImgBtn.addEventListener('click', () => {
      const customImg = elements.customImageUrlInput.value.trim();
      if (customImg && SocialExtractor.isValidImageUrl(customImg)) {
        state.image = customImg;
        if (!state.images.includes(customImg)) {
          state.images.unshift(customImg);
        }
        updateImagePreview();
        renderGalleryThumbnails();
        elements.customImageUrlInput.value = '';
        elements.imageGalleryDrawer.classList.add('hidden');
        showToast('Custom image set!');
      } else {
        showToast('Please enter a valid image URL');
      }
    });

    // Download Image
    elements.downloadImageBtn.addEventListener('click', () => {
      if (state.image) {
        chrome.tabs.create({ url: state.image });
        showToast('Opening high-res image...');
      }
    });

    // Tags
    elements.addTagBtn.addEventListener('click', addTag);
    elements.newTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    });

    // Template Chips
    elements.templateChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.templateChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.template = chip.getAttribute('data-template');
        showToast(`Template: ${chip.textContent}`);
      });
    });

    // Quick Copy Actions
    elements.copyPostBtn.addEventListener('click', () => {
      const postText = getFormattedPost();
      copyToClipboard(postText, 'Full post copied to clipboard.');
    });

    elements.copyMarkdownBtn.addEventListener('click', () => {
      syncInputsToState();
      const md = SocialShare.formatAsMarkdown(state);
      copyToClipboard(md, 'Markdown format copied!');
    });

    elements.copyHtmlBtn.addEventListener('click', () => {
      syncInputsToState();
      const html = SocialShare.formatAsHtml(state);
      copyToClipboard(html, 'HTML embed code copied!');
    });

    // Social Sharing Buttons
    elements.socialButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const platform = btn.getAttribute('data-platform');
        shareToPlatform(platform);
      });
    });
  }

  /**
   * Clipboard Helper
   */
  async function copyToClipboard(text, successMessage = 'Copied!') {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(successMessage);
    }
  }

  /**
   * Toast notification helper
   */
  let toastTimer = null;
  function showToast(message) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elements.toast.classList.add('hidden');
    }, 2400);
  }

  // View state helpers
  function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.mainContent.classList.add('hidden');
  }

  function showError(msg) {
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
    elements.errorMessage.textContent = msg;
    elements.mainContent.classList.add('hidden');
  }

  function showContent() {
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
    elements.mainContent.classList.remove('hidden');
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

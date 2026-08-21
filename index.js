/**
 * SocialShare - Landing & Installation Guide Controller
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupBrowserTabs();
    setupFaqAccordion();
    setupCopyButtons();
    setupDownloadTriggers();
  }

  /**
   * Browser Tab Switcher for Installation Guide
   */
  function setupBrowserTabs() {
    const browserTabs = document.querySelectorAll('.browser-tab');
    const extUrlCode = document.getElementById('ext-url-code');

    const browserUrls = {
      chrome: 'chrome://extensions',
      brave: 'brave://extensions',
      edge: 'edge://extensions'
    };

    browserTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        browserTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const browser = tab.getAttribute('data-browser');
        if (extUrlCode && browserUrls[browser]) {
          extUrlCode.textContent = browserUrls[browser];
        }
      });
    });
  }

  /**
   * FAQ Accordion Interaction
   */
  function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
      const btn = item.querySelector('.faq-question');
      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close other items
        faqItems.forEach((other) => other.classList.remove('active'));

        // Toggle clicked
        if (!isActive) {
          item.classList.add('active');
        }
      });
    });
  }

  /**
   * Copy to Clipboard Buttons
   */
  function setupCopyButtons() {
    const copyExtUrlBtn = document.getElementById('copy-ext-url-btn');
    const extUrlCode = document.getElementById('ext-url-code');

    if (copyExtUrlBtn && extUrlCode) {
      copyExtUrlBtn.addEventListener('click', () => {
        const text = extUrlCode.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
          showToast(`Copied ${text} to clipboard!`);
          copyExtUrlBtn.querySelector('span').textContent = 'Copied!';
          setTimeout(() => {
            copyExtUrlBtn.querySelector('span').textContent = 'Copy';
          }, 2000);
        });
      });
    }
  }

  /**
   * Download button toast notification
   */
  function setupDownloadTriggers() {
    const downloadBtns = document.querySelectorAll('a[download]');

    downloadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        showToast('Downloading social-extension.zip...');
      });
    });
  }

  /**
   * Shows a floating toast message
   */
  function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }
})();

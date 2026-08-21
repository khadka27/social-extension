/**
 * SocialShare - Social Media Share & Formatting Engine
 * Provides share URL generation for all major social networks,
 * customizable post templates, and quick clipboard copy utilities.
 */

(function (global) {
  'use strict';

  /**
   * Templates for formatting social posts
   */
  const TEMPLATES = {
    standard: (data) => {
      const parts = [];
      if (data.title) parts.push(`📖 ${data.title}`);
      if (data.description) parts.push(`\n${data.description}`);
      if (data.url) parts.push(`\n🔗 ${data.url}`);
      if (data.hashtags && data.hashtags.length > 0) {
        parts.push(`\n${data.hashtags.join(' ')}`);
      }
      return parts.join('\n');
    },

    casual: (data) => {
      const parts = [];
      parts.push(`Just found this great read! 👀👇`);
      if (data.title) parts.push(`"${data.title}"`);
      if (data.description) parts.push(`\n${data.description}`);
      if (data.url) parts.push(`\nCheck it out here 👉 ${data.url}`);
      if (data.hashtags && data.hashtags.length > 0) {
        parts.push(`\n${data.hashtags.join(' ')}`);
      }
      return parts.join('\n');
    },

    professional: (data) => {
      const parts = [];
      if (data.title) parts.push(`💡 Key Insights: ${data.title}`);
      if (data.author) parts.push(`By ${data.author}`);
      if (data.description) parts.push(`\nSummary:\n${data.description}`);
      if (data.url) parts.push(`\nRead full article: ${data.url}`);
      if (data.hashtags && data.hashtags.length > 0) {
        parts.push(`\n${data.hashtags.join(' ')}`);
      }
      return parts.join('\n');
    },

    minimal: (data) => {
      const tags = data.hashtags && data.hashtags.length > 0 ? ` ${data.hashtags.join(' ')}` : '';
      return `${data.title} ${data.url}${tags}`;
    },

    hook: (data) => {
      const parts = [];
      parts.push(`🔥 You won't want to miss this:`);
      if (data.title) parts.push(`\n📌 ${data.title}`);
      if (data.description) parts.push(`\n"${data.description}"`);
      if (data.url) parts.push(`\nDive in here 🚀 ${data.url}`);
      if (data.hashtags && data.hashtags.length > 0) {
        parts.push(`\n${data.hashtags.join(' ')}`);
      }
      return parts.join('\n');
    },

    riddle: (data) => {
      const parts = [];
      parts.push(`No hints\nNo clue\nJust pure logic...!\n\nWhat's your answer? 👇`);
      if (data.title) parts.push(`\n📌 ${data.title}`);
      if (data.description) parts.push(`\n"${data.description}"`);
      if (data.url) parts.push(`\n🔗 ${data.url}`);
      if (data.hashtags && data.hashtags.length > 0) {
        parts.push(`\n${data.hashtags.join(' ')}`);
      }
      return parts.join('\n');
    },

    curiosity: (data) => {
      const parts = [];
      parts.push(`99% of people get this wrong! 🤔👇`);
      if (data.title) parts.push(`\n"${data.title}"`);
      if (data.description) parts.push(`\n${data.description}`);
      if (data.url) parts.push(`\nCheck it out 👉 ${data.url}`);
      if (data.hashtags && data.hashtags.length > 0) {
        parts.push(`\n${data.hashtags.join(' ')}`);
      }
      return parts.join('\n');
    }
  };

  /**
   * Builds hashtags array from tag strings
   */
  function formatHashtags(tags) {
    if (!tags || !Array.isArray(tags)) return [];
    return tags
      .map(t => {
        let clean = t.replace(/[^a-zA-Z0-9_]/g, '');
        if (!clean) return '';
        return clean.startsWith('#') ? clean : `#${clean}`;
      })
      .filter(Boolean);
  }

  /**
   * Generates a unique variation of post text to bypass Twitter's duplicate post filter
   */
  const VARIATION_HOOKS = [
    'Thoughts on this? 👀👇',
    'Interesting read today 📖✨',
    'Just came across this 💡',
    'What are your thoughts on this? 🤔',
    'Check this out: 🔥',
    'Worth checking out 🚀',
    'Breaking it down 👇'
  ];

  const EMOJIS = ['⚡', '💡', '📌', '🔍', '🔥', '👀', '✨', '🚀'];

  function makeUnique(title, description) {
    const randomHook = VARIATION_HOOKS[Math.floor(Math.random() * VARIATION_HOOKS.length)];
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return `${randomHook}\n\n${randomEmoji} ${title}`;
  }

  /**
   * Social platform share URL generators
   */
  const PLATFORMS = {
    twitter: {
      name: 'X (Twitter)',
      icon: 'twitter',
      color: '#000000',
      getUrl: (data) => {
        let text = data.title ? `${data.title}` : '';
        if (data.description) {
          text += `\n\n${data.description}`;
        }
        const tags = (data.tags || []).map(t => t.replace(/^#/, '')).join(',');
        const params = new URLSearchParams({
          url: data.url || '',
          text: text
        });
        if (tags) params.set('hashtags', tags);
        if (data.siteName) params.set('via', data.siteName.replace(/\s+/g, ''));
        return `https://twitter.com/intent/tweet?${params.toString()}`;
      }
    },

    linkedin: {
      name: 'LinkedIn',
      icon: 'linkedin',
      color: '#0A66C2',
      getUrl: (data) => {
        let text = data.title || '';
        if (data.description) text += `\n\n${data.description}`;
        if (data.url) text += `\n\n${data.url}`;
        if (data.tags && data.tags.length > 0) text += `\n\n${data.tags.join(' ')}`;
        return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
      }
    },

    facebook: {
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      getUrl: (data) => {
        let quote = data.title ? `${data.title}` : '';
        if (data.description) quote += `\n\n${data.description}`;
        const params = new URLSearchParams({
          u: data.url || '',
          quote: quote
        });
        return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
      }
    },

    whatsapp: {
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      getUrl: (data) => {
        let message = `*${data.title}*`;
        if (data.description) message += `\n\n${data.description}`;
        if (data.url) message += `\n\n🔗 ${data.url}`;
        if (data.tags && data.tags.length > 0) message += `\n\n${data.tags.join(' ')}`;
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
      }
    },

    telegram: {
      name: 'Telegram',
      icon: 'telegram',
      color: '#24A1DE',
      getUrl: (data) => {
        let text = data.title || '';
        if (data.description) text += `\n\n${data.description}`;
        if (data.tags && data.tags.length > 0) text += `\n\n${data.tags.join(' ')}`;
        const params = new URLSearchParams({
          url: data.url || '',
          text: text
        });
        return `https://t.me/share/url?${params.toString()}`;
      }
    },

    reddit: {
      name: 'Reddit',
      icon: 'reddit',
      color: '#FF4500',
      getUrl: (data) => {
        const titleText = data.description ? `${data.title} — ${data.description}`.slice(0, 295) : (data.title || '');
        const params = new URLSearchParams({
          url: data.url || '',
          title: titleText
        });
        return `https://reddit.com/submit?${params.toString()}`;
      }
    },

    threads: {
      name: 'Threads',
      icon: 'threads',
      color: '#000000',
      getUrl: (data) => {
        let text = data.title || '';
        if (data.description) text += `\n\n${data.description}`;
        if (data.url) text += `\n\n${data.url}`;
        if (data.tags && data.tags.length > 0) text += `\n\n${data.tags.join(' ')}`;
        return `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`;
      }
    },

    pinterest: {
      name: 'Pinterest',
      icon: 'pinterest',
      color: '#E60023',
      getUrl: (data) => {
        let desc = data.title || '';
        if (data.description) desc += ` — ${data.description}`;
        if (data.tags && data.tags.length > 0) desc += ` ${data.tags.join(' ')}`;
        const params = new URLSearchParams({
          url: data.url || '',
          description: desc
        });
        if (data.image) {
          params.set('media', data.image);
        }
        return `https://pinterest.com/pin/create/button/?${params.toString()}`;
      }
    },

    bluesky: {
      name: 'Bluesky',
      icon: 'bluesky',
      color: '#0085FF',
      getUrl: (data) => {
        let text = data.title || '';
        if (data.description) text += `\n\n${data.description}`;
        if (data.url) text += `\n\n${data.url}`;
        if (data.tags && data.tags.length > 0) text += `\n\n${data.tags.join(' ')}`;
        return `https://bsky.app/intent/compose?text=${encodeURIComponent(text.slice(0, 300))}`;
      }
    },

    tiktok: {
      name: 'TikTok',
      icon: 'tiktok',
      color: '#FE2C55',
      getUrl: (data) => {
        return 'https://www.tiktok.com/upload';
      },
      getCaption: (data) => {
        const parts = [];
        if (data.title) parts.push(data.title);
        if (data.description) parts.push(data.description);
        if (data.url) parts.push(`Link: ${data.url}`);
        const tags = (data.tags || []).map(t => (t.startsWith('#') ? t : `#${t}`));
        if (!tags.some(t => t.toLowerCase() === '#fyp')) tags.push('#fyp');
        if (tags.length > 0) parts.push(tags.join(' '));
        return parts.join('\n\n');
      }
    },

    youtube: {
      name: 'YouTube',
      icon: 'youtube',
      color: '#FF0000',
      getUrl: (data) => {
        return 'https://www.youtube.com/upload';
      },
      getCaption: (data) => {
        const parts = [];
        if (data.title) parts.push(`📢 ${data.title}`);
        if (data.description) parts.push(`\n${data.description}`);
        if (data.url) parts.push(`\n🔗 Full Link: ${data.url}`);
        const tags = (data.tags || []).map(t => (t.startsWith('#') ? t : `#${t}`));
        if (!tags.some(t => t.toLowerCase() === '#community')) tags.push('#community');
        if (tags.length > 0) parts.push(`\n${tags.join(' ')}`);
        return parts.join('\n');
      }
    },

    email: {
      name: 'Email',
      icon: 'email',
      color: '#6B7280',
      getUrl: (data) => {
        const subject = encodeURIComponent(data.title || 'Interesting Article');
        const body = encodeURIComponent(
          `Hi,\n\nI thought you might find this article interesting:\n\n"${data.title}"\n${data.description ? '\n' + data.description + '\n' : ''}\nRead here: ${data.url}\n`
        );
        return `mailto:?subject=${subject}&body=${body}`;
      }
    }
  };

  /**
   * Format export data
   */
  function formatAsMarkdown(data) {
    let md = `### [${data.title}](${data.url})\n\n`;
    if (data.image) {
      md += `![${data.title}](${data.image})\n\n`;
    }
    if (data.description) {
      md += `> ${data.description}\n\n`;
    }
    if (data.tags && data.tags.length > 0) {
      md += data.tags.map(t => `#${t.replace(/^#/, '')}`).join(' ');
    }
    return md;
  }

  function formatAsHtml(data) {
    let html = `<div class="social-share-card">\n`;
    if (data.image) {
      html += `  <img src="${data.image}" alt="${data.title}" style="max-width:100%; border-radius: 8px;" />\n`;
    }
    html += `  <h3><a href="${data.url}" target="_blank" rel="noopener noreferrer">${data.title}</a></h3>\n`;
    if (data.description) {
      html += `  <p>${data.description}</p>\n`;
    }
    html += `</div>`;
    return html;
  }

  // Export to global scope
  const SocialShare = {
    PLATFORMS,
    TEMPLATES,
    formatHashtags,
    makeUnique,
    formatAsMarkdown,
    formatAsHtml
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialShare;
  } else {
    global.SocialShare = SocialShare;
  }
})(typeof window !== 'undefined' ? window : this);

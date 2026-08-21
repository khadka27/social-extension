/**
 * SocialShare - Metadata Extraction Engine
 * Extracts high-fidelity metadata (Title, Description, Images, Author, Site Name, Tags)
 * from both active DOM documents and parsed HTML strings.
 */

(function (global) {
  'use strict';

  /**
   * Cleans a URL by removing common tracking parameters (UTM, fbclid, etc.)
   * @param {string} urlString
   * @returns {string}
   */
  function cleanUrl(urlString) {
    if (!urlString) return '';
    try {
      const url = new URL(urlString);
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'source', 'igshid'
      ];
      trackingParams.forEach(param => url.searchParams.delete(param));
      return url.toString();
    } catch (e) {
      return urlString;
    }
  }

  /**
   * Resolves relative URLs to absolute URLs
   * @param {string} url
   * @param {string} baseUrl
   * @returns {string}
   */
  function resolveUrl(url, baseUrl) {
    if (!url) return '';
    try {
      return new URL(url, baseUrl).href;
    } catch (e) {
      return url;
    }
  }

  /**
   * Helper to query meta tag content by property or name
   * @param {Document} doc
   * @param {string[]} selectors
   * @returns {string}
   */
  function getMetaContent(doc, selectors) {
    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el) {
        const content = el.getAttribute('content') || el.getAttribute('value');
        if (content && content.trim()) {
          return content.trim();
        }
      }
    }
    return '';
  }

  /**
   * Parses JSON-LD scripts to find article/blog post metadata
   * @param {Document} doc
   * @returns {Object}
   */
  function parseJsonLd(doc) {
    const result = {
      title: '',
      description: '',
      image: '',
      author: '',
      publisher: '',
      keywords: []
    };

    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        let json = JSON.parse(script.textContent);
        if (Array.isArray(json)) {
          json = json[0];
        }
        if (json && json['@graph'] && Array.isArray(json['@graph'])) {
          // Find article or webpage object
          const article = json['@graph'].find(item => 
            ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'WebPage'].includes(item['@type'])
          ) || json['@graph'][0];
          json = article || json;
        }

        if (json) {
          if (!result.title && (json.headline || json.name)) {
            result.title = (json.headline || json.name || '').trim();
          }
          if (!result.description && json.description) {
            result.description = json.description.trim();
          }
          if (!result.image) {
            if (typeof json.image === 'string') {
              result.image = json.image;
            } else if (Array.isArray(json.image) && json.image.length > 0) {
              result.image = typeof json.image[0] === 'string' ? json.image[0] : json.image[0].url;
            } else if (json.image && json.image.url) {
              result.image = json.image.url;
            }
          }
          if (!result.author) {
            if (typeof json.author === 'string') {
              result.author = json.author;
            } else if (Array.isArray(json.author) && json.author.length > 0) {
              result.author = json.author[0].name || json.author[0];
            } else if (json.author && json.author.name) {
              result.author = json.author.name;
            }
          }
          if (!result.publisher) {
            if (typeof json.publisher === 'string') {
              result.publisher = json.publisher;
            } else if (json.publisher && json.publisher.name) {
              result.publisher = json.publisher.name;
            }
          }
          if (json.keywords) {
            if (typeof json.keywords === 'string') {
              result.keywords = json.keywords.split(',').map(k => k.trim()).filter(Boolean);
            } else if (Array.isArray(json.keywords)) {
              result.keywords = json.keywords.map(k => String(k).trim()).filter(Boolean);
            }
          }
        }
      } catch (e) {
        // Continue if invalid JSON
      }
    }
    return result;
  }

  /**
   * Extracts all viable preview images from the document
   * @param {Document} doc
   * @param {string} baseUrl
   * @param {string[]} primaryImages
   * @returns {string[]}
   */
  function extractAllImages(doc, baseUrl, primaryImages = []) {
    const imagesSet = new Set();

    // Add primary images first
    primaryImages.forEach(img => {
      if (img && typeof img === 'string' && img.startsWith('http')) {
        imagesSet.add(cleanMediumImageUrl(img));
      }
    });

    // 1. Check all meta and link image tags
    const metaSelectors = [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="og:image"]',
      'meta[property="twitter:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[property="twitter:image:src"]',
      'meta[name="thumbnail"]',
      'meta[itemprop="image"]',
      'link[rel="image_src"]',
      'link[rel="apple-touch-icon-precomposed"]'
    ];

    metaSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => {
        const src = el.getAttribute('content') || el.getAttribute('href') || el.getAttribute('value');
        if (src) {
          const abs = resolveUrl(src, baseUrl);
          if (isValidImageUrl(abs)) imagesSet.add(cleanMediumImageUrl(abs));
        }
      });
    });

    // 2. Scan picture sources, figure images, and in-page images
    const sourceElements = doc.querySelectorAll('picture source[srcset], source[srcset]');
    sourceElements.forEach(source => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const bestSrc = extractHighestResFromSrcset(srcset);
        if (bestSrc) {
          const abs = resolveUrl(bestSrc, baseUrl);
          if (isValidImageUrl(abs) && !isExcludedImage(abs)) {
            imagesSet.add(cleanMediumImageUrl(abs));
          }
        }
      }
    });

    // 3. Scan in-page <img> elements
    const imgElements = doc.querySelectorAll('article figure img, article img, main img, figure img, .post img, .content img, img');
    imgElements.forEach(img => {
      let src = img.getAttribute('data-src') ||
                img.getAttribute('data-original') ||
                img.getAttribute('data-zoom-image') ||
                img.getAttribute('data-highres') ||
                img.getAttribute('src');

      const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
      if (srcset) {
        const bestFromSrcset = extractHighestResFromSrcset(srcset);
        if (bestFromSrcset) src = bestFromSrcset;
      }

      if (src) {
        const abs = resolveUrl(src, baseUrl);
        if (isValidImageUrl(abs) && !isExcludedImage(abs, img)) {
          imagesSet.add(cleanMediumImageUrl(abs));
        }
      }
    });

    // 4. Scan noscript tags (often contains real <img> on Medium & WordPress)
    const noscripts = doc.querySelectorAll('noscript');
    noscripts.forEach(ns => {
      const match = ns.textContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        const abs = resolveUrl(match[1], baseUrl);
        if (isValidImageUrl(abs) && !isExcludedImage(abs)) {
          imagesSet.add(cleanMediumImageUrl(abs));
        }
      }
    });

    return Array.from(imagesSet);
  }

  /**
   * Cleans Medium image URLs to request high-resolution 1200px versions
   * @param {string} url
   * @returns {string}
   */
  function cleanMediumImageUrl(url) {
    if (!url) return '';
    // Upgrade low-res Miro Medium fit/fill to fit:1200
    if (url.includes('miro.medium.com')) {
      return url.replace(/resize:(?:fit|fill):\d+(?::\d+)?/g, 'resize:fit:1200');
    }
    return url;
  }

  /**
   * Extracts highest resolution URL from srcset string
   * @param {string} srcset
   * @returns {string|null}
   */
  function extractHighestResFromSrcset(srcset) {
    if (!srcset) return null;
    const parts = srcset.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return null;
    // Take the last item in srcset (which is typically highest resolution)
    const lastPart = parts[parts.length - 1];
    return lastPart.split(' ')[0] || null;
  }

  /**
   * Validates if a URL looks like a proper image
   * @param {string} url
   * @returns {boolean}
   */
  function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    if (url.startsWith('data:image/svg+xml')) return false;
    return true;
  }

  /**
   * Filters out tracking pixels, tiny badges, or avatars
   * @param {string} url
   * @param {HTMLImageElement} [img]
   * @returns {boolean}
   */
  function isExcludedImage(url, img) {
    const lower = url.toLowerCase();
    const exclusions = [
      'favicon', 'icon', 'emoji', 'pixel', 'badge',
      'logo-small', '1x1', 'spinner', 'loader', 'ad-', 'advertisement', 'tracking'
    ];
    if (exclusions.some(exc => lower.includes(exc))) return true;

    if (img) {
      const width = parseInt(img.getAttribute('width') || '0', 10);
      const height = parseInt(img.getAttribute('height') || '0', 10);
      // Only exclude if explicitly set to tiny dimensions (< 30px)
      if ((width > 0 && width < 30) || (height > 0 && height < 30)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Main function to extract structured metadata from a Document object
   * @param {Document} doc
   * @param {string} pageUrl
   * @returns {Object}
   */
  function extractMetadata(doc, pageUrl = '') {
    const url = pageUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const jsonLd = parseJsonLd(doc);

    // 1. Title Extraction (OG -> Twitter -> JSON-LD -> <title> -> <h1>)
    let title = getMetaContent(doc, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]'
    ]) || jsonLd.title;

    if (!title) {
      const titleTag = doc.querySelector('title');
      if (titleTag && titleTag.textContent) {
        title = titleTag.textContent.trim();
      }
    }

    if (!title) {
      const h1 = doc.querySelector('h1');
      if (h1 && h1.textContent) {
        title = h1.textContent.trim();
      }
    }

    // 2. Description Extraction (OG -> Twitter -> JSON-LD -> Meta Desc -> Lead text)
    let description = getMetaContent(doc, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]'
    ]) || jsonLd.description;

    if (!description) {
      // Try to find first substantial paragraph in article/main
      const p = doc.querySelector('article p, main p, .post-content p, .article-body p, p');
      if (p && p.textContent && p.textContent.trim().length > 40) {
        description = p.textContent.trim().substring(0, 300) + '...';
      }
    }

    // 3. Primary Image Extraction
    let primaryImage = getMetaContent(doc, [
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
      'meta[name="image"]'
    ]) || jsonLd.image;

    if (primaryImage) {
      primaryImage = resolveUrl(primaryImage, url);
    }

    // 4. Site Name
    let siteName = getMetaContent(doc, [
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
      'meta[name="publisher"]'
    ]) || jsonLd.publisher;

    if (!siteName && url) {
      try {
        const parsed = new URL(url);
        siteName = parsed.hostname.replace(/^www\./, '');
      } catch (e) {
        siteName = '';
      }
    }

    // 5. Author
    let author = getMetaContent(doc, [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]'
    ]) || jsonLd.author;

    // 6. Keywords / Tags
    let tags = [];
    const metaKeywords = getMetaContent(doc, ['meta[name="keywords"]']);
    if (metaKeywords) {
      tags = metaKeywords.split(',').map(t => t.trim()).filter(Boolean);
    }

    // OpenGraph article:tag
    doc.querySelectorAll('meta[property="article:tag"]').forEach(el => {
      const val = el.getAttribute('content');
      if (val && !tags.includes(val.trim())) {
        tags.push(val.trim());
      }
    });

    if (tags.length === 0 && jsonLd.keywords && jsonLd.keywords.length > 0) {
      tags = jsonLd.keywords;
    }

    // 7. Canonical URL
    let canonicalUrl = getMetaContent(doc, ['meta[property="og:url"]']);
    if (!canonicalUrl) {
      const canonicalTag = doc.querySelector('link[rel="canonical"]');
      if (canonicalTag && canonicalTag.getAttribute('href')) {
        canonicalUrl = canonicalTag.getAttribute('href');
      }
    }
    canonicalUrl = canonicalUrl ? resolveUrl(canonicalUrl, url) : url;

    // 8. All Candidate Images
    const allImages = extractAllImages(doc, url, [primaryImage]);
    if (!primaryImage && allImages.length > 0) {
      primaryImage = allImages[0];
    }

    return {
      title: title || 'Untitled Blog Post',
      description: description || '',
      url: canonicalUrl,
      cleanUrl: cleanUrl(canonicalUrl),
      image: primaryImage || '',
      images: allImages,
      siteName: siteName || '',
      author: author || '',
      tags: tags.slice(0, 8),
      extractedAt: new Date().toISOString()
    };
  }

  // Export to global scope
  const SocialExtractor = {
    extractMetadata,
    cleanUrl,
    resolveUrl,
    isValidImageUrl
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialExtractor;
  } else {
    global.SocialExtractor = SocialExtractor;
  }
})(typeof window !== 'undefined' ? window : this);

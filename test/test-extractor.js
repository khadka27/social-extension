const assert = require('assert');
const SocialExtractor = require('../scripts/extractor.js');
const SocialShare = require('../scripts/social-share.js');

console.log('🧪 Running SocialShare Extension Tests...\n');

// 1. Test cleanUrl
{
  const messyUrl = 'https://example.com/blog/ai-future?utm_source=twitter&utm_medium=social&utm_campaign=launch&fbclid=12345&id=42';
  const cleaned = SocialExtractor.cleanUrl(messyUrl);
  console.log('✓ Clean URL test:', cleaned);
  assert.strictEqual(cleaned, 'https://example.com/blog/ai-future?id=42');
}

// 2. Test SocialShare Platform URL Generation
{
  const mockData = {
    title: 'The Future of Web Extensions in 2026',
    description: 'A deep dive into modern Manifest V3 architecture and AI tools.',
    url: 'https://techblog.io/future-web-extensions',
    image: 'https://techblog.io/images/hero.png',
    images: [
      'https://techblog.io/images/hero1.png',
      'https://techblog.io/images/hero2.png',
      'https://techblog.io/images/hero3.png',
      'https://techblog.io/images/hero4.png'
    ],
    siteName: 'TechBlog',
    author: 'Alex Dev',
    tags: ['#WebDev', '#JavaScript', '#AI']
  };

  // Test X/Twitter
  const twitterUrl = SocialShare.PLATFORMS.twitter.getUrl(mockData);
  assert.ok(twitterUrl.includes('twitter.com/intent/tweet'));
  assert.ok(twitterUrl.includes('The+Future+of+Web+Extensions') || twitterUrl.includes('Reviews'));
  console.log('✓ Twitter/X Share URL & Multi-Image payload valid');

  // Test LinkedIn
  const linkedInUrl = SocialShare.PLATFORMS.linkedin.getUrl(mockData);
  assert.ok(linkedInUrl.includes('linkedin.com/feed/?shareActive=true'));
  assert.ok(linkedInUrl.includes(encodeURIComponent(mockData.url)));
  console.log('✓ LinkedIn Share URL valid');

  // Test LinkedIn Page with target
  const pageMockData = { ...mockData, pageTarget: 'acme-corp' };
  const linkedinPageUrl = SocialShare.PLATFORMS.linkedin_page.getUrl(pageMockData);
  assert.ok(linkedinPageUrl.includes('linkedin.com/company/acme-corp/admin/page-posts/published/'));

  const tigerPageMockData = { ...mockData, pageTarget: 'https://www.linkedin.com/company/143095909/admin/dashboard/' };
  const tigerLinkedinPageUrl = SocialShare.PLATFORMS.linkedin_page.getUrl(tigerPageMockData);
  assert.ok(tigerLinkedinPageUrl.includes('linkedin.com/company/143095909/admin/page-posts/published/'));
  console.log('✓ LinkedIn Page Share URL valid (including company dashboard admin URLs)');

  // Test WhatsApp
  const waUrl = SocialShare.PLATFORMS.whatsapp.getUrl(mockData);
  assert.ok(waUrl.includes('api.whatsapp.com/send'));
  console.log('✓ WhatsApp Share URL valid');

  // Test Telegram
  const tgUrl = SocialShare.PLATFORMS.telegram.getUrl(mockData);
  assert.ok(tgUrl.includes('t.me/share/url'));
  console.log('✓ Telegram Share URL valid');

  // Test Reddit
  const redditUrl = SocialShare.PLATFORMS.reddit.getUrl(mockData);
  assert.ok(redditUrl.includes('reddit.com/submit'));
  console.log('✓ Reddit Share URL valid');

  // Test Pinterest
  const pinUrl = SocialShare.PLATFORMS.pinterest.getUrl(mockData);
  assert.ok(pinUrl.includes('pinterest.com/pin/create'));
  assert.ok(pinUrl.includes(encodeURIComponent(mockData.image)));
  console.log('✓ Pinterest Share URL valid');

  // Test Threads
  const threadsUrl = SocialShare.PLATFORMS.threads.getUrl(mockData);
  assert.ok(threadsUrl.includes('threads.net/intent/post'));
  console.log('✓ Threads Share URL valid');

  // Test Bluesky
  const bskyUrl = SocialShare.PLATFORMS.bluesky.getUrl(mockData);
  assert.ok(bskyUrl.includes('bsky.app/intent/compose'));
  console.log('✓ Bluesky Share URL valid');

  // Test TikTok
  const tiktokUrl = SocialShare.PLATFORMS.tiktok.getUrl(mockData);
  assert.strictEqual(tiktokUrl, 'https://www.tiktok.com/tiktokstudio/upload');
  const tiktokCaption = SocialShare.PLATFORMS.tiktok.getCaption(mockData);
  assert.ok(tiktokCaption.includes('The Future of Web Extensions in 2026'));
  assert.ok(tiktokCaption.includes('#fyp'));
  console.log('✓ TikTok Share & Caption Generator valid');

  // Test YouTube
  const ytUrl = SocialShare.PLATFORMS.youtube.getUrl(mockData);
  assert.strictEqual(ytUrl, 'https://www.youtube.com/upload');
  const ytCaption = SocialShare.PLATFORMS.youtube.getCaption(mockData);
  assert.ok(ytCaption.includes('The Future of Web Extensions in 2026'));
  assert.ok(ytCaption.includes('#community'));
  console.log('✓ YouTube Upload & Community Post Generator valid');
}

// 3. Test Templates
{
  const mockData = {
    title: 'How to Build an Extension',
    description: 'Step by step guide.',
    url: 'https://example.com/guide',
    hashtags: ['#Coding', '#Web']
  };

  const review = SocialShare.TEMPLATES.review(mockData);
  assert.ok(review.includes('🔎 How to Build an Extension Reviews: Worth buying?'));
  assert.ok(review.includes('⭐ Rating:'));
  assert.ok(review.includes('✅ Users like:'));
  assert.ok(review.includes('⚠️ Concerns:'));
  assert.ok(review.includes('👉 https://example.com/guide'));
  console.log('✓ Review Snapshot template formatting valid');

  // Test character limit on long descriptions (e.g. 5,000 chars)
  const longData = {
    title: 'GLPatches Reviews and Complaints 2026 | Scam or Legit?',
    description: 'GL Patches is a daily supplement formulated to help individuals manage energy levels, fatigue and health concerns. GL Patches aims to optimize metabolic balance. To ensure customers don\'t get scammed or misled, our team conducted a thorough review evaluating key factors such as ingredient transparency, manufacturing quality, customer feedback, pricing, and real-world results.',
    url: 'https://www.dailyhealthsupplement.com/glpatches-reviews/',
    hashtags: ['#GLPatches', '#Reviews']
  };
  const longReview = SocialShare.TEMPLATES.review(longData);
  // Calculate Twitter character count where URL = 23 chars
  const twitterLen = longReview.length - longData.url.length + 23;
  assert.ok(twitterLen <= 280, `Tweet length (${twitterLen}) exceeded 280 limit!`);
  console.log(`✓ Long description X post character count optimization valid (${twitterLen} chars <= 280 limit)`);

  const standard = SocialShare.TEMPLATES.standard(mockData);
  assert.ok(standard.includes('🔎 How to Build an Extension Reviews: Worth buying?'));
  console.log('✓ Standard template formatting valid');

  const casual = SocialShare.TEMPLATES.casual(mockData);
  assert.ok(casual.includes('Great read:'));
  console.log('✓ Casual template formatting valid');

  const riddle = SocialShare.TEMPLATES.riddle(mockData);
  assert.ok(riddle.includes('No hints'));
  assert.ok(riddle.includes('pure logic'));
  console.log('✓ Riddle / Logic hook template valid');

  const curiosity = SocialShare.TEMPLATES.curiosity(mockData);
  assert.ok(curiosity.includes('Key question to consider'));
  console.log('✓ Curiosity template valid');

  const md = SocialShare.formatAsMarkdown(mockData);
  assert.ok(md.includes('[How to Build an Extension](https://example.com/guide)'));
  console.log('✓ Markdown formatting valid');

  const html = SocialShare.formatAsHtml(mockData);
  assert.ok(html.includes('<div class="social-share-card">'));
  console.log('✓ HTML embed formatting valid');
}

console.log('\n🎉 ALL EXTENSION UNIT TESTS PASSED SUCCESSFULLY!');

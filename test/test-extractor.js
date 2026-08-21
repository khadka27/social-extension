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
    siteName: 'TechBlog',
    author: 'Alex Dev',
    tags: ['#WebDev', '#JavaScript', '#AI']
  };

  // Test X/Twitter
  const twitterUrl = SocialShare.PLATFORMS.twitter.getUrl(mockData);
  assert.ok(twitterUrl.includes('twitter.com/intent/tweet'));
  assert.ok(twitterUrl.includes('The+Future+of+Web+Extensions'));
  console.log('✓ Twitter/X Share URL valid');

  // Test LinkedIn
  const linkedInUrl = SocialShare.PLATFORMS.linkedin.getUrl(mockData);
  assert.ok(linkedInUrl.includes('linkedin.com/feed/?shareActive=true'));
  assert.ok(linkedInUrl.includes(encodeURIComponent(mockData.url)));
  console.log('✓ LinkedIn Share URL valid');

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
  assert.strictEqual(tiktokUrl, 'https://www.tiktok.com/upload');
  const tiktokCaption = SocialShare.PLATFORMS.tiktok.getCaption(mockData);
  assert.ok(tiktokCaption.includes('The Future of Web Extensions in 2026'));
  assert.ok(tiktokCaption.includes('#fyp'));
  console.log('✓ TikTok Share & Caption Generator valid');

  // Test YouTube
  const ytUrl = SocialShare.PLATFORMS.youtube.getUrl(mockData);
  assert.strictEqual(ytUrl, 'https://studio.youtube.com/');
  const ytCaption = SocialShare.PLATFORMS.youtube.getCaption(mockData);
  assert.ok(ytCaption.includes('The Future of Web Extensions in 2026'));
  assert.ok(ytCaption.includes('#community'));
  console.log('✓ YouTube Community Post Generator valid');
}

// 3. Test Templates
{
  const mockData = {
    title: 'How to Build an Extension',
    description: 'Step by step guide.',
    url: 'https://example.com/guide',
    hashtags: ['#Coding', '#Web']
  };

  const standard = SocialShare.TEMPLATES.standard(mockData);
  assert.ok(standard.includes('📖 How to Build an Extension'));
  assert.ok(standard.includes('#Coding #Web'));
  console.log('✓ Standard template formatting valid');

  const casual = SocialShare.TEMPLATES.casual(mockData);
  assert.ok(casual.includes('Just found this great read!'));
  console.log('✓ Casual template formatting valid');

  const riddle = SocialShare.TEMPLATES.riddle(mockData);
  assert.ok(riddle.includes('No hints'));
  assert.ok(riddle.includes('Just pure logic'));
  console.log('✓ Riddle / Logic hook template valid');

  const curiosity = SocialShare.TEMPLATES.curiosity(mockData);
  assert.ok(curiosity.includes('99% of people'));
  console.log('✓ Curiosity template valid');

  const md = SocialShare.formatAsMarkdown(mockData);
  assert.ok(md.includes('[How to Build an Extension](https://example.com/guide)'));
  console.log('✓ Markdown formatting valid');

  const html = SocialShare.formatAsHtml(mockData);
  assert.ok(html.includes('<div class="social-share-card">'));
  console.log('✓ HTML embed formatting valid');
}

console.log('\n🎉 ALL EXTENSION UNIT TESTS PASSED SUCCESSFULLY!');

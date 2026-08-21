/**
 * SocialShare - Carousel Slideshow & Video Generator Engine
 * Transforms fetched article images, title, and description into a smooth,
 * animated sliding carousel video (WebM/MP4) using HTML5 Canvas & MediaRecorder.
 * Ideal for TikTok, YouTube Shorts, Instagram Reels, Facebook, and Twitter.
 */

(function (global) {
  'use strict';

  const VideoGenerator = {
    /**
     * Loads an image URL into an HTMLImageElement
     * @param {string} url 
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(url) {
      return new Promise((resolve, reject) => {
        if (!url) {
          resolve(null);
          return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          // If CORS fails, resolve null gracefully
          resolve(null);
        };
        img.src = url;
      });
    },

    /**
     * Creates and records a dynamic sliding carousel video
     * @param {Object} options
     * @param {string} options.title - Article title
     * @param {string} options.description - Summary text
     * @param {string} options.url - Article URL
     * @param {string} options.siteName - Domain / Publisher name
     * @param {Array<string>} options.images - List of image URLs
     * @param {string} [options.aspectRatio='9:16'] - '9:16' (vertical) or '1:1' (square)
     * @param {number} [options.secondsPerSlide=3] - Duration per slide
     * @param {Function} [onProgress] - Callback with percentage progress
     * @returns {Promise<{ blob: Blob, url: string }>}
     */
    async generateCarouselVideo(options, onProgress = null) {
      const {
        title = 'Untitled Article',
        description = '',
        url = '',
        siteName = 'Blog Post',
        images = [],
        aspectRatio = '9:16',
        secondsPerSlide = 2.5
      } = options;

      // Determine dimensions
      const isVertical = aspectRatio === '9:16';
      const width = isVertical ? 720 : 720;
      const height = isVertical ? 1280 : 720;
      const fps = 30;

      // 1. Preload available images
      if (onProgress) onProgress(10, 'Loading article images...');
      const loadedImages = [];
      for (const imgUrl of images.slice(0, 6)) {
        try {
          const img = await this.loadImage(imgUrl);
          if (img && img.naturalWidth > 50) {
            loadedImages.push(img);
          }
        } catch (e) {}
      }

      // 2. Prepare Slide Deck
      // Slide 0: Hook / Intro Title Card
      // Slide 1..N: Image Slides with text overlay
      // Final Slide: Outro / Call-to-action Card
      const slides = [];

      // Intro Slide
      slides.push({
        type: 'intro',
        title: title,
        subtitle: siteName,
        desc: description.slice(0, 140)
      });

      // Image Slides
      if (loadedImages.length > 0) {
        loadedImages.forEach((img, idx) => {
          slides.push({
            type: 'image',
            image: img,
            caption: idx === 0 && description ? description.slice(0, 100) + '...' : `Insight #${idx + 1}`,
            index: idx + 1,
            total: loadedImages.length
          });
        });
      } else {
        // Fallback text slide if no images
        slides.push({
          type: 'text',
          text: description || title
        });
      }

      // Outro Slide
      slides.push({
        type: 'outro',
        title: 'Read Full Story',
        siteName: siteName,
        url: url.replace(/^https?:\/\//, '').split('?')[0]
      });

      // 3. Setup Offscreen Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      // 4. Setup MediaRecorder
      const stream = canvas.captureStream(fps);
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 3000000 // 3 Mbps high quality
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordPromise = new Promise((resolve, reject) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const videoUrl = URL.createObjectURL(blob);
          resolve({ blob, url: videoUrl });
        };
        recorder.onerror = (err) => reject(err);
      });

      recorder.start();

      // 5. Render Loop with smooth sliding transitions
      const totalSlides = slides.length;
      const framesPerSlide = Math.floor(fps * secondsPerSlide);
      const transitionFrames = Math.floor(fps * 0.5); // 0.5s transition
      const totalFrames = totalSlides * framesPerSlide;

      for (let frame = 0; frame < totalFrames; frame++) {
        const slideIndex = Math.floor(frame / framesPerSlide);
        const frameInSlide = frame % framesPerSlide;
        const nextSlideIndex = (slideIndex + 1) % totalSlides;

        const currentSlide = slides[slideIndex];
        const nextSlide = slides[nextSlideIndex];

        // Transition progress (0 to 1 during the last 0.5s of a slide)
        let transitionProgress = 0;
        if (frameInSlide >= framesPerSlide - transitionFrames && slideIndex < totalSlides - 1) {
          transitionProgress = (frameInSlide - (framesPerSlide - transitionFrames)) / transitionFrames;
          // Smooth easeInOut
          transitionProgress = transitionProgress < 0.5
            ? 2 * transitionProgress * transitionProgress
            : -1 + (4 - 2 * transitionProgress) * transitionProgress;
        }

        // Render Current Frame
        this.renderSlide(ctx, currentSlide, width, height, frameInSlide / framesPerSlide);

        // If transitioning, slide next slide over from right
        if (transitionProgress > 0 && nextSlide) {
          ctx.save();
          ctx.translate(width * (1 - transitionProgress), 0);
          this.renderSlide(ctx, nextSlide, width, height, 0);
          ctx.restore();
        }

        // Draw overall slide progress bar at top
        this.drawProgressBar(ctx, width, frame / totalFrames, totalSlides, slideIndex);

        if (onProgress && frame % 15 === 0) {
          const percent = Math.floor(15 + (frame / totalFrames) * 80);
          onProgress(percent, `Rendering frame ${frame}/${totalFrames}...`);
        }

        // Small yield to prevent freezing
        await new Promise(r => setTimeout(r, 1000 / fps));
      }

      if (onProgress) onProgress(98, 'Finalizing video file...');
      recorder.stop();

      const result = await recordPromise;
      if (onProgress) onProgress(100, 'Video generated successfully! 🎬');
      return result;
    },

    /**
     * Renders an individual slide with smooth zoom / pan Ken Burns effect
     */
    renderSlide(ctx, slide, width, height, progress) {
      // 1. Background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);

      // Ambient glow orbs
      const orbGrad = ctx.createRadialGradient(width * 0.8, height * 0.2, 0, width * 0.8, height * 0.2, 350);
      orbGrad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
      orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = orbGrad;
      ctx.fillRect(0, 0, width, height);

      if (slide.type === 'intro') {
        this.renderIntroSlide(ctx, slide, width, height, progress);
      } else if (slide.type === 'image') {
        this.renderImageSlide(ctx, slide, width, height, progress);
      } else if (slide.type === 'outro') {
        this.renderOutroSlide(ctx, slide, width, height, progress);
      } else {
        this.renderTextSlide(ctx, slide, width, height, progress);
      }
    },

    renderIntroSlide(ctx, slide, width, height, progress) {
      const zoom = 1 + progress * 0.05;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // Top Badge
      const badgeText = `⚡ ${slide.subtitle.toUpperCase()}`;
      ctx.fillStyle = '#6366F1';
      this.roundedRect(ctx, 40, height * 0.22, 220, 36, 18);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px "Outfit", "Inter", sans-serif';
      ctx.fillText(badgeText, 60, height * 0.22 + 24);

      // Large Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 38px "Outfit", "Inter", sans-serif';
      this.wrapText(ctx, slide.title, 40, height * 0.32, width - 80, 52, 4);

      // Excerpt Card
      if (slide.desc) {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        this.roundedRect(ctx, 40, height * 0.62, width - 80, 160, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '20px "Inter", sans-serif';
        this.wrapText(ctx, `"${slide.desc}"`, 60, height * 0.62 + 45, width - 120, 32, 3);
      }

      // Swipe prompt
      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 18px "Outfit", "Inter", sans-serif';
      ctx.fillText('👉 Swipe for insights & images', 40, height - 60);

      ctx.restore();
    },

    renderImageSlide(ctx, slide, width, height, progress) {
      const img = slide.image;
      if (!img) return;

      // Ken Burns smooth zoom/pan
      const zoom = 1 + progress * 0.08;
      const panY = progress * 15;

      ctx.save();
      ctx.translate(width / 2, height * 0.42);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height * 0.42 + panY);

      // Draw Image centered with cover fit
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const targetW = width - 40;
      const targetH = height * 0.58;
      let drawW, drawH, drawX, drawY;

      if (imgAspect > targetW / targetH) {
        drawH = targetH;
        drawW = targetH * imgAspect;
        drawX = (width - drawW) / 2;
        drawY = height * 0.12;
      } else {
        drawW = targetW;
        drawH = targetW / imgAspect;
        drawX = 20;
        drawY = height * 0.12 + (targetH - drawH) / 2;
      }

      // Rounded container shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;
      this.roundedRect(ctx, drawX, drawY, drawW, drawH, 16);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.restore();

      // Clip image to rounded rectangle
      ctx.save();
      this.roundedRect(ctx, drawX, drawY, drawW, drawH, 16);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      ctx.restore();

      // Image Count Badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      this.roundedRect(ctx, 40, height * 0.74, 110, 32, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 14px "Outfit", "Inter", sans-serif';
      ctx.fillText(`📸 ${slide.index} / ${slide.total}`, 55, height * 0.74 + 21);

      // Caption Overlay Card
      if (slide.caption) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        this.roundedRect(ctx, 30, height * 0.81, width - 60, 95, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 19px "Outfit", "Inter", sans-serif';
        this.wrapText(ctx, slide.caption, 48, height * 0.81 + 35, width - 96, 28, 2);
      }
    },

    renderOutroSlide(ctx, slide, width, height, progress) {
      const pulse = 1 + Math.sin(progress * Math.PI * 2) * 0.03;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-width / 2, -height / 2);

      // Big Glowing Icon
      ctx.fillStyle = '#6366F1';
      ctx.beginPath();
      ctx.arc(width / 2, height * 0.32, 55, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔗', width / 2, height * 0.32 + 15);

      // Headline
      ctx.font = 'bold 36px "Outfit", "Inter", sans-serif';
      ctx.fillText('READ FULL ARTICLE', width / 2, height * 0.48);

      // Subtitle
      ctx.fillStyle = '#94A3B8';
      ctx.font = '20px "Inter", sans-serif';
      ctx.fillText(`Published by ${slide.siteName}`, width / 2, height * 0.54);

      // CTA Link Box
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 2;
      this.roundedRect(ctx, 50, height * 0.64, width - 100, 60, 30);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 18px "Outfit", "Inter", sans-serif';
      ctx.fillText(`👉 ${slide.url}`, width / 2, height * 0.64 + 37);

      ctx.textAlign = 'start';
      ctx.restore();
    },

    renderTextSlide(ctx, slide, width, height, progress) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "Outfit", "Inter", sans-serif';
      this.wrapText(ctx, slide.text, 40, height * 0.35, width - 80, 46, 6);
    },

    drawProgressBar(ctx, width, overallProgress, totalSlides, currentSlideIdx) {
      const barH = 5;
      const pad = 15;
      const totalW = width - pad * 2;
      const segmentW = (totalW - (totalSlides - 1) * 6) / totalSlides;

      for (let i = 0; i < totalSlides; i++) {
        const segX = pad + i * (segmentW + 6);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.roundedRect(ctx, segX, 15, segmentW, barH, 2.5);
        ctx.fill();

        if (i < currentSlideIdx) {
          ctx.fillStyle = '#38BDF8';
          this.roundedRect(ctx, segX, 15, segmentW, barH, 2.5);
          ctx.fill();
        } else if (i === currentSlideIdx) {
          const fillW = segmentW * ((overallProgress * totalSlides) % 1);
          ctx.fillStyle = '#38BDF8';
          this.roundedRect(ctx, segX, 15, fillW, barH, 2.5);
          ctx.fill();
        }
      }
    },

    roundedRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 10) {
      if (!text) return y;
      const paragraphs = text.split('\n');
      let currentY = y;
      let lineCount = 0;

      for (let p = 0; p < paragraphs.length; p++) {
        const words = paragraphs[p].split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
          const testLine = line + (line ? ' ' : '') + words[n];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n];
            currentY += lineHeight;
            lineCount++;
            if (lineCount >= maxLines) {
              ctx.fillText(line + '...', x, currentY);
              return currentY;
            }
          } else {
            line = testLine;
          }
        }
        if (line) {
          ctx.fillText(line, x, currentY);
          currentY += lineHeight;
          lineCount++;
          if (lineCount >= maxLines) return currentY;
        }
      }
      return currentY;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoGenerator;
  } else {
    global.VideoGenerator = VideoGenerator;
  }
})(typeof window !== 'undefined' ? window : globalThis);

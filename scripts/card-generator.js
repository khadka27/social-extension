/**
 * SocialShare - Visual Post & Note Card Generator
 * Generates aesthetic, viral image cards (Spiral Notebook, Sticky Note, Dark Glass, Editorial)
 * directly using HTML5 Canvas for 1-click sharing on Twitter, TikTok, Instagram, LinkedIn, etc.
 */

(function (global) {
  'use strict';

  const CARD_THEMES = {
    notebook: {
      id: 'notebook',
      name: '📔 Spiral Notebook',
      bg: '#F8F7F2',
      lineColor: '#D9D7CE',
      marginLineColor: '#F2A0A0',
      textColor: '#1A365D',
      font: 'Caveat, "Comic Sans MS", "Segoe Print", cursive, sans-serif'
    },
    sticky: {
      id: 'sticky',
      name: '🟨 Sticky Note',
      bg: '#FEF08A',
      textColor: '#1E293B',
      font: '"Outfit", "Inter", -apple-system, sans-serif'
    },
    darkglass: {
      id: 'darkglass',
      name: '🌌 Dark Glassmorphism',
      bg: 'linear-gradient(135deg, #0F172A, #1E1B4B)',
      textColor: '#FFFFFF',
      font: '"Outfit", "Inter", -apple-system, sans-serif'
    },
    youtube: {
      id: 'youtube',
      name: '🔴 YouTube Community Post',
      bg: '#0F0F0F',
      textColor: '#FFFFFF',
      font: '"Outfit", "Inter", -apple-system, sans-serif'
    },
    minimal: {
      id: 'minimal',
      name: '📄 Clean Paper',
      bg: '#FFFFFF',
      textColor: '#0F172A',
      font: '"Inter", -apple-system, sans-serif'
    }
  };

  /**
   * Wraps text to fit canvas width
   */
  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 14) {
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
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, x, currentY);
          line = words[n];
          currentY += lineHeight;
          lineCount++;
          if (lineCount >= maxLines) {
            ctx.fillText(line + '...', x, currentY);
            return currentY + lineHeight;
          }
        } else {
          line = testLine;
        }
      }

      if (line) {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
        lineCount++;
      }

      // Paragraph spacing
      currentY += lineHeight * 0.3;
    }

    return currentY;
  }

  /**
   * Draws a realistic Spiral Notebook Card (like the viral social media posts)
   */
  function drawNotebookCard(ctx, width, height, options) {
    const { title, text, footer, hook } = options;

    // Background drop shadow & outer dark canvas
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(0, 0, width, height);

    // Notebook Dimensions
    const padX = width * 0.08;
    const padY = height * 0.06;
    const nbWidth = width - padX * 2;
    const nbHeight = height - padY * 2;
    const cornerR = 24;

    // Outer Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;

    // Notebook Page Background
    ctx.fillStyle = '#FAF8F5';
    roundedRect(ctx, padX, padY, nbWidth, nbHeight, cornerR);
    ctx.fill();
    ctx.restore();

    // Subtle paper texture / gradient
    const paperGrad = ctx.createLinearGradient(padX, padY, padX + nbWidth, padY + nbHeight);
    paperGrad.addColorStop(0, '#FFFFFF');
    paperGrad.addColorStop(1, '#F3EFEA');
    ctx.fillStyle = paperGrad;
    roundedRect(ctx, padX, padY, nbWidth, nbHeight, cornerR);
    ctx.fill();

    // Spiral holes on the left
    const holeCount = 18;
    const spiralX = padX + 28;
    const spiralStep = (nbHeight - 40) / (holeCount - 1);

    for (let i = 0; i < holeCount; i++) {
      const holeY = padY + 20 + i * spiralStep;

      // Hole
      ctx.fillStyle = '#262626';
      ctx.beginPath();
      ctx.ellipse(spiralX, holeY, 7, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spiral Ring (Metallic loop)
      ctx.strokeStyle = '#8E8E93';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(spiralX - 16, holeY, 18, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();

      // Ring highlight
      ctx.strokeStyle = '#D1D1D6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(spiralX - 16, holeY, 17, -Math.PI * 0.25, Math.PI * 0.25);
      ctx.stroke();
    }

    // Vertical Pink Margin Line
    const marginX = spiralX + 45;
    ctx.strokeStyle = '#FCA5A5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, padY + 10);
    ctx.lineTo(marginX, padY + nbHeight - 10);
    ctx.stroke();

    // Horizontal Blue/Grey Ruled Lines
    const lineSpacing = 42;
    const firstLineY = padY + 60;
    const numLines = Math.floor((nbHeight - 90) / lineSpacing);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.2;
    for (let j = 0; j < numLines; j++) {
      const lineY = firstLineY + j * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(marginX + 8, lineY);
      ctx.lineTo(padX + nbWidth - 20, lineY);
      ctx.stroke();
    }

    // Handwriting Content Rendering
    const contentX = marginX + 30;
    const contentMaxWidth = nbWidth - (contentX - padX) - 35;
    let curY = firstLineY + 28;

    // 1. Hook / Sub-headline (e.g. "No hints, No clue...")
    if (hook) {
      ctx.fillStyle = '#E11D48';
      ctx.font = 'bold 28px "Caveat", "Comic Sans MS", cursive, sans-serif';
      curY = wrapText(ctx, hook, contentX, curY, contentMaxWidth, 38, 3) + 10;
    }

    // 2. Main Title / Question
    ctx.fillStyle = '#0F2850';
    ctx.font = 'bold 36px "Caveat", "Comic Sans MS", cursive, sans-serif';
    curY = wrapText(ctx, title, contentX, curY, contentMaxWidth, 44, 4) + 12;

    // 3. Body Excerpt / Key Points
    if (text) {
      ctx.fillStyle = '#1E3A8A';
      ctx.font = '28px "Caveat", "Comic Sans MS", cursive, sans-serif';
      curY = wrapText(ctx, text, contentX, curY, contentMaxWidth, 42, 6) + 10;
    }

    // 4. Footer Note (e.g. "No winner yet" or "What's your answer?")
    if (footer) {
      ctx.fillStyle = '#0284C7';
      ctx.font = 'bold 30px "Caveat", "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(footer, padX + nbWidth * 0.55, padY + nbHeight - 35);
      ctx.textAlign = 'start';
    }
  }

  /**
   * Draws a Vibrant Dark Glassmorphic Card
   */
  function drawDarkGlassCard(ctx, width, height, options) {
    const { title, text, footer, hook, siteName } = options;

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090D16');
    bgGrad.addColorStop(0.5, '#111827');
    bgGrad.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Glowing orb effects in background
    drawGlowOrb(ctx, width * 0.8, height * 0.2, 220, 'rgba(99, 102, 241, 0.25)');
    drawGlowOrb(ctx, width * 0.2, height * 0.8, 260, 'rgba(6, 182, 212, 0.2)');

    // Glass Card
    const pad = 40;
    const cardW = width - pad * 2;
    const cardH = height - pad * 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    roundedRect(ctx, pad, pad, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Top Site / Hook Badge
    const badgeText = hook || siteName || 'FEATURED POST';
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';
    ctx.lineWidth = 1.5;
    roundedRect(ctx, pad + 30, pad + 35, ctx.measureText(badgeText).width + 80, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#818CF8';
    ctx.font = 'bold 15px "Outfit", "Inter", sans-serif';
    ctx.fillText('✨ ' + badgeText.toUpperCase(), pad + 45, pad + 59);

    // Title
    let curY = pad + 120;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Outfit", "Inter", sans-serif';
    curY = wrapText(ctx, title, pad + 30, curY, cardW - 60, 48, 4) + 20;

    // Body
    if (text) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '20px "Inter", sans-serif';
      curY = wrapText(ctx, text, pad + 30, curY, cardW - 60, 32, 6) + 20;
    }

    // Footer
    if (footer) {
      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 18px "Outfit", "Inter", sans-serif';
      ctx.fillText(`👉 ${footer}`, pad + 30, pad + cardH - 40);
    }
  }

  /**
   * Draws a Sticky Note Card
   */
  function drawStickyCard(ctx, width, height, options) {
    const { title, text, footer, hook } = options;

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    const pad = 45;
    const cardW = width - pad * 2;
    const cardH = height - pad * 2;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 12;

    // Sticky Note Yellow
    ctx.fillStyle = '#FEF08A';
    roundedRect(ctx, pad, pad, cardW, cardH, 16);
    ctx.fill();
    ctx.restore();

    // Top Tape / Pin bar
    ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.fillRect(pad + cardW / 2 - 50, pad - 8, 100, 24);

    let curY = pad + 60;
    if (hook) {
      ctx.fillStyle = '#B45309';
      ctx.font = 'bold 22px "Outfit", "Inter", sans-serif';
      curY = wrapText(ctx, `🔥 ${hook}`, pad + 30, curY, cardW - 60, 30, 2) + 12;
    }

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 32px "Outfit", "Inter", sans-serif';
    curY = wrapText(ctx, title, pad + 30, curY, cardW - 60, 42, 4) + 14;

    if (text) {
      ctx.fillStyle = '#334155';
      ctx.font = '20px "Inter", sans-serif';
      curY = wrapText(ctx, text, pad + 30, curY, cardW - 60, 32, 6) + 10;
    }

    if (footer) {
      ctx.fillStyle = '#0F766E';
      ctx.font = 'bold 20px "Outfit", "Inter", sans-serif';
      ctx.fillText(footer, pad + 30, pad + cardH - 30);
    }
  }

  // Helpers
  function roundedRect(ctx, x, y, width, height, radius) {
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
  }

  function drawGlowOrb(ctx, cx, cy, radius, color) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Main function to render a post card to an HTML5 Canvas
   * @param {HTMLCanvasElement} canvas
   * @param {Object} options
   */
  function renderCard(canvas, options = {}) {
    const width = options.width || 800;
    const height = options.height || 800;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const theme = options.theme || 'notebook';

    if (theme === 'notebook') {
      drawNotebookCard(ctx, width, height, options);
    } else if (theme === 'sticky') {
      drawStickyCard(ctx, width, height, options);
    } else {
      drawDarkGlassCard(ctx, width, height, options);
    }
  }

  /**
   * Converts canvas to Blob/PNG and triggers download
   */
  function downloadCanvasImage(canvas, filename = 'social-post-card.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  /**
   * Copies canvas image to system clipboard
   */
  async function copyCanvasImage(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Canvas to blob failed'));
          return;
        }
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  const CardGenerator = {
    CARD_THEMES,
    renderCard,
    downloadCanvasImage,
    copyCanvasImage
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardGenerator;
  } else {
    global.CardGenerator = CardGenerator;
  }
})(typeof window !== 'undefined' ? window : this);

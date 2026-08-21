/**
 * SocialShare - Visual Post & Note Card Generator
 * Generates aesthetic, viral image cards (Spiral Notebook, YouTube Community, Sticky Note, Dark Glass)
 * directly using HTML5 Canvas for 1-click sharing on Twitter, TikTok, Instagram, LinkedIn, etc.
 */

(function (global) {
  'use strict';

  const CARD_THEMES = {
    notebook: {
      id: 'notebook',
      name: 'Spiral Notebook',
      bg: '#F8F7F2',
      lineColor: '#D9D7CE',
      marginLineColor: '#F2A0A0',
      textColor: '#1A365D',
      font: 'Caveat, "Comic Sans MS", "Segoe Print", cursive, sans-serif'
    },
    sticky: {
      id: 'sticky',
      name: 'Sticky Note',
      bg: '#FEF08A',
      textColor: '#1E293B',
      font: '"Outfit", "Inter", -apple-system, sans-serif'
    },
    darkglass: {
      id: 'darkglass',
      name: 'Dark Glassmorphism',
      bg: 'linear-gradient(135deg, #0F172A, #1E1B4B)',
      textColor: '#FFFFFF',
      font: '"Outfit", "Inter", -apple-system, sans-serif'
    },
    youtube: {
      id: 'youtube',
      name: 'YouTube Community Post',
      bg: '#0F0F0F',
      textColor: '#FFFFFF',
      font: '"Outfit", "Inter", -apple-system, sans-serif'
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
      currentY += lineHeight * 0.25;
    }

    return currentY;
  }

  /**
   * Draws a realistic Spiral Notebook Card (like the viral social media posts)
   */
  function drawNotebookCard(ctx, width, height, options) {
    const { title, text, footer, hook, siteName } = options;

    // Background drop shadow & outer dark canvas
    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(0, 0, width, height);

    // Notebook Dimensions
    const padX = width * 0.08;
    const padY = height * 0.06;
    const nbWidth = width - padX * 2;
    const nbHeight = height - padY * 2;
    const cornerR = 20;

    // Outer Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 16;

    // Notebook Page Background
    ctx.fillStyle = '#FAF8F5';
    roundedRect(ctx, padX, padY, nbWidth, nbHeight, cornerR);
    ctx.fill();
    ctx.restore();

    // Subtle paper texture gradient
    const paperGrad = ctx.createLinearGradient(padX, padY, padX + nbWidth, padY + nbHeight);
    paperGrad.addColorStop(0, '#FFFFFF');
    paperGrad.addColorStop(1, '#F4EFEA');
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
      ctx.fillStyle = '#22252A';
      ctx.beginPath();
      ctx.ellipse(spiralX, holeY, 6.5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spiral Ring (Metallic loop)
      ctx.strokeStyle = '#8E8E93';
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.arc(spiralX - 16, holeY, 18, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();

      // Ring highlight
      ctx.strokeStyle = '#E5E5EA';
      ctx.lineWidth = 1.4;
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

    // Horizontal Ruled Lines
    const lineSpacing = 38;
    const firstLineY = padY + 54;
    const numLines = Math.floor((nbHeight - 80) / lineSpacing);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.2;
    for (let j = 0; j < numLines; j++) {
      const lineY = firstLineY + j * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(marginX + 8, lineY);
      ctx.lineTo(padX + nbWidth - 20, lineY);
      ctx.stroke();
    }

    // Top Right Date / Stamp
    const now = new Date();
    const dateStr = `Date: ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 16px "Caveat", "Comic Sans MS", cursive, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, padX + nbWidth - 25, padY + 36);
    ctx.textAlign = 'start';

    // Handwriting Content Rendering
    const contentX = marginX + 24;
    const contentMaxWidth = nbWidth - (contentX - padX) - 30;
    let curY = firstLineY + 24;

    // 1. Hook (Red pen)
    if (hook) {
      ctx.fillStyle = '#E11D48';
      ctx.font = 'bold 26px "Caveat", "Comic Sans MS", cursive, sans-serif';
      curY = wrapText(ctx, hook, contentX, curY, contentMaxWidth, 34, 2) + 8;
    }

    // 2. Main Title (Dark blue ink)
    if (title) {
      ctx.fillStyle = '#0F2850';
      ctx.font = 'bold 34px "Caveat", "Comic Sans MS", cursive, sans-serif';
      curY = wrapText(ctx, title, contentX, curY, contentMaxWidth, 38, 3) + 10;
    }

    // 3. Body Text (Blue ink)
    if (text && text !== title) {
      ctx.fillStyle = '#1E3A8A';
      ctx.font = '26px "Caveat", "Comic Sans MS", cursive, sans-serif';
      curY = wrapText(ctx, text, contentX, curY, contentMaxWidth, 36, 7) + 8;
    }

    // 4. Footer Note (Cyan/Blue call-to-action)
    if (footer) {
      ctx.fillStyle = '#0284C7';
      ctx.font = 'bold 28px "Caveat", "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(footer, padX + nbWidth * 0.54, padY + nbHeight - 32);
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

    // Glowing orb effects
    drawGlowOrb(ctx, width * 0.8, height * 0.2, 220, 'rgba(59, 130, 246, 0.22)');
    drawGlowOrb(ctx, width * 0.2, height * 0.8, 260, 'rgba(56, 189, 248, 0.18)');

    // Glass Card
    const pad = 36;
    const cardW = width - pad * 2;
    const cardH = height - pad * 2;
    const radius = 24;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    // Glass backdrop
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundedRect(ctx, pad, pad, cardW, cardH, radius);
    ctx.fill();

    // Glass border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Top Brand Tag
    ctx.fillStyle = '#38BDF8';
    ctx.font = '600 15px "Outfit", sans-serif';
    ctx.fillText(siteName ? siteName.toUpperCase() : 'INSIGHT', pad + 32, pad + 48);

    // Window controls
    const dotY = pad + 44;
    const dotStart = pad + cardW - 60;
    drawDot(ctx, dotStart, dotY, 6, '#EF4444');
    drawDot(ctx, dotStart + 18, dotY, 6, '#F59E0B');
    drawDot(ctx, dotStart + 36, dotY, 6, '#10B981');

    // Separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad + 32, pad + 70);
    ctx.lineTo(pad + cardW - 32, pad + 70);
    ctx.stroke();

    let textY = pad + 115;
    const maxTextW = cardW - 64;

    // Hook
    if (hook) {
      ctx.fillStyle = '#F43F5E';
      ctx.font = '600 20px "Outfit", sans-serif';
      textY = wrapText(ctx, hook, pad + 32, textY, maxTextW, 28, 2) + 12;
    }

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px "Outfit", sans-serif';
    textY = wrapText(ctx, title, pad + 32, textY, maxTextW, 40, 4) + 16;

    // Text
    if (text && text !== title) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '19px "Inter", sans-serif';
      textY = wrapText(ctx, text, pad + 32, textY, maxTextW, 30, 5) + 16;
    }

    // Footer
    if (footer) {
      ctx.fillStyle = '#38BDF8';
      ctx.font = '600 17px "Outfit", sans-serif';
      ctx.fillText(footer, pad + 32, pad + cardH - 32);
    }
  }

  /**
   * Draws a YouTube Community Post Card
   */
  function drawYouTubeCommunityCard(ctx, width, height, options) {
    const { title, text, footer, hook, siteName } = options;

    ctx.fillStyle = '#0F0F0F';
    ctx.fillRect(0, 0, width, height);

    drawGlowOrb(ctx, width * 0.5, height * 0.25, 280, 'rgba(255, 0, 0, 0.12)');

    const pad = 36;
    const cardW = width - pad * 2;
    const cardH = height - pad * 2;
    const radius = 18;

    // Card background
    ctx.fillStyle = '#1A1A1A';
    roundedRect(ctx, pad, pad, cardW, cardH, radius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // YouTube Header
    const headY = pad + 40;
    
    // YouTube Avatar Circle
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(pad + 44, headY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Play icon inside avatar
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(pad + 40, headY - 8);
    ctx.lineTo(pad + 52, headY);
    ctx.lineTo(pad + 40, headY + 8);
    ctx.closePath();
    ctx.fill();

    // Channel Name & Badge
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Outfit", sans-serif';
    ctx.fillText(siteName || 'YouTube Community', pad + 76, headY - 2);

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '13px "Inter", sans-serif';
    ctx.fillText('Official Post • Just now', pad + 76, headY + 16);

    // Separator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(pad + 24, pad + 80);
    ctx.lineTo(pad + cardW - 24, pad + 80);
    ctx.stroke();

    let textY = pad + 125;
    const maxW = cardW - 48;

    if (hook) {
      ctx.fillStyle = '#FF4D4D';
      ctx.font = '600 20px "Outfit", sans-serif';
      textY = wrapText(ctx, hook, pad + 24, textY, maxW, 28, 2) + 12;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Outfit", sans-serif';
    textY = wrapText(ctx, title, pad + 24, textY, maxW, 38, 4) + 14;

    if (text && text !== title) {
      ctx.fillStyle = '#D4D4D4';
      ctx.font = '18px "Inter", sans-serif';
      textY = wrapText(ctx, text, pad + 24, textY, maxW, 28, 5) + 14;
    }

    // Engagement Bar at bottom
    const barY = pad + cardH - 35;
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillText(footer || 'Vote or Comment below', pad + 24, barY);
  }

  /**
   * Draws a Realistic Yellow Sticky Note Card
   */
  function drawStickyCard(ctx, width, height, options) {
    const { title, text, footer, hook } = options;

    ctx.fillStyle = '#0B0D14';
    ctx.fillRect(0, 0, width, height);

    const pad = 44;
    const cardW = width - pad * 2;
    const cardH = height - pad * 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 16;

    ctx.fillStyle = '#FEF08A';
    roundedRect(ctx, pad, pad, cardW, cardH, 8);
    ctx.fill();
    ctx.restore();

    // Tape on top
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    roundedRect(ctx, width / 2 - 50, pad - 12, 100, 24, 4);
    ctx.fill();

    let curY = pad + 60;
    const maxW = cardW - 48;

    if (hook) {
      ctx.fillStyle = '#DC2626';
      ctx.font = 'bold 24px "Caveat", cursive, sans-serif';
      curY = wrapText(ctx, hook, pad + 24, curY, maxW, 32, 2) + 10;
    }

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 32px "Caveat", cursive, sans-serif';
    curY = wrapText(ctx, title, pad + 24, curY, maxW, 38, 4) + 12;

    if (text && text !== title) {
      ctx.fillStyle = '#334155';
      ctx.font = '25px "Caveat", cursive, sans-serif';
      curY = wrapText(ctx, text, pad + 24, curY, maxW, 34, 6) + 10;
    }

    if (footer) {
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 26px "Caveat", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(footer, width / 2, pad + cardH - 28);
      ctx.textAlign = 'start';
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

  function drawGlowOrb(ctx, x, y, radius, color) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDot(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Main Dispatcher to Render Card
   */
  function renderCard(canvas, options) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = options.width || 700;
    const height = options.height || 700;

    canvas.width = width;
    canvas.height = height;

    const theme = options.theme || 'notebook';

    switch (theme) {
      case 'youtube':
        drawYouTubeCommunityCard(ctx, width, height, options);
        break;
      case 'sticky':
        drawStickyCard(ctx, width, height, options);
        break;
      case 'darkglass':
        drawDarkGlassCard(ctx, width, height, options);
        break;
      case 'notebook':
      default:
        drawNotebookCard(ctx, width, height, options);
        break;
    }
  }

  // Export
  const CardGenerator = {
    CARD_THEMES,
    renderCard
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardGenerator;
  } else {
    global.CardGenerator = CardGenerator;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

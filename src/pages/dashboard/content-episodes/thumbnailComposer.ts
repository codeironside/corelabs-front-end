export type ThumbnailOverlayAlign = 'left' | 'center' | 'right';

export interface ThumbnailOverlayOptions {
  imageUrl: string;
  text: string;
  fontFamily: string;
  textColor: string;
  align: ThumbnailOverlayAlign;
  xPercent: number;
  yPercent: number;
  opacity: number;
}

const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;

export async function composeEpisodeThumbnail(options: ThumbnailOverlayOptions): Promise<File> {
  const image = await loadImage(options.imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare thumbnail canvas.');

  drawCoverImage(ctx, image, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  drawOverlay(ctx, options);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('Could not export edited thumbnail.'))), 'image/png', 0.95);
  });
  return new File([blob], 'episode-thumbnail.png', { type: 'image/png' });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load thumbnail image for editing.'));
    img.src = url;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const scaledWidth = image.naturalWidth * scale;
  const scaledHeight = image.naturalHeight * scale;
  const x = (width - scaledWidth) / 2;
  const y = (height - scaledHeight) / 2;
  ctx.drawImage(image, x, y, scaledWidth, scaledHeight);
}

function drawOverlay(ctx: CanvasRenderingContext2D, options: ThumbnailOverlayOptions) {
  const text = options.text.trim();
  if (!text) return;

  const boxWidth = OUTPUT_WIDTH * 0.84;
  const fontSize = 42;
  const lineHeight = 52;
  const horizontalPadding = 36;
  const verticalPadding = 24;
  const lines = wrapText(ctx, text, `${fontSize}px "${options.fontFamily}", Poppins, sans-serif`, boxWidth - horizontalPadding * 2);
  const boxHeight = lines.length * lineHeight + verticalPadding * 2;
  const centerX = (OUTPUT_WIDTH * clamp(options.xPercent, 8, 92)) / 100;
  const centerY = (OUTPUT_HEIGHT * clamp(options.yPercent, 10, 92)) / 100;
  const boxX = clamp(centerX - boxWidth / 2, 16, OUTPUT_WIDTH - boxWidth - 16);
  const boxY = clamp(centerY - boxHeight / 2, 16, OUTPUT_HEIGHT - boxHeight - 16);

  const bg = hexToRgb('#6c584c');
  ctx.fillStyle = `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${clamp(options.opacity, 0, 95) / 100})`;
  roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 18);
  ctx.fill();

  ctx.font = `600 ${fontSize}px "${options.fontFamily}", Poppins, sans-serif`;
  ctx.fillStyle = options.textColor;
  ctx.textBaseline = 'middle';
  ctx.textAlign = options.align;
  const textX = options.align === 'left'
    ? boxX + horizontalPadding
    : options.align === 'right'
      ? boxX + boxWidth - horizontalPadding
      : boxX + boxWidth / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, boxY + verticalPadding + lineHeight / 2 + index * lineHeight);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, font: string, maxWidth: number): string[] {
  ctx.font = font;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
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

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

import { formatDailyTipText } from "../app/daily-tip.js";
// A standalone text poster: no birth data, chart, or remote render service.
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The share image could not be loaded.'));
    image.src = url;
  });
}

export function wrapPosterText(context, text, maxWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    const tokens = /[\u3400-\u9fff]/u.test(paragraph) ? [...paragraph] : paragraph.split(/(?<=\s)/u);
    let line = '';
    for (const token of tokens) {
      if (line && context.measureText(line + token).width > maxWidth) {
        lines.push(line.trim());
        line = token.trimStart();
      } else line += token;
    }
    if (line) lines.push(line.trim());
  }
  return lines;
}

export async function createDailyTipPoster({ tip, language, date = new Date() }) {
  if (!tip) throw new Error('A saved result is required.');
  const [qr, moon] = await Promise.all([
    loadImage(new URL(globalThis.PLUTO_CONFIG?.buerShareQrPath || '../../assets/chart-qr.png', import.meta.url).href),
    loadImage(new URL('../../assets/buer-ai-orb.webp', import.meta.url).href).catch(() => null),
    document.fonts.ready,
  ]);
  const chinese = language === 'zh';
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#080e1b'; ctx.fillRect(0, 0, 1080, 1440);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#edf2ff';
  ctx.font = '58px Georgia, serif'; ctx.fillText(chinese ? '不二' : 'Buer', 86, 86);
  ctx.fillStyle = '#a7ccf5'; ctx.font = '24px sans-serif';
  ctx.fillText(new Intl.DateTimeFormat(chinese ? 'zh-CN' : 'en', {year:'numeric', month:'long', day:'numeric'}).format(date), 88, 183);
  if (moon) {
    ctx.globalCompositeOperation = "lighten";
    ctx.drawImage(moon, 785, 76, 210, 210);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.fillStyle = '#b2d8ff'; ctx.font = '28px sans-serif';
  ctx.fillText(chinese ? '今日提示' : 'A thought for today', 88, 320);
  ctx.fillRect(88, 370, 42, 2);
  let size = chinese ? 76 : 62;
  let lines;
  do {
    ctx.font = `300 ${size}px ${chinese ? '"Songti SC", "Noto Serif CJK SC",' : ''} Georgia, serif`;
    lines = wrapPosterText(ctx, formatDailyTipText(tip, language), 890);
    if (lines.length * size * 1.5 <= 475) break;
    size -= 2;
  } while (size > 38);
  ctx.fillStyle = '#edf2ff';
  lines.forEach((line, index) => ctx.fillText(line, 88, 432 + index * size * 1.5));
  ctx.font = '25px sans-serif'; ctx.fillStyle = '#a99c96';
  ctx.fillText(chinese ? '来自我最近一次的人生使用说明书' : 'From my latest Life Manual', 88, 986);
  ctx.fillStyle = '#514237'; ctx.fillRect(88, 1060, 904, 1);
  ctx.fillStyle = '#b2d8ff'; ctx.font = '32px Georgia, serif'; ctx.fillText(chinese ? '不二 · 人生使用说明书' : 'BUER · LIFE MANUAL', 88, 1150);
  ctx.fillStyle = '#a99c96'; ctx.font = '25px sans-serif';
  ctx.fillText(chinese ? '从了解自己开始' : 'Begin with self-knowledge', 88, 1210);
  ctx.font = '19px sans-serif';
  ctx.fillText((globalThis.PLUTO_CONFIG?.buerPublicUrl || 'https://human-design.wonderelian.com/').replace(/^https?:\/\//,'').replace(/\/$/,''), 88, 1280);
  // The source QR includes its white quiet zone; disable smoothing for crisp scanning.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, 780, 1110, 216, 216);
  ctx.fillStyle = '#a99c96'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(chinese ? '扫码，认识你自己' : 'Scan to explore', 888, 1348);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed.')), 'image/png'));
}

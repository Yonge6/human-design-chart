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
  const [qr, hero, orb] = await Promise.all([
    loadImage(new URL(globalThis.PLUTO_CONFIG?.buerShareQrPath || '../../assets/chart-qr.png', import.meta.url).href),
    loadImage(new URL('../../assets/buer-aurora-hero.webp', import.meta.url).href).catch(() => null),
    loadImage(new URL("../../assets/buer-orb-v2.png", import.meta.url).href),
    document.fonts.ready,
  ]);
  const chinese = language === 'zh';
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  const background = ctx.createLinearGradient(0, 0, 0, 1440);
  background.addColorStop(0, '#243e60'); background.addColorStop(1, '#15243b');
  ctx.fillStyle = background; ctx.fillRect(0, 0, 1080, 1440);
  if (hero) {
    const scale = Math.max(1080 / hero.width, 570 / hero.height);
    ctx.drawImage(hero, (1080 - hero.width * scale) / 2, 0, hero.width * scale, hero.height * scale);
    const fade = ctx.createLinearGradient(0, 200, 0, 580);
    fade.addColorStop(0, '#15243b00'); fade.addColorStop(1, '#1e3350');
    ctx.fillStyle = fade; ctx.fillRect(0, 0, 1080, 590);
  }
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#f2f6ff'; ctx.font = '64px sans-serif';
  ctx.fillText(`${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`, 74, 385);
  ctx.font = '23px sans-serif'; ctx.fillStyle = '#c5def5';
  ctx.fillText(new Intl.DateTimeFormat(chinese ? 'zh-CN' : 'en', {weekday:'long'}).format(date), 290, 422);
  ctx.textAlign = 'right'; ctx.font = '24px sans-serif'; ctx.fillText(String(date.getFullYear()), 1006, 424); ctx.textAlign = 'left';
  ctx.fillStyle = '#b9c8ff'; ctx.font = '26px sans-serif';
  ctx.fillText(chinese ? '今日提示' : 'A thought for today', 74, 540);
  let size = chinese ? 66 : 60;
  let lines;
  do {
    ctx.font = `300 ${size}px ${chinese ? '"Songti SC", "Noto Serif CJK SC",' : ''} Georgia, serif`;
    lines = wrapPosterText(ctx, formatDailyTipText(tip, language), 932);
    if (lines.length * size * 1.5 <= 350) break;
    size -= 2;
  } while (size > 30);
  ctx.fillStyle = '#f5f8ff';
  lines.forEach((line, index) => ctx.fillText(line, 74, 625 + index * size * 1.5));
  ctx.font = '22px sans-serif'; ctx.fillStyle = '#b9d0e6';
  ctx.fillText(chinese ? '来自我最近一次的人生说明书' : 'From my latest Life Manual', 74, Math.max(940, 625 + lines.length * size * 1.5 + 50));
  ctx.drawImage(orb, 68, 1170, 100, 100);
  ctx.fillStyle = '#f2f6ff'; ctx.font = '48px Georgia, serif';
  ctx.fillText(chinese ? '不二见己' : 'Buer Within', 192, 1170);
  ctx.font = '21px sans-serif'; ctx.fillStyle = '#b9d0e6';
  ctx.fillText((globalThis.PLUTO_CONFIG?.buerPublicUrl || 'https://human-design.wonderelian.com/').replace(/^https?:\/\//,'').replace(/\/$/,''), 194, 1240);
  // Preserve the white quiet zone and hard edges for reliable scanning.
  ctx.imageSmoothingEnabled = false; ctx.drawImage(qr, 800, 1150, 216, 216);
  ctx.font = '19px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(chinese ? '与真实的自己·温柔相遇' : 'Meet your true self, with kindness', 1016, 1384);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed.')), 'image/png'));
}

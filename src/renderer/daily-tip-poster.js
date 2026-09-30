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
        if (/^[，。！？；：、）”’]/u.test(token)) {
          const characters = [...line];
          const last = characters.pop();
          lines.push(characters.join('').trim());
          line = last + token;
        } else {
          lines.push(line.trim());
          line = token.trimStart();
        }
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
    loadImage(new URL('../../assets/companion-growth.webp', import.meta.url).href).catch(() => null),
    loadImage(new URL("../../assets/buer-companion-logo.png", import.meta.url).href),
    document.fonts.ready,
  ]);
  const chinese = language === 'zh';
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1440;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f5f1e8'; ctx.fillRect(0, 0, 1080, 1440);
  ctx.fillStyle = '#526649'; ctx.fillRect(0, 0, 1080, 18);
  ctx.strokeStyle = '#cbd0be'; ctx.lineWidth = 2;
  for (const y of [204, 1130]) { ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(1000, y); ctx.stroke(); }
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#526649'; ctx.font = '22px sans-serif';
  ctx.fillText('BUER WITHIN  /  DAILY NOTE', 80, 68);
  ctx.fillStyle = '#263a30'; ctx.font = '62px Georgia, serif';
  ctx.fillText(`${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`, 80, 112);
  ctx.font = '24px sans-serif'; ctx.fillStyle = '#5c6959'; ctx.textAlign = 'right';
  ctx.fillText(`${date.getFullYear()} · ${new Intl.DateTimeFormat(chinese ? 'zh-CN' : 'en', {weekday:'long'}).format(date)}`, 1000, 142); ctx.textAlign = 'left';
  ctx.fillStyle = '#c86732'; ctx.font = '26px sans-serif';
  ctx.fillText(chinese ? '今日提示 / 给自己的一句话' : 'A thought for today', 80, 267);
  let size = 64;
  let lines;
  do {
    ctx.font = `300 ${size}px ${chinese ? '"Songti SC", "Noto Serif CJK SC",' : ''} Georgia, serif`;
    lines = wrapPosterText(ctx, formatDailyTipText(tip, language), 920);
    if (lines.length * size * 1.5 <= 420) break;
    size -= 2;
  } while (size > 30);
  ctx.fillStyle = '#263a30';
  lines.forEach((line, index) => ctx.fillText(line, 80, 350 + index * size * 1.5));
  ctx.font = '22px sans-serif'; ctx.fillStyle = '#5c6959';
  ctx.fillText(chinese ? '来自我最近一次的人生说明书' : 'From my latest Life Manual', 80, 817);
  if (hero) ctx.drawImage(hero, 680, 790, 330, 330);
  ctx.fillStyle = '#526649'; ctx.font = '26px Georgia, "Songti SC", serif';
  ctx.fillText(chinese ? '一点点，回到自己。' : 'A little closer to yourself.', 80, 1015);
  ctx.drawImage(orb, 80, 1190, 84, 84);
  ctx.fillStyle = '#263a30'; ctx.font = '42px Georgia, serif';
  ctx.fillText(chinese ? '不二见己' : 'Buer Within', 186, 1190);
  ctx.font = '21px sans-serif'; ctx.fillStyle = '#5c6959';
  ctx.fillText((globalThis.PLUTO_CONFIG?.buerPublicUrl || 'https://buer.wonderelian.com/').replace(/^https?:\/\//,'').replace(/\/$/,''), 186, 1250);
  // Preserve the white quiet zone and hard edges for reliable scanning.
  ctx.imageSmoothingEnabled = false; ctx.drawImage(qr, 810, 1164, 190, 190);
  ctx.font = '19px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(chinese ? '扫码，认识自己' : 'Explore your Life Manual', 1000, 1370);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed.')), 'image/png'));
}

import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildWeb} from './build-web.mjs';

const root=resolve(import.meta.dirname,'..');
const publicUrl='https://yonge6.github.io/buer-life-manual-preview/';
const gitCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const {outputDirectory}=await buildWeb({environment:{
  PLUTO_GIT_COMMIT:gitCommit,
  PLUTO_BUILD_DATE:new Date().toISOString(),
  PLUTO_ENVIRONMENT:'preview',
  BUER_CHAT_ENABLED:'false',
  BUER_PUBLIC_URL:publicUrl,
  BUER_SHARE_QR_PATH:'../../assets/buer-preview-qr.png',
}});
const indexPath=resolve(outputDirectory,'index.html');
let html=await readFile(indexPath,'utf8');
html=html.replace(/<meta (?:property="og:image"|name="twitter:image")[^>]*>\s*/g,'')
  .replaceAll('https://human-design.wonderelian.com/',publicUrl)
  .replace('<meta name="viewport"','<meta name="robots" content="noindex, nofollow">\n  <meta name="viewport"');
await writeFile(indexPath,html);
await writeFile(resolve(outputDirectory,'robots.txt'),'User-agent: *\nDisallow: /\n');
await writeFile(resolve(outputDirectory,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${publicUrl}</loc></url></urlset>\n`);
await writeFile(resolve(outputDirectory,'.nojekyll'),'');
await writeFile(resolve(outputDirectory,'README.md'),`# 不二 · 人生使用说明书 — H5 体验版\n\n直接体验：${publicUrl}\n\n源码与许可证：https://github.com/Yonge6/human-design-chart/tree/${gitCommit}\n\n这是独立体验站，不覆盖原网站。包含新版首页、说明书计算、每日提示和图片分享。AI 服务未配置，在确认服务端密钥后另行启用。\n\n构建命令：node scripts/build-buer-preview.mjs\n\n许可证：AGPL-3.0-or-later。第三方声明见 THIRD_PARTY_NOTICES.md。\n`);
console.log(`Independent preview ready for ${publicUrl}; source ${gitCommit}`);

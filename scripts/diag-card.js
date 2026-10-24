// -*- coding: utf-8 -*-
/**
 * diag-card.js —— 图片通道诊断卡（公众号保存期剥图行为的定位工具）
 * 用法：node diag-card.js [--urls wx-urls.json] [--root 工作区根] [--key 卡片键] [--name wx-diag]
 *
 * 每格只变一个变量，用户把这张卡直接弄进公众号后台（**不经过秀米**）、保存并预览后，
 * 回报「①顶部那行字在不在 ②A–H 哪些格子有图案」，即可反推公众号保留了哪种写法。
 *
 * 判据表：
 *   ①  SVG 内文字存活？ → 判断整个 <svg> 是否被丢弃（与图无关）
 *   A  极简 <image href>（svg 直接子元素）
 *   B  <image href> 包在 <g> 里（模拟正卡结构）
 *   C  <image> + preserveAspectRatio（模拟草坪裁切写法）
 *   D  <foreignObject> 内嵌普通 <img> ← **2026-10 实测定论：公众号唯一存活通道**
 *   E  普通 <img>（svg 外，已知可用，对照组）
 *   F  动图 <image href>
 *   G  <image> 不写 width/height
 *   H  <image> href + xlink:href 双写
 *
 * 2026-10 实测结果：**只有 D 有图案**（A/B/C/F/G/H 全灭）⇒ 公众号保存期剥掉 SVG 内全部
 * <image>，唯一存活 = foreignObject + <img>。常规生成直接用 IMG_MODE=foreign，无需本诊断卡；
 * 仅当"换渠道/微信改版后图片又丢"时用它复现定位。
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const getOpt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : def; };
const ROOT = path.resolve(getOpt('--root', process.cwd()));
const URLS = path.resolve(getOpt('--urls', path.join(ROOT, 'wx-urls.json')));
const NAME = getOpt('--name', 'wx-diag');
const KEY = getOpt('--key', '');
if (!fs.existsSync(URLS)) { console.error(`✗ 找不到图链表：${URLS}`); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(URLS, 'utf8'));

const cards = cfg.cards || {};
const pickKey = KEY || Object.keys(cards).find(k => /^https?:/.test(cards[k].plant || '')) || Object.keys(cards)[0];
if (!pickKey) { console.error('✗ 图链表里没有可用的卡片'); process.exit(1); }
const pick = cards[pickKey];

const esc = s => String(s || '').replace(/&(?!amp;)/g, '&amp;');
const P = esc(pick.plant), G = esc(pick.gif || pick.plant), L = esc(cfg.lawn);

const CW = 86, GAP = 6, CH = 150;
const cx = i => 6.5 + i * (CW + GAP);
const f1 = n => n.toFixed(1);
const cell = (i, letter, rowY, inner, caption) => [
  `<rect x="${f1(cx(i))}" y="${rowY}" width="${CW}" height="${CH}" rx="6" fill="#FFFFFF" stroke="#4B3418" stroke-width="1.5"/>`,
  `<text x="${f1(cx(i) + CW / 2)}" y="${rowY + 18}" text-anchor="middle" font-size="16" font-weight="bold" fill="#4B3418">${letter}</text>`,
  inner,
  `<text x="${f1(cx(i) + CW / 2)}" y="${rowY + CH - 6}" text-anchor="middle" font-size="9" fill="#666666">${caption}</text>`,
].join('\n');

const ROW1 = 56, ROW2 = 226;
const EL = [];
EL.push(`<rect x="0" y="0" width="375" height="396" fill="#EEF3EA"/>`);
EL.push(`<text x="10" y="20" font-size="12.5" font-weight="bold" fill="#1F5C1F">① 能看到这行字 = SVG 矢量层活着</text>`);
EL.push(`<text x="10" y="36" font-size="10.5" fill="#777777">这行字也没了 = 整个 svg 在保存时被丢弃（与图无关）</text>`);
EL.push(cell(0, 'A', ROW1, `<image href="${P}" x="${f1(cx(0) + 6)}" y="${ROW1 + 34}" width="74" height="86"/>`, '极简 image href'));
EL.push(cell(1, 'B', ROW1, `<g><image href="${P}" x="${f1(cx(1) + 6)}" y="${ROW1 + 34}" width="74" height="86"/></g>`, 'image 在 g 里'));
EL.push(cell(2, 'C', ROW1, `<image href="${L}" x="${f1(cx(2) + 6)}" y="${ROW1 + 34}" width="74" height="86" preserveAspectRatio="xMidYMid slice"/>`, '带 preserveAspectRatio'));
EL.push(cell(3, 'D', ROW1, `<foreignObject x="${f1(cx(3) + 6)}" y="${ROW1 + 34}" width="74" height="86"><img xmlns="http://www.w3.org/1999/xhtml" src="${P}" style="display:block;width:74px;height:86px;"/></foreignObject>`, 'foreignObject+img'));
EL.push(cell(0, 'F', ROW2, `<image href="${G}" x="${f1(cx(0) + 6)}" y="${ROW2 + 42}" width="74" height="74"/>`, '动图 image href'));
EL.push(cell(1, 'G', ROW2, `<image href="${P}" x="${f1(cx(1) + 6)}" y="${ROW2 + 42}"/>`, 'image 不写宽高'));
EL.push(cell(2, 'H', ROW2, `<image href="${P}" xlink:href="${P}" x="${f1(cx(2) + 6)}" y="${ROW2 + 42}" width="74" height="86"/>`, 'href+xlink 双写'));
EL.push(`<text x="${f1(cx(3))}" y="${ROW2 + 50}" font-size="11.5" fill="#555555">E＝普通 img（svg 外，对照）</text>`);
EL.push(`<text x="${f1(cx(3))}" y="${ROW2 + 70}" font-size="11.5" fill="#555555">把有图案的字母发我即可。</text>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 375 396" width="100%" style="display:block;width:100%;height:auto;" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">
${EL.join('\n')}
</svg>`;

const head = `<p style="margin:0 0 12px;font-size:15px;line-height:1.85;color:#333333;">【图片通道诊断卡】请把这张卡<b>直接弄进公众号后台（不经过秀米）</b>，<b>保存并预览</b>后回答：<br>① 顶部「能看到这行字 = SVG 矢量层活着」在不在？<br>② A–H 哪些格子有图案？<br>回复示例：「①在；有图 D」。</p>
<p style="margin:0 0 6px;font-size:13px;line-height:1.7;color:#666666;">E ＝ 普通 img 标签（不在 SVG 里，对照组）</p>
<img src="${P}" style="display:block;width:74px;height:86px;margin:0 0 16px;">
<p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#666666;">A 极简 image　B image 在 g 里　C 带 preserveAspectRatio　D foreignObject　F 动图　G 不写宽高　H 双写</p>`;

const section = `<section style="margin:0;padding:10px 0;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;">
${head}
${svg}
</section>`;

fs.mkdirSync(ROOT, { recursive: true });
fs.writeFileSync(path.join(ROOT, `${NAME}.html`), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>图片通道诊断卡</title>
<style>body{margin:0;padding:24px 0;background:#EDEDED;}#wrap{max-width:375px;margin:0 auto;}</style>
</head>
<body>
<!-- 导入区：复制下方 section 起的全部代码 -->
<div id="wrap">
${section}
</div>
</body>
</html>
`);
fs.writeFileSync(path.join(ROOT, `${NAME}-xiumi.html`), `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:transparent;">
<!-- 导入区：复制下方 section 起的全部代码 -->
${section}
</body>
</html>
`);
fs.writeFileSync(path.join(ROOT, 'inject-diag.txt'), section + '\n');
console.log(`written: ${NAME}.html / ${NAME}-xiumi.html / inject-diag.txt  （卡片=${pickKey}）`);

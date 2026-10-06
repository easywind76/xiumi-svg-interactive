// -*- coding: utf-8 -*-
/**
 * gen-card.js —— 单卡片详情型 SVG 互动页生成器
 * 用法：node gen-card.js [输出文件.html]
 *
 * 与 gen-list.js 的区别：只放一个条目，做成「档案卡」式的大卡片，
 * 适合作为试点先验证链路，或用于单组织/单产品的重点介绍。
 */
const fs = require('fs');
const path = require('path');
const { rot, PLANTS, wrap, esc } = require('./lib.js');

const OUT = process.argv[2] || 'svg-card.html';

/* ================= 可编辑区：这一张卡的全部内容 ================= */
const ORG = {
  no: '02',                       // 编号徽章
  plant: 'cobcannon',             // 对应 lib.js PLANTS 的键
  plantName: '玉米加农炮',
  org: '校研究生会',
  tagline: '深埋机体的创意与研究核心',
  sections: [                     // 档案分段，label 会渲染成彩色胶囊
    { label: '植物技能', color: '#78C23C', text: '厚积薄发的学术究极形态——前期默默积累，一旦成型，就是全场最强火力。' },
    { label: '组织介绍', color: '#78C23C', text: '深埋机体的创意与研究核心，深耕学术交流与科研实践。认真做研究、认真做事的人，在这儿最舒服。' },
    { label: '招新宣言', color: '#E8A020', text: '研会招新｜“新”上人，就等你来！' },
    { label: '咨询群',   color: '#78C23C', text: '校研究生会（扫码加入官方招新咨询 QQ 群）' },
    { label: '为什么是它', color: '#9B59B6', text: '要两株玉米才能合成，前期很慢、成型后一击全场最高伤害——研究生生活也是如此。' }
  ],
  footer1: '研会招新宣讲｜9月23日 周三 18:00 · 人文楼 203',
  footer2: '扫码加入校研究生会招新咨询群 · 我们不见不散'
};

/* ================= 布局常量 ================= */
const W = 375;
const CARD_X = 12, CARD_W = W - 24;
const FS = 12, LH = 16, CHIP_FS = 10.5;
const DET_X = CARD_X + 8, DET_W = CARD_W - 16;
const TXT_X = DET_X + 12, TXT_W = DET_W - 24;
const CARD_Y = 118, TOP_H = 210;

/* ================= 逐段断行、算高度 ================= */
const chipW = (label) => label.length * CHIP_FS + 14;
const sections = ORG.sections.map(s => {
  const cw = chipW(s.label);
  const firstUnits = Math.floor((TXT_W - cw - 6) / FS);
  return { ...s, cw, lines: wrap(s.text, Math.floor(TXT_W / FS), firstUnits) };
});
const nLines = sections.reduce((a, s) => a + s.lines.length, 0);
const DH = 12 + nLines * LH + (sections.length - 1) * 6 + 12;
const cardH = TOP_H + DH + 12;

/* ================= 头部 ================= */
let head = '';
head += `<rect x="0" y="0" width="${W}" height="40" fill="#8FD7F0"/>`;
head += `<rect x="0" y="40" width="${W}" height="34" fill="#A7E2F7"/>`;
head += `<rect x="0" y="74" width="${W}" height="34" fill="#C9EFFB"/>`;
head += `<g fill="#FFFFFF"><circle cx="52" cy="24" r="12"/><circle cx="68" cy="18" r="15"/><circle cx="85" cy="25" r="10"/><rect x="48" y="24" width="38" height="11" rx="5.5"/></g>`;
head += rot(8, 322, 26, `<rect x="320.6" y="7" width="2.8" height="6" rx="1.4" fill="#EFA51B"/>`);
head += `<circle cx="322" cy="26" r="12" fill="#FFD93B" stroke="#E08E12" stroke-width="2"/><circle cx="322" cy="26" r="7.5" fill="#FFE97A"/>`;
head += `<rect x="46" y="14" width="283" height="70" rx="14" fill="#C4884A" stroke="#4A2C12" stroke-width="4"/>`;
head += `<circle cx="57" cy="26" r="4" fill="#F0D9A8" stroke="#4A2C12" stroke-width="2"/><circle cx="318" cy="26" r="4" fill="#F0D9A8" stroke="#4A2C12" stroke-width="2"/>`;
head += `<text x="${W / 2}" y="54" font-size="22" font-weight="bold" fill="#5A3512" text-anchor="middle" letter-spacing="2">${esc(ORG.org)}</text>`;
head += `<text x="${W / 2}" y="53" font-size="22" font-weight="bold" fill="#FFF6CC" text-anchor="middle" letter-spacing="2">${esc(ORG.org)}</text>`;
head += `<text x="${W / 2}" y="74" font-size="10.5" font-weight="bold" fill="#FFF3C4" text-anchor="middle" letter-spacing="1">${esc(ORG.plantName)} · 招新档案 No.${ORG.no}</text>`;
head += `<text x="${W / 2}" y="106" font-size="10.5" font-weight="bold" fill="#24540E" text-anchor="middle">↓ 点击下方草皮，解锁这个组织的完整档案</text>`;

/* ================= 卡片 ================= */
let card = '';
const y0 = CARD_Y;
card += `<rect x="${CARD_X}" y="${y0}" width="${CARD_W}" height="${cardH}" rx="16" fill="#8ED14A" stroke="#3A6B1C" stroke-width="3"/>`;
card += `<circle cx="${CARD_X + CARD_W - 26}" cy="${y0 + 26}" r="16" fill="#FFD93B" stroke="#4A2C12" stroke-width="2.5"/>`;
card += `<text x="${CARD_X + CARD_W - 26}" y="${y0 + 30.5}" font-size="12.5" font-weight="bold" fill="#4A2C12" text-anchor="middle">${ORG.no}</text>`;

const PS = 0.86, pw = 100 * PS;
card += `<g transform="translate(${((W - pw) / 2).toFixed(1)} ${y0 + 20}) scale(${PS})">${PLANTS[ORG.plant]()}</g>`;

const pnW = ORG.plantName.length * 11.5 + 20, pnX = W / 2 - pnW / 2, pnY = y0 + 130;
card += `<rect x="${pnX.toFixed(1)}" y="${pnY}" width="${pnW.toFixed(1)}" height="21" rx="10.5" fill="#B6F06A" stroke="#4A2C12" stroke-width="1.5"/>`;
card += `<text x="${W / 2}" y="${pnY + 15}" font-size="12" font-weight="bold" fill="#2C4F12" text-anchor="middle">${esc(ORG.plantName)}</text>`;
card += `<text x="${W / 2}" y="${y0 + 178}" font-size="24" font-weight="bold" fill="#243F0C" text-anchor="middle" letter-spacing="1">${esc(ORG.org)}</text>`;
card += `<text x="${W / 2}" y="${y0 + 198}" font-size="11" fill="#3B5A1C" text-anchor="middle">${esc(ORG.tagline)}</text>`;

/* 档案区（常驻，被遮罩盖住） */
const dY = y0 + TOP_H + 2;
card += `<rect x="${DET_X}" y="${dY}" width="${DET_W}" height="${DH}" rx="10" fill="#F0FAE2" stroke="#5BA82C" stroke-width="2"/>`;

let ly = dY + 12 + 12;
sections.forEach((s, si) => {
  card += `<rect x="${TXT_X}" y="${ly - 13}" width="${s.cw.toFixed(1)}" height="17" rx="8.5" fill="${s.color}" stroke="#3A5A18" stroke-width="1" pointer-events="none"/>`;
  card += `<text x="${(TXT_X + s.cw / 2).toFixed(1)}" y="${ly - 1}" font-size="${CHIP_FS}" font-weight="bold" fill="#FFFFFF" text-anchor="middle" pointer-events="none">${esc(s.label)}</text>`;
  s.lines.forEach((ln, k) => {
    const lx = k === 0 ? TXT_X + s.cw + 6 : TXT_X;
    card += `<text x="${lx.toFixed(1)}" y="${ly + k * LH}" font-size="${FS}" fill="#2A3D16" pointer-events="none">${esc(ln)}</text>`;
  });
  ly += s.lines.length * LH + (si === sections.length - 1 ? 0 : 6);
});

/* 遮罩（点击解锁） */
card += `<g transform="translate(${DET_X} ${dY})"><g>`;
card += `<rect x="0" y="0" width="${DET_W}" height="${DH}" rx="10" fill="#7A4E22" stroke="#3F2712" stroke-width="3"/>`;
const stripes = Math.max(1, Math.round(DH / 34));
for (let t = 1; t <= stripes; t++) {
  card += `<rect x="12" y="${Math.round(t * (DH / (stripes + 1)))}" width="${DET_W - 24}" height="3" rx="1.5" fill="#8F5E2E" pointer-events="none"/>`;
}
card += `<text x="${(DET_W / 2).toFixed(1)}" y="${(DH / 2 + 1).toFixed(1)}" font-size="13" font-weight="bold" fill="#FFE9B8" text-anchor="middle" letter-spacing="1" pointer-events="none">点击草皮 · 解锁档案</text>`;
card += `<text x="${(DET_W / 2).toFixed(1)}" y="${(DH / 2 + 18).toFixed(1)}" font-size="8" fill="#D9B98A" text-anchor="middle" letter-spacing="2" pointer-events="none">TAP TO UNLOCK</text>`;
card += `<animateTransform attributeName="transform" type="scale" begin="click" from="1 1" to="1 0.001" dur="0.45s" fill="freeze" restart="always"/>`;
card += `</g></g>`;

/* 页脚 */
const fy = y0 + cardH + 10;
card += `<rect x="${CARD_X}" y="${fy}" width="${CARD_W}" height="56" rx="14" fill="#FFE066" stroke="#4A2C12" stroke-width="3"/>`;
card += `<text x="${W / 2}" y="${fy + 25}" font-size="12" font-weight="bold" fill="#4A2C12" text-anchor="middle">${esc(ORG.footer1)}</text>`;
card += `<text x="${W / 2}" y="${fy + 44}" font-size="10.5" fill="#8A6410" text-anchor="middle">${esc(ORG.footer2)}</text>`;
const H = fy + 56 + 14;

/* ================= 组装输出 ================= */
const svgRaw =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;width:100%;height:auto;" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">`
  + `<rect x="0" y="0" width="${W}" height="${H}" fill="#FFFFFF"/>` + head + card + `</svg>`;
const svg = svgRaw.replace(/></g, '>\n<');   // 文本全中文，按 />< 换行安全

const html =
`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(ORG.plantName)} × ${esc(ORG.org)} · SVG 互动（秀米导入版）</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">

<!-- ============ 秀米导入区：从下面这一行开始 ============ -->
<section style="margin:0;padding:0;background:#ffffff;max-width:677px;">
${svg}
</section>
<!-- ============ 秀米导入区：到上面这一行结束 ============ -->

</body>
</html>`;

fs.writeFileSync(path.resolve(OUT), html, 'utf8');
console.log('已生成:', path.resolve(OUT));
console.log('高度 H =', H, ' 档案区 DH =', DH, ' 卡片高 =', cardH, ' 段数 =', sections.length);

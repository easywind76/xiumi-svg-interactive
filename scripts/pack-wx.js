// -*- coding: utf-8 -*-
/**
 * pack-wx.js —— 打包公众号交付件（F12 直注代码包 + 总览预览页）
 * 用法：node pack-wx.js [--urls wx-urls.json] [--root 工作区根] [--outdir 注入代码目录]
 *
 * 产出：
 *   ① <outdir>/NN-<key>.txt —— 每张卡的纯 <section> 代码（在公众号后台 F12「以 HTML 格式编辑」粘贴）
 *   ② all-cards-wx.html     —— 总览预览页（全部卡片纵向排列，可逐张点击验证）
 *
 * 卡片顺序与编号取自 wx-urls.json 里 cards 的键序（01、02…）。
 * 注意：必须读 **-xiumi.html**（清洁版）而非预览版，预览版外层带 <style>，粘进后台会被清洗。
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const getOpt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : def; };
const ROOT = path.resolve(getOpt('--root', process.cwd()));
const URLS = path.resolve(getOpt('--urls', path.join(ROOT, 'wx-urls.json')));
const OUTDIR = path.resolve(getOpt('--outdir', path.join(ROOT, '公众号注入代码')));
if (!fs.existsSync(URLS)) { console.error(`✗ 找不到图链表：${URLS}`); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(URLS, 'utf8'));

fs.mkdirSync(OUTDIR, { recursive: true });
const blocks = [];
let n = 0;
for (const [key, c] of Object.entries(cfg.cards || {})) {
  n++;
  const no = String(n).padStart(2, '0');
  const srcBase = c.out.replace(/\.html$/, '');
  const clean = path.join(ROOT, `${srcBase}-xiumi.html`);
  if (!fs.existsSync(clean)) { console.error(`⚠️ 跳过 ${key}：找不到 ${clean}`); continue; }
  const html = fs.readFileSync(clean, 'utf8');
  const i = html.indexOf('<section'), j = html.lastIndexOf('</section>');
  if (i < 0 || j < 0) { console.error(`⚠️ 跳过 ${key}：文件里没有 <section> 容器`); continue; }
  const section = html.slice(i, j + '</section>'.length);

  const cardJson = (c.static && c.cardStatic) ? c.cardStatic : c.card;
  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(cardJson ? path.resolve(ROOT, cardJson) : '', 'utf8')); } catch (e) {}
  const label = [meta.title, meta.name].filter(Boolean).join('｜') || key;

  const file = path.join(OUTDIR, `${no}-${key}.txt`);
  fs.writeFileSync(file, section + '\n');
  blocks.push(`<p style="margin:0;padding:14px 0 6px;font-size:13px;line-height:1.6;color:#888888;font-family:-apple-system,'PingFang SC',sans-serif;">▼ 第 ${no} 张 · ${label}（点击卡片试试）</p>\n${section}`);
  console.log(`${no}-${key}.txt  ${section.length} 字符  ${label}`);
}

const all = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>公众号版总览</title>
<style>body{margin:0;padding:20px 0;background:#EDEDED;}#wrap{max-width:375px;margin:0 auto;}</style>
</head>
<body>
<div id="wrap">
${blocks.join('\n')}
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'all-cards-wx.html'), all);
console.log(`\n完成 ${blocks.length} 张；总览页 all-cards-wx.html；注入码目录 ${OUTDIR}`);

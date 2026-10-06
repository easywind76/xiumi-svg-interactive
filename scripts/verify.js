// -*- coding: utf-8 -*-
/**
 * verify.js —— 无头浏览器验证 SVG 互动页
 * 用法：node verify.js <页面.html> [视口宽]
 *
 * 做三件事：
 *   1. 合规自检：确认页面内没有 <script>、id、渐变、滤镜、<use>、foreignObject
 *   2. 交互自检：找出所有遮罩（含 animateTransform 的 g），逐个真实点击，验证高度归零
 *   3. 截图：折叠态 / 全部展开态 各存一张，供人工检查排版
 *
 * 依赖：puppeteer-core + 本机 Edge/Chrome。
 *   安装：node install puppeteer-core   （装进 WorkBuddy 托管 node workspace）
 *   运行：NODE_PATH=<node_modules目录> node verify.js page.html
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const TARGET = process.argv[2];
const VW = parseInt(process.argv[3] || '375', 10);
if (!TARGET) { console.error('用法: node verify.js <页面.html> [视口宽]'); process.exit(1); }

const EDGE_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
];
const BROWSER = EDGE_CANDIDATES.find(p => fs.existsSync(p));
if (!BROWSER) { console.error('找不到 Edge/Chrome，请把路径加进 EDGE_CANDIDATES'); process.exit(1); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  /* ---- ① 静态合规自检（直接读源码，比在浏览器里查更可靠） ---- */
  const src = fs.readFileSync(path.resolve(TARGET), 'utf8');
  const forbidden = ['<script', '<use', '<defs', '<clipPath', '<linearGradient', '<radialGradient', '<filter', '<foreignObject'];
  const bad = forbidden.filter(t => src.toLowerCase().includes(t));
  const ids = (src.match(/\sid="/g) || []).length;
  console.log('--- 合规自检 ---');
  console.log('禁用标签:', bad.length ? '❌ ' + bad.join(', ') : '无 ✅');
  console.log('id 属性数量:', ids, ids === 0 ? '✅' : '❌ 微信会剥掉 id');
  console.log('animateTransform 数量:', (src.match(/<animateTransform/g) || []).length);

  /* ---- ② 浏览器内交互自检 + 截图 ---- */
  const browser = await puppeteer.launch({
    executablePath: BROWSER, headless: 'new',
    args: ['--disable-gpu', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  // 视口高度给足，避免滚动导致 mouse.click 坐标错位
  await page.setViewport({ width: VW, height: 2400, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.resolve(TARGET).replace(/\\/g, '/'), { waitUntil: 'load' });
  await sleep(400);

  const n = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) return 0;
    window.__curtains = [...svg.querySelectorAll('g')]
      .filter(g => [...g.children].some(c => c.tagName === 'animateTransform'));
    return window.__curtains.length;
  });
  console.log('\n--- 交互自检 ---');
  console.log('遮罩数量 =', n);
  if (!n) { console.log('❌ 没找到任何可点击遮罩'); await browser.close(); process.exit(1); }

  let fail = 0;
  for (let i = 0; i < n; i++) {
    const box = await page.evaluate(i => {
      const r = window.__curtains[i].getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), h: Math.round(r.height) };
    }, i);
    await page.mouse.click(box.x, box.y);
    await sleep(680);
    const after = await page.evaluate(i => Math.round(window.__curtains[i].getBoundingClientRect().height), i);
    const ok = after <= 2;
    if (!ok) fail++;
    console.log(`  遮罩${i + 1}  ${box.h} → ${after}  ${ok ? '✅' : '❌'}`);
  }

  const outDir = path.dirname(path.resolve(TARGET));
  await page.screenshot({ path: path.join(outDir, 'verify-opened.png') });
  await browser.close();

  console.log('\n结论:', fail === 0 ? `全部 ${n} 个遮罩交互正常 ✅` : `${fail} 个遮罩失效 ❌`);
  console.log('截图:', path.join(outDir, 'verify-opened.png'));
  process.exit(fail === 0 ? 0 : 1);
})();

// -*- coding: utf-8 -*-
/**
 * verify.js —— 无头浏览器验证 SVG 互动页
 * 用法：node verify.js <页面.html> [视口宽] [--mode=foreign|image|xiumi]
 *
 * 做四件事：
 *   1. 合规自检：确认页面内没有 <script>、id、渐变、滤镜、<use>、<clipPath>
 *      （<foreignObject> 自 2026-10 起是**公众号唯一存活的图片通道**，不再算禁用标签）
 *   2. 公众号就绪度：统计图片通道 —— 0 个 <image> + N 个 <foreignObject> = 公众号可存活
 *   3. 交互自检：找出所有遮罩（含 animateTransform 的 g），逐个真实点击，验证高度归零
 *   4. 截图：全部展开态 存一张，供人工检查排版
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
const MODE = (process.argv.find(a => a.startsWith('--mode=')) || '').split('=')[1] || '';
if (!TARGET) { console.error('用法: node verify.js <页面.html> [视口宽] [--mode=foreign|image|xiumi]'); process.exit(1); }

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
  const forbidden = ['<script', '<use', '<defs', '<clipPath', '<linearGradient', '<radialGradient', '<filter'];
  const bad = forbidden.filter(t => src.toLowerCase().includes(t));
  const ids = (src.match(/\sid="/g) || []).length;

  /* ---- ② 图片通道统计 ---- */
  const nImage = (src.match(/<image\s/g) || []).length;          // SVG <image>：公众号保存期必被剥
  const nFO = (src.match(/<foreignObject/g) || []).length;       // foreignObject：公众号唯一存活通道
  const nImgTag = (src.match(/<img\s/g) || []).length;           // 内部 <img>
  const nImgNoXmlns = (src.match(/<img\s(?![^>]*xmlns=)/g) || []).length;
  const urls = [...new Set((src.match(/(?:href|src)="https?:\/\/[^"]+"/g) || [])
    .map(s => (s.match(/https?:\/\/[^"]+/) || [''])[0]))];
  const nonWx = urls.filter(u => !/^https?:\/\/mmbiz\.qpic\.cn\//.test(u));
  const unescapedAmp = (src.match(/(?:href|src)="[^"]*mmbiz[^"]*[^&]&(?!amp;)[^"]*"/g) || []).length;

  console.log('--- 合规自检 ---');
  console.log('禁用标签:', bad.length ? '❌ ' + bad.join(', ') : '无 ✅');
  console.log('id 属性数量:', ids, ids === 0 ? '✅' : '❌ 微信会剥掉 id');
  console.log('animateTransform 数量:', (src.match(/<animateTransform/g) || []).length);

  console.log('\n--- 图片通道 ---');
  console.log('SVG <image> 数量:', nImage, nImage === 0 ? '✅' : '⚠️ 公众号保存期会剥掉，请改用 IMG_MODE=foreign');
  console.log('<foreignObject> 数量:', nFO, nFO > 0 ? '✅ 公众号通道' : '');
  console.log('内嵌 <img> 数量:', nImgTag, nImgNoXmlns ? `❌ 其中 ${nImgNoXmlns} 个缺 xmlns（foreignObject 内必需）` : '');
  console.log('外链总数:', urls.length, '| 非 mmbiz 图床:', nonWx.length,
    nonWx.length ? `⚠️ ${nonWx.length} 个（公众号只认自家图床，秀米图链会被清空）` : '✅ 全为 mmbiz');
  if (nImage === 0 && nFO > 0 && nonWx.length === 0 && nImgNoXmlns === 0) {
    console.log('公众号就绪度: ✅ 可保存存活（foreignObject + <img> + mmbiz 图床，0 个 <image>）');
  } else if (nImage > 0) {
    console.log('公众号就绪度: ❌ 含 <image>，公众号保存后会丢图 → 生成时加 IMG_MODE=foreign');
  } else if (!nFO) {
    console.log('公众号就绪度: — 无图片（纯矢量组件，无此问题）');
  }
  if (unescapedAmp) console.log(`⚠️ 有 ${unescapedAmp} 个外链里的 & 未转义（应为 &amp;），URL 会被截断`);

  /* ---- ③ 浏览器内交互自检 + 截图 ---- */
  const browser = await puppeteer.launch({
    executablePath: BROWSER, headless: 'new',
    args: ['--disable-gpu', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  // 视口高度给足，避免滚动导致 mouse.click 坐标错位
  await page.setViewport({ width: VW, height: 2400, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.resolve(TARGET).replace(/\\/g, '/'), { waitUntil: 'load' });
  if (nFO || nImgTag) await sleep(1200);   // 等外链图片加载
  else await sleep(400);

  const n = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    if (!svg) return 0;
    window.__curtains = [...svg.querySelectorAll('g')]
      .filter(g => [...g.children].some(c => c.tagName === 'animateTransform' && /click/.test(c.getAttribute('begin') || '')));
      // 只把 begin="click" 的算遮罩；常驻氛围动画（摇摆/漂浮，begin="0s" 或无 begin）不算
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

  /* 图片是否真的渲染出来了（外链挂了会显示 0 尺寸 / 破图） */
  if (nFO || nImgTag) {
    const pic = await page.evaluate(() => [...document.querySelectorAll('img')]
      .map(el => {
        const r = el.getBoundingClientRect();
        return `${el.getAttribute('src').slice(0, 46)}… 渲染 ${r.width.toFixed(0)}x${r.height.toFixed(0)} ${el.complete && el.naturalWidth ? '✅' : '❌ 未加载'}`;
      }));
    console.log('\n--- 图片渲染 ---');
    pic.forEach(s => console.log('  ' + s));
  }

  const outDir = path.dirname(path.resolve(TARGET));
  await page.screenshot({ path: path.join(outDir, 'verify-opened.png') });
  await browser.close();

  console.log('\n结论:', fail === 0 ? `全部 ${n} 个遮罩交互正常 ✅` : `${fail} 个遮罩失效 ❌`);
  console.log('截图:', path.join(outDir, 'verify-opened.png'));
  process.exit(fail === 0 ? 0 : 1);
})();

/* 两态截图自查 —— "秀米SVG互动组件生成" skill
 * 用法：NODE_PATH=<workspace>/node_modules node snap.js 页面.html [宽度] [展开态裁剪高度]
 * 产出：与页面同目录的 snap-closed.png（收起态）、snap-opened.png（展开态）
 *
 * 为什么不用 Edge headless --screenshot：它的视口宽度不可靠（最小约 500px），
 * 会产生假的横向溢出，必须用 puppeteer-core 自己控制视口。
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const TARGET = process.argv[2];
if (!TARGET) { console.error('用法：node snap.js 页面.html [宽度] [展开态裁剪高度]'); process.exit(1); }
const VW = parseInt(process.argv[3], 10) || 375;
const CLIP_H = parseInt(process.argv[4], 10) || 0;   // 0 = 整页

const BROWSER = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find(p => fs.existsSync(p));
if (!BROWSER) { console.error('✗ 未找到 Edge/Chrome'); process.exit(1); }

(async () => {
  const file = path.resolve(TARGET);
  const dir = path.dirname(file);
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--disable-gpu', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: 2400, deviceScaleFactor: 2 });
  /* 外链素材防盗链：本地 file:// 页面发起的请求带 file:/// Referer，秀米图床等会拒（403）。
   * 截图自检时统一剥掉 Referer/Origin，模拟公众号编辑器内的请求环境。 */
  await page.setRequestInterception(true);
  page.on('request', req => {
    const h = { ...req.headers() };
    delete h.referer; delete h.origin;
    req.continue({ headers: h });
  });
  page.on('requestfailed', req =>
    console.error(`  ! 资源加载失败: ${req.failure() && req.failure().errorText} ${req.url()}`));
  await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: path.join(dir, 'snap-closed.png') });

  /* 找揭示幕布：持有 begin="click" 的 animateTransform 的那个 <g> */
  const spot = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const g = [...svg.querySelectorAll('g')].find(g =>
      [...g.children].some(c => c.tagName === 'animateTransform' && /click/.test(c.getAttribute('begin') || '')));
    if (!g) return null;
    const r = g.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: r.height };
  });
  if (!spot) { console.error('✗ 未找到揭示幕布（无 begin="click" 的 animateTransform）'); await browser.close(); process.exit(1); }

  await page.mouse.click(Math.round(spot.x), Math.round(spot.y));
  await new Promise(r => setTimeout(r, 800));

  const opt = { path: path.join(dir, 'snap-opened.png') };
  if (CLIP_H > 0) opt.clip = { x: 0, y: 0, width: VW, height: CLIP_H };
  await page.screenshot(opt);

  await browser.close();
  console.log(`✓ snap-closed.png / snap-opened.png（幕布高 ${spot.h.toFixed(0)} → 点后收起）`);
})();

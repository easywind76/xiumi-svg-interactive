// -*- coding: utf-8 -*-
/**
 * check-wx.js —— 模拟微信公众号环境实测（发布前最后一道关）
 * 用法：NODE_PATH=<node_modules> node check-wx.js <页面.html> [输出目录]
 *
 * 为什么需要它：公众号正文里的图片请求会带上 mp.weixin.qq.com 的 Referer，
 * 部分图床（尤其 img.xiumi.us）对不同 Referer 的放行策略不一样，本地无 Referer
 * 测试通过 ≠ 公众号能显示。本工具给所有非 file 请求统一加上该 Referer 再实测。
 *
 * 检查项：
 *   ① 每张图片（foreignObject 里的 <img> 与 SVG <image> 都查）是否 200、渲染尺寸是否正确
 *   ② 外链是否为 mmbiz.qpic.cn（公众号只认自家图床）
 *   ③ 点击揭示是否正常（收起态 → 展开态），并输出两张截图
 */
const fs = require('fs'), path = require('path'), puppeteer = require('puppeteer-core');

const TARGET = process.argv[2];
if (!TARGET) { console.error('用法: node check-wx.js <页面.html> [输出目录]'); process.exit(1); }
const BROWSER = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => fs.existsSync(p));
const DIR = process.argv[3] ? path.resolve(process.argv[3]) : path.dirname(path.resolve(TARGET));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: 'new', args: ['--disable-gpu', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 700, deviceScaleFactor: 2 });
  const net = [];
  await page.setRequestInterception(true);
  page.on('request', req => {
    const h = { ...req.headers() };
    if (!req.url().startsWith('file:')) h.referer = 'https://mp.weixin.qq.com/';   /* 模拟公众号环境 */
    req.continue({ headers: h });
  });
  page.on('response', res => {
    const u = res.url(); if (u.startsWith('file:')) return;
    net.push(`${res.status()} ${(res.headers()['content-type'] || '').split(';')[0]} ${u.slice(0, 110)}`);
  });
  page.on('requestfailed', req => net.push(`FAIL ${req.failure().errorText} ${req.url().slice(0, 110)}`));

  await page.goto('file:///' + path.resolve(TARGET).replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await sleep(1500);

  const pics = await page.evaluate(() => {
    const out = [];
    const box = new Map();
    document.querySelectorAll('foreignObject').forEach(fo => {
      const r = fo.getBoundingClientRect();
      [...fo.querySelectorAll('img')].forEach(im => out.push({
        kind: 'img(foreignObject)', src: im.getAttribute('src') || '',
        w: fo.getAttribute('width'), h: fo.getAttribute('height'),
        rw: r.width.toFixed(0), rh: r.height.toFixed(0),
        loaded: im.complete && im.naturalWidth > 0
      }));
    });
    document.querySelectorAll('image').forEach(el => {
      const r = el.getBoundingClientRect();
      out.push({
        kind: 'image(svg)', src: el.getAttribute('href') || el.getAttribute('xlink:href') || '',
        w: el.getAttribute('width'), h: el.getAttribute('height'),
        rw: r.width.toFixed(0), rh: r.height.toFixed(0), loaded: true
      });
    });
    return out;
  });

  await page.screenshot({ path: path.join(DIR, 'wx-closed.png') });
  const b = await (await page.$('svg')).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await sleep(900);
  await page.screenshot({ path: path.join(DIR, 'wx-opened.png') });

  console.log('--- 图片元素 ---');
  pics.forEach(p => console.log(
    `  [${p.kind}] ${p.w}x${p.h} 渲染 ${p.rw}x${p.rh} ${p.loaded ? '✅' : '❌ 未加载'}  ${p.src.replace(/^https?:\/\//, '').slice(0, 60)}…`));
  console.log('--- 网络（Referer = mp.weixin.qq.com）---');
  net.forEach(s => console.log('  ' + s));

  const bad = net.filter(s => !/^200/.test(s));
  const nonWx = pics.filter(p => /^https?:/.test(p.src) && !/mmbiz\.qpic\.cn/.test(p.src));
  const notLoaded = pics.filter(p => !p.loaded);
  console.log('');
  console.log(bad.length ? `❌ 有 ${bad.length} 个请求失败` : '✅ 全部请求 200');
  if (nonWx.length) console.log(`⚠️ 有 ${nonWx.length} 张图不是 mmbiz 图床 —— 公众号转存/保存后会被清空`);
  if (notLoaded.length) console.log(`❌ 有 ${notLoaded.length} 张图未渲染出来`);
  console.log(`截图: ${path.join(DIR, 'wx-closed.png')} / ${path.join(DIR, 'wx-opened.png')}`);
  await browser.close();
})();

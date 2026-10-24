// -*- coding: utf-8 -*-
/**
 * gen-wx.js —— 一键生成「公众号可存活」版组件（全外链 mmbiz + foreignObject 通道）
 * 用法：
 *   node gen-wx.js [卡名 ...] [--urls wx-urls.json] [--root 工作区根] [--list] [--print]
 *   不传卡名 = 生成所有链接齐全的卡；--list 只报告缺哪些链接。
 *   --print = 不生成，只打印可直接执行的 shell 命令（沙箱内 spawn 被拦时用这个，
 *            把输出存成 .sh 再 sh 它即可）。
 *
 * 链接表格式（wx-urls.json）：
 * {
 *   "lawn": "https://mmbiz.qpic.cn/.../0?wx_fmt=png&from=appmsg",     // 共用背景
 *   "cards": {
 *     "jelly": { "out": "jelly-card-wx.html", "card": "_mower/jelly/card-jelly.json",
 *                "plant": "https://mmbiz.qpic.cn/...png", "gif": "https://mmbiz.qpic.cn/...gif" },
 *     "x":     { "out": "x-card-wx.html", "card": "x.json", "plant": "...", "gif": "...",
 *                "static": true, "cardStatic": "x-static.json" }   // static → 动图位改用静态立绘
 *   }
 * }
 *
 * 为什么必须走这条路：微信公众号**保存期**会剥掉 SVG 内所有 <image>（href/xlink/双写全灭），
 * 且只认自家 mmbiz.qpic.cn 图床。唯一存活组合 = <foreignObject> 内嵌普通 <img> + mmbiz 链接。
 * 详见 references/wechat-svg-constraints.md 第 3 节。
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const GEN = path.join(__dirname, 'gen-almanac.js');
const NODE_BIN = process.env.NODE_BIN || process.execPath;

const argv = process.argv.slice(2);
const getOpt = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv.splice(i, 2)[1] : def;
};
const listOnly = argv.includes('--list');
if (listOnly) argv.splice(argv.indexOf('--list'), 1);
const printOnly = argv.includes('--print');
if (printOnly) argv.splice(argv.indexOf('--print'), 1);

const ROOT = path.resolve(getOpt('--root', process.cwd()));
const URLS = path.resolve(getOpt('--urls', path.join(process.cwd(), 'wx-urls.json')));
if (!fs.existsSync(URLS)) { console.error(`✗ 找不到图链表：${URLS}`); process.exit(1); }
const cfg = JSON.parse(fs.readFileSync(URLS, 'utf8'));
const todo = argv.length ? argv : Object.keys(cfg.cards || {});

let built = 0; const skipped = []; const cmds = [];
if (printOnly) cmds.push(`cd "${ROOT.replace(/\\/g, '/')}" || exit 1`);
for (const key of todo) {
  const c = (cfg.cards || {})[key];
  if (!c) { console.error(`✗ 未知卡片：${key}`); process.exitCode = 1; continue; }
  /* static=true 时动图位改用静态立绘，只需 plant 链接 */
  const need = ['plant', ...(c.static ? [] : ['gif'])].filter(k => !/^https?:/.test(c[k] || ''));
  if (need.length) { skipped.push(`${key}（缺 ${need.join(' + ')}）`); continue; }
  if (listOnly) { console.log(`✓ ${key} 链接齐全`); continue; }

  const cardJson = (c.static && c.cardStatic) ? c.cardStatic : c.card;
  const env = {
    ...process.env,
    IMG_MODE: 'foreign',                              /* 公众号唯一可用图片通道 */
    LAWN_URL: cfg.lawn,
    PLANT_URL: c.plant,
    GIF_URL: c.static ? c.plant : c.gif,              /* static → 动图位改用静态立绘 */
    CARD_JSON: cardJson ? (path.isAbsolute(cardJson) ? cardJson : path.join(ROOT, cardJson)).replace(/\\/g, '/') : '',
  };

  if (printOnly) {
    const q = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
    cmds.push(`IMG_MODE=foreign LAWN_URL=${q(env.LAWN_URL)} PLANT_URL=${q(env.PLANT_URL)} ` +
      `GIF_URL=${q(env.GIF_URL)}` + (env.CARD_JSON ? ` CARD_JSON=${q(env.CARD_JSON)}` : '') +
      ` "${NODE_BIN}" "${GEN}" "${c.out}"`);
    built++; continue;
  }

  let r = cp.spawnSync(NODE_BIN, [GEN, c.out], { cwd: ROOT, env, encoding: 'utf8' });
  if (r.error) {
    /* 部分沙箱拦 spawnSync（EBUSY/EACCES）→ 退回 shell 直调 */
    r = cp.spawnSync(`"${NODE_BIN}" "${GEN}" "${c.out}"`, { cwd: ROOT, env, encoding: 'utf8', shell: true });
  }
  if (r.error) {
    console.error(`✗ ${key} 子进程启动失败（${r.error.message}）。` +
      `\n  沙箱内无法 spawn 时，请用 shell 直接调生成器，env 同上（IMG_MODE=foreign / LAWN_URL / PLANT_URL / GIF_URL / CARD_JSON）。`);
    process.exitCode = 1; continue;
  }
  if (r.status !== 0) { console.error(`✗ ${key} 生成失败\n${r.stderr}`); process.exitCode = 1; continue; }
  console.log(`✓ ${key} → ${c.out}\n${(r.stdout || '').trim()}`);
  built++;
}
if (printOnly) {
  /* 沙箱内 spawnSync 被拦时：把下面这段存成 .sh 直接执行 */
  console.log(cmds.join('\n'));
} else {
  console.log(`\n完成 ${built} 张${skipped.length ? `；待补链接：${skipped.join('、')}` : ''}`);
}

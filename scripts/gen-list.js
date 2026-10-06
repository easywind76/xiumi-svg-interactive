// -*- coding: utf-8 -*-
/**
 * gen-list.js —— 多卡片列表型 SVG 互动页生成器
 * 用法：node gen-list.js [输出文件.html]
 *
 * 产出：可直接导入秀米 / 粘贴进公众号后台的「纯内容」HTML
 *   - 无 <script>、无 <style> 标签、无外部资源，样式全部内联属性
 *   - 交互只用 SVG SMIL（<animateTransform begin="click">）
 *
 * 微信白名单硬约束（违反会被清洗导致交互失效）：
 *   禁 <script> / 事件属性 / <use> / id 属性 / <filter> / 渐变(gradient) / <clipPath>
 *   SVG 内 <image> 只能用微信素材库链接（mmbiz.qpic.cn），外链与 base64 都不显示
 */
const fs = require('fs');
const path = require('path');
const { rot, PLANTS, PLANT_BOX, wrap, esc } = require('./lib.js');

const OUT = process.argv[2] || 'zhaoxin-svg-list.html';

/* ================= 可编辑区 ①：全局信息 ================= */
const CFG = { school: '南京艺术学院', account: '南艺青年' };

/* ================= 可编辑区 ②：条目列表 =================
   plant 必须是 lib.js 里 PLANTS 已存在的键；
   换主题时在 lib.js 里加自己的矢量图形即可。 */
const ORGS = [
  {
    plant: 'sunflower', plantName: '向日葵', org: '校学生会',
    skill: '核心调度中枢，全场能量的起点——从大型活动的统筹，到师生需求的串联，第一束阳光都从这里发出。',
    desc: '统筹校级大型活动、连接师生需求的中枢。晚会、比赛、权益反馈，都从这一株开始运转。',
    quote: '别犹豫了，校学生会缺个闪闪发光的你！',
    qq: '校学生会'
  },
  {
    plant: 'cobcannon', plantName: '玉米加农炮', org: '校研究生会',
    skill: '厚积薄发的学术究极形态——前期默默积累，一旦成型，就是全场最强火力。',
    desc: '深埋机体的创意与研究核心，深耕学术交流与科研实践。认真做研究、认真做事的人，在这儿最舒服。',
    quote: '研会招新｜“新”上人，就等你来！',
    qq: '校研究生会'
  },
  {
    plant: 'starfruit', plantName: '杨桃', org: '校学生社团管理部',
    skill: '五向覆盖的信号网络——一株下去，五个方向同时点亮。',
    desc: '遍布校园的信号网络，串联上百家社团，让每一份兴趣都能落地发光。',
    quote: '解锁大学「高阶玩法」，寻找同频共振的你！',
    qq: '校社管'
  },
  {
    plant: 'cattail', plantName: '香蒲（猫尾草）', org: '南艺青年融媒体中心',
    skill: '全场无死角的远程狙击——镜头扫过的地方，没有一个高光瞬间会被漏掉。',
    desc: '校园的眼睛与审美窗口，用镜头和排版定格高光时刻。会拍、会写、会剪的人都在这儿。',
    quote: '今天天气真好，不考虑加入融媒体中心吗？',
    qq: '南艺青媒'
  },
  {
    plant: 'fumeshroom', plantName: '大喷菇', org: '“南艺之声”广播台',
    skill: '覆盖整列的声浪输出——一口气喷出去，一整排都听得见。',
    desc: '校园的专属发声通道，让每一刻心跳都被听见。喜欢声音、喜欢表达的同学，来这儿。',
    quote: '你有一份校园发声邀请函，请查收！',
    qq: '广播台'
  },
  {
    plant: 'torchwood', plantName: '火炬树桩', org: '江苏高校共青团新媒体直联工作室·南艺站',
    orgSize: 12, orgWrap: 15,
    skill: '让每一颗子弹升级成火焰——自己不抢戏，却能让打出去的每一下都加倍。',
    desc: '承接官方供稿，联动省级平台，把南艺青年的态度直送省级共青团。',
    quote: '南艺新生专属「开挂」通道：直通江苏共青团！',
    qq: '直联工作室'
  },
  {
    plant: 'sunshroom', plantName: '阳光菇', org: '校青年志愿者协会',
    skill: '默默产出温暖的运输线——个子最小，却把阳光送到阵型的每一个角落。',
    desc: '把善意输送到校园每一个角落的温暖运输线。想真正帮到别人，就从这里开始。',
    quote: '这个秋天，南艺青协想与你相遇',
    qq: '校青协'
  }
];

/* ================= 可编辑区 ③：其余图文清单 ================= */
const ZOMBIES = [
  { svg: 'z1', name: '迷茫僵尸', line: '不知道大学该干什么' },
  { svg: 'z2', name: '社恐僵尸', line: '想认识人，但不敢开口' },
  { svg: 'z3', name: '选择困难僵尸', line: '活动太多，不知道选什么' },
  { svg: 'z4', name: '拖延僵尸', line: '想变优秀，一直没开始' }
];
const WANTS = [
  '核心面向 2026 级本科生、研究生，所有想解锁新体验的其他年级同学，我们同样超级欢迎～',
  '思想上进，做事靠谱有分寸，敢接任务也敢担责任',
  '脑洞不设限，新点子不断、灵感爆棚，也敢于落地实践',
  '对学生工作揣着满满的热情，愿意主动往前多走一步',
  '既能独立搞定手头任务，也能和伙伴们打好配合，事事有回应、件件有着落',
  '能平衡好学业和学生工作，两边都不落下'
];
const REWARDS = [
  '一群同样对校园生活充满热忱的伙伴，跳出舒适圈，自我提升开倍速',
  '从文案排版、活动统筹到视觉设计，实打实的技能点全方面升级',
  '各类校内外特色艺术、实践活动直通参与名额，近距离接触校园大型活动，拓展个人视野',
  '专属技能分享会、学长学姐传帮带，还有不定期惊喜福利彩蛋降落',
  '一个互帮互助的集体，一群能一起赶工也能一起约饭逛展的同行者'
];

/* ================= 布局常量 ================= */
const W = 375;
const M = 12, CARD_X = M, CARD_W = W - M * 2;
const TOP_H = 86, DY_OFF = TOP_H + 2;
const LH = 16, FS = 12, PAD_IN = 12;
const TXT_X = CARD_X + 10 + PAD_IN + 8;      // 30
const DETAIL_X = CARD_X + 8, DETAIL_W = CARD_W - 16;
const HINT_Y = 152;

/* ================= 生成卡片 ================= */
let cards = '';
let y = 168;

ORGS.forEach((o, i) => {
  const y0 = y;
  const okW = DETAIL_W - PAD_IN * 2;
  const skillLines = wrap(o.skill, 23);
  const descLines = wrap(o.desc, 25);
  const quoteLines = wrap('「' + o.quote + '」', 25);
  const qqLines = wrap('招新咨询群：' + o.qq, 25);
  const orgLines = wrap(o.org, o.orgWrap || 15);
  const orgSize = o.orgSize || 15;
  const segs = [skillLines, descLines, quoteLines, qqLines];
  const nLines = segs.reduce((a, s) => a + s.length, 0);
  const DH = PAD_IN + nLines * LH + (segs.length - 1) * 5 + PAD_IN;
  const CARD_H = TOP_H + DH + 10;

  const bgFill = i % 2 ? '#7CC23E' : '#8ED14A';
  cards += `<rect x="${CARD_X}" y="${y0}" width="${CARD_W}" height="${CARD_H}" rx="14" fill="${bgFill}" stroke="#3A6B1C" stroke-width="3"/>`;

  const pw = PLANT_BOX.w * PLANT_BOX.scale, ph = PLANT_BOX.h * PLANT_BOX.scale;
  const pX = CARD_X + 16, pY = y0 + TOP_H - 8 - ph;
  cards += `<g transform="translate(${pX.toFixed(1)} ${pY.toFixed(1)}) scale(${PLANT_BOX.scale})">${PLANTS[o.plant]()}</g>`;

  const chipW = o.plantName.length * 11.5 + 18;
  const chipX = pX + pw + 12;
  cards += `<rect x="${chipX.toFixed(1)}" y="${y0 + 13}" width="${chipW.toFixed(1)}" height="20" rx="10" fill="#B6F06A" stroke="#4A2C12" stroke-width="1.5" pointer-events="none"/>`;
  cards += `<text x="${(chipX + chipW / 2).toFixed(1)}" y="${y0 + 27}" font-size="11.5" font-weight="bold" fill="#2C4F12" text-anchor="middle" pointer-events="none">${esc(o.plantName)}</text>`;

  orgLines.forEach((ln, k) => {
    cards += `<text x="${chipX.toFixed(1)}" y="${(y0 + 52 + k * (orgSize + 3)).toFixed(1)}" font-size="${orgSize}" font-weight="bold" fill="#243F0C" pointer-events="none">${esc(ln)}</text>`;
  });

  const bx = CARD_X + CARD_W - 26, by = y0 + 25;
  cards += `<circle cx="${bx}" cy="${by}" r="15" fill="#FFD93B" stroke="#4A2C12" stroke-width="2.5" pointer-events="none"/>`;
  cards += `<text x="${bx}" y="${by + 4.5}" font-size="12" font-weight="bold" fill="#4A2C12" text-anchor="middle" pointer-events="none">${String(i + 1).padStart(2, '0')}</text>`;

  const dY = y0 + DY_OFF;
  cards += `<rect x="${DETAIL_X}" y="${dY}" width="${DETAIL_W}" height="${DH}" rx="10" fill="#F0FAE2" stroke="#5BA82C" stroke-width="2"/>`;

  let ly = dY + PAD_IN + 12;
  cards += `<circle cx="${DETAIL_X + 16}" cy="${ly - 4}" r="3.5" fill="#78C23C" pointer-events="none"/>`;
  skillLines.forEach((ln, k) => {
    cards += `<text x="${DETAIL_X + 26}" y="${ly + k * LH}" font-size="${FS}" fill="#2A3D16" pointer-events="none">${esc(ln)}</text>`;
  });
  ly += skillLines.length * LH + 5;
  descLines.forEach((ln, k) => {
    cards += `<text x="${TXT_X}" y="${ly + k * LH}" font-size="${FS}" fill="#3B4A28" pointer-events="none">${esc(ln)}</text>`;
  });
  ly += descLines.length * LH + 5;
  quoteLines.forEach((ln, k) => {
    cards += `<text x="${TXT_X}" y="${ly + k * LH}" font-size="${FS}" font-weight="bold" fill="#A8640C" pointer-events="none">${esc(ln)}</text>`;
  });
  ly += quoteLines.length * LH + 5;
  qqLines.forEach((ln, k) => {
    cards += `<text x="${TXT_X}" y="${ly + k * LH}" font-size="11" fill="#4A7A1C" pointer-events="none">${esc(ln)}</text>`;
  });

  /* 遮罩：外层 g 定位，内层 g 挂 animateTransform
     —— 点击内层 g 的任意子元素（含 pointer-events=none 穿透到的 rect）都会触发 */
  cards += `<g transform="translate(${DETAIL_X} ${dY})"><g>`;
  cards += `<rect x="0" y="0" width="${DETAIL_W}" height="${DH}" rx="10" fill="#7A4E22" stroke="#3F2712" stroke-width="3"/>`;
  for (let t = 1; t <= 2; t++) {
    cards += `<rect x="12" y="${t * 26}" width="${DETAIL_W - 24}" height="3" rx="1.5" fill="#8F5E2E" pointer-events="none"/>`;
  }
  cards += `<text x="${(DETAIL_W / 2).toFixed(1)}" y="${(DH / 2 + 2).toFixed(1)}" font-size="13" font-weight="bold" fill="#FFE9B8" text-anchor="middle" letter-spacing="1" pointer-events="none">点击草皮 · 解锁档案</text>`;
  cards += `<text x="${(DETAIL_W / 2).toFixed(1)}" y="${(DH / 2 + 18).toFixed(1)}" font-size="8" fill="#D9B98A" text-anchor="middle" letter-spacing="2" pointer-events="none">TAP TO UNLOCK</text>`;
  cards += `<animateTransform attributeName="transform" type="scale" begin="click" from="1 1" to="1 0.001" dur="0.45s" fill="freeze" restart="always"/>`;
  cards += `</g></g>`;

  y = y0 + CARD_H + 9;
});

/* 页脚 */
const fy = y + 6;
cards += `<rect x="${CARD_X}" y="${fy}" width="${CARD_W}" height="66" rx="14" fill="#FFE066" stroke="#4A2C12" stroke-width="3"/>`;
cards += `<rect x="${CARD_X}" y="${fy}" width="${CARD_W}" height="30" rx="14" fill="#7CC23E"/>`;
cards += `<rect x="${CARD_X}" y="${fy + 18}" width="${CARD_W}" height="12" fill="#7CC23E"/>`;
cards += `<text x="${W / 2}" y="${fy + 22}" font-size="17" font-weight="bold" fill="#FFFBE6" text-anchor="middle" letter-spacing="4">JOIN US</text>`;
cards += `<text x="${W / 2}" y="${fy + 47}" font-size="11.5" font-weight="bold" fill="#4A2C12" text-anchor="middle">综测上涨 · 技能 up up · 我们不见不散</text>`;
cards += `<text x="${W / 2}" y="${fy + 62}" font-size="10" fill="#8A6410" text-anchor="middle">${esc(CFG.school)} · 校级学生组织招新</text>`;
const H = fy + 66 + 16;

/* 头部 */
let head = '';
head += `<rect x="0" y="0" width="${W}" height="62" fill="#8FD7F0"/>`;
head += `<rect x="0" y="62" width="${W}" height="52" fill="#A7E2F7"/>`;
head += `<rect x="0" y="114" width="${W}" height="54" fill="#C9EFFB"/>`;
head += `<g fill="#FFFFFF"><circle cx="56" cy="34" r="15"/><circle cx="76" cy="27" r="19"/><circle cx="97" cy="35" r="13"/><rect x="52" y="34" width="49" height="14" rx="7"/></g>`;
head += `<g fill="#FFFFFF" opacity="0.9"><circle cx="248" cy="26" r="11"/><circle cx="262" cy="21" r="14"/><circle cx="277" cy="27" r="10"/><rect x="245" y="26" width="36" height="11" rx="5.5"/></g>`;
head += rot(8, 322, 32, `<rect x="320.6" y="8" width="2.8" height="7" rx="1.4" fill="#EFA51B"/>`);
head += `<circle cx="322" cy="32" r="14" fill="#FFD93B" stroke="#E08E12" stroke-width="2"/><circle cx="322" cy="32" r="9" fill="#FFE97A"/>`;
head += `<rect x="46" y="50" width="283" height="74" rx="14" fill="#C4884A" stroke="#4A2C12" stroke-width="4"/>`;
head += `<circle cx="56" cy="62" r="4" fill="#F0D9A8" stroke="#4A2C12" stroke-width="2"/><circle cx="319" cy="62" r="4" fill="#F0D9A8" stroke="#4A2C12" stroke-width="2"/>`;
head += `<text x="${W / 2}" y="86" font-size="21" font-weight="bold" fill="#5A3512" text-anchor="middle" letter-spacing="1">校级学生组织招新</text>`;
head += `<text x="${W / 2}" y="85" font-size="21" font-weight="bold" fill="#FFF6CC" text-anchor="middle" letter-spacing="1">校级学生组织招新</text>`;
head += `<text x="${W / 2}" y="105" font-size="10.5" font-weight="bold" fill="#FFF3C4" text-anchor="middle" letter-spacing="2">植物大战僵尸 · 新成员请就位</text>`;
head += `<text x="${W / 2}" y="${HINT_Y}" font-size="10.5" font-weight="bold" fill="#24540E" text-anchor="middle">↓ 点击下方每一块草皮，解锁对应组织的完整档案</text>`;

/* 僵尸 / 清单面板 */
let extra = '';
extra += `<rect x="0" y="0" width="${W}" height="0" fill="none"/>`;
const panelStart = y + 0;
let panel = '';
panel += `<rect x="${CARD_X}" y="${panelStart}" width="${CARD_W}" height="0" fill="none"/>`;

/* —— 用一个包装 group 承载底部面板区（僵尸档案 / 图鉴 / 奖励） —— */
let bottom = '';
let by2 = y + 20;
function panelHead(t, yy) {
  return `<rect x="${CARD_X}" y="${yy}" width="${CARD_W}" height="34" rx="12" fill="#5EA82F" stroke="#3A6B1C" stroke-width="3"/>`
    + `<text x="${W / 2}" y="${yy + 22}" font-size="14" font-weight="bold" fill="#FFFBE6" text-anchor="middle">${esc(t)}</text>`;
}
function panelBody(top, h) {
  return `<rect x="${CARD_X}" y="${top + 32}" width="${CARD_W}" height="${h}" rx="0" fill="#F6E3B4" stroke="#4A2C12" stroke-width="3"/>`;
}

/* 僵尸档案 */
{
  const zh = 120;
  bottom += panelHead('本关的僵尸是这些', by2);
  bottom += `<rect x="${CARD_X}" y="${by2 + 32}" width="${CARD_W}" height="${zh}" fill="#F6E3B4" stroke="#4A2C12" stroke-width="3"/>`;
  ZOMBIES.forEach((z, i) => {
    const cx = CARD_X + 46 + i * 86;
    bottom += `<g transform="translate(${cx - 22} ${by2 + 42}) scale(0.42)">${PLANTS[z.svg] ? PLANTS[z.svg]() : ''}</g>`;
    bottom += `<text x="${cx}" y="${by2 + 96}" font-size="11" font-weight="bold" fill="#3B2412" text-anchor="middle">${esc(z.name)}</text>`;
    bottom += `<text x="${cx}" y="${by2 + 112}" font-size="9.5" fill="#6B4A2A" text-anchor="middle">${esc(z.line)}</text>`;
  });
  by2 += 32 + zh + 14;
}
/* 图鉴 */
{
  const lines = WANTS.map((t, i) => ({ t, n: i + 1 }));
  const zh = lines.length * 22 + 20;
  bottom += panelHead('我们在找这样的你', by2);
  bottom += `<rect x="${CARD_X}" y="${by2 + 32}" width="${CARD_W}" height="${zh}" fill="#F6E3B4" stroke="#4A2C12" stroke-width="3"/>`;
  lines.forEach((l, i) => {
    const ly2 = by2 + 32 + 22 + i * 22;
    bottom += `<circle cx="${CARD_X + 26}" cy="${ly2 - 4}" r="8" fill="#E8A020" stroke="#8A5208" stroke-width="1.5"/>`;
    bottom += `<text x="${CARD_X + 26}" y="${ly2 - 1}" font-size="9.5" font-weight="bold" fill="#fff" text-anchor="middle">${l.n}</text>`;
    bottom += `<text x="${CARD_X + 42}" y="${ly2}" font-size="11" fill="#3B2412">${esc(wrap(l.t, 26)[0])}${wrap(l.t, 26).length > 1 ? '…' : ''}</text>`;
  });
  by2 += 32 + zh + 14;
}
/* 奖励 */
{
  const lines = REWARDS;
  const zh = lines.length * 22 + 20;
  bottom += panelHead('加入后解锁的专属收获', by2);
  bottom += `<rect x="${CARD_X}" y="${by2 + 32}" width="${CARD_W}" height="${zh}" fill="#F6E3B4" stroke="#4A2C12" stroke-width="3"/>`;
  lines.forEach((t, i) => {
    const ly2 = by2 + 32 + 22 + i * 22;
    bottom += `<circle cx="${CARD_X + 26}" cy="${ly2 - 4}" r="8" fill="#78C23C" stroke="#4C8A1C" stroke-width="1.5"/>`;
    bottom += `<text x="${CARD_X + 26}" y="${ly2 - 1}" font-size="9.5" font-weight="bold" fill="#fff" text-anchor="middle">${i + 1}</text>`;
    bottom += `<text x="${CARD_X + 42}" y="${ly2}" font-size="11" fill="#3B2412">${esc(wrap(t, 26)[0])}${wrap(t, 26).length > 1 ? '…' : ''}</text>`;
  });
  by2 += 32 + zh + 14;
}

const svgRaw =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${by2 + 10}" width="100%" style="display:block;width:100%;height:auto;" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">`
  + `<rect x="0" y="0" width="${W}" height="${by2 + 10}" fill="#5EA82F"/>`
  + head + cards + bottom + `</svg>`;
const svg = svgRaw.replace(/></g, '>\n<');

const html =
`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SVG 互动 · 多卡片列表版（秀米导入版）</title>
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
console.log('SVG 高度 =', by2 + 10, ' 卡片数 =', ORGS.length, ' 遮罩数 =', ORGS.length);

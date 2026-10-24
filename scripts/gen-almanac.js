/* 图鉴互动卡生成器（真素材嵌入版）—— "秀米SVG互动组件生成" skill
 *
 * 版式：封面 = 矢量高清图鉴卡（原卡构图配色）+ 原版高清立绘 + 阳光花费角标
 *       揭示层 = 羊皮纸边框 + 动图（真实 GIF） + 植物名圆牌/组织名木牌/导语（左对齐堆叠） + 右上角序号徽章 + 正文两端对齐
 * 交互：点击整张卡片 → 卡片收起并淡出，露出背后揭示层（纯 SMIL，无 JS）
 *
 * 用法：
 *   1) 把本脚本与 lib.js 放同目录，素材（透明 PNG 立绘 + 透明 GIF 动图）放脚本同目录或当前目录
 *   2) 改下方 CARD 数据块
 *   3) node gen-almanac.js 输出.html        （输出到当前工作目录）
 *   4) node verify.js 输出.html             （合规 + 点击实测）
 *   5) node snap.js 输出.html               （两态截图自查）
 *
 * 素材制作：
 *   - 动图：ffmpeg -i 原图.gif -vf "fps=12.5,scale=240:240:flags=lanczos,split[a][b];[a]palettegen=reserve_transparent=on[p];[b][p]paletteuse=alpha_threshold=128" -loop 0 动图.gif
 *   - 立绘：ffmpeg -i 原图.gif -vf "select=eq(n\,0)" -frames:v 1 raw.png  →  PIL 裁透明边 + thumbnail((360,360))
 */
const fs = require('fs');
const path = require('path');
const { wrap, esc } = require('./lib.js');

/* ================= 素材（相对脚本目录或当前目录查找） ================= */
/* 分辨率按"显示尺寸 × 2"取即可（本例动图显示 70px → 160px 足够），过大只会白白撑大文件。 */
const ASSETS = {
  lawn: process.env.LAWN_JPG || 'lawn.jpg',         // 整幅草坪背景（可留空字符串则无背景）
  plant: process.env.PLANT_PNG || 'sunny-hd.png',   // 封面静态立绘（透明 PNG）
  anim: process.env.PLANT_GIF || 't_160.gif',       // 揭示层动图（透明 GIF）
};

/* ★ 外链覆盖（重要）：设了对应的 *_URL 就用链接，否则用本地素材 base64 内嵌。
 * 实测秀米导入 HTML 代码时会过滤掉 base64 图片（<image> 整张消失），
 * 唯一可靠路径是**外链**：秀米图床链接（可即时显示）或微信素材库 mmbiz 链接（发布到公众号必需）。
 * 用法：LAWN_URL=... PLANT_URL=... GIF_URL=... node gen-almanac.js 输出.html */
const URLS = {
  lawn: process.env.LAWN_URL || '',
  plant: process.env.PLANT_URL || '',
  anim: process.env.GIF_URL || '',
};
/* 图片属性策略（HREF_MODE，默认 href 单写）：
 *   公众号正文会过滤 xlink:href（属性被清空，只认 href）；
 *   秀米导入同样只认 href（历史上"只写 xlink:href 的 <image> 整张消失"）。
 * 两个渠道的交集 = href 单写。现代浏览器/WebView 均支持 SVG2 的 href。
 * 若需兼容老 WebView 可设 HREF_MODE=both（href + xlink:href 双写，体积翻倍）。 */
const HREF_MODE = process.env.HREF_MODE || 'href';
const hrefPair = u => HREF_MODE === 'xlink' ? `xlink:href="${u}"`
  : HREF_MODE === 'both' ? `href="${u}" xlink:href="${u}"`
  : `href="${u}"`;
const imgAttrs = (mime, data) => hrefPair(`data:image/${mime};base64,${data}`);
/* 外链里的 & 必须转义为 &amp;：微信图床链接形如 .../0?wx_fmt=png&from=appmsg，
 * 不转义会被 HTML 解析器当实体处理，在秀米/F12 注入时可能截断 URL 导致整张图丢失 */
const escUrl = u => String(u)
  .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
  .replace(/"/g, '&quot;');
/* 统一取源：优先外链 URL，其次本地 base64（属性写法由 HREF_MODE 决定，默认 href 单写） */
const srcAttr = (slot, mime, data) => {
  const u = URLS[slot];
  if (u) return hrefPair(escUrl(u));
  return imgAttrs(mime, data);
};

/* 图片来源通道（IMG_MODE）：
 *   image  —— SVG <image>（秀米导入可用；**公众号保存期会被整块剥掉**，实测 href/xlink/双写全灭）
 *   foreign —— <foreignObject> 内嵌普通 <img>（**公众号实测唯一能活下来的图片通道**，D 格验证）
 * 公众号发布/预览请一律用 IMG_MODE=foreign。 */
const IMG_MODE = process.env.IMG_MODE || 'image';
const imgEl = (slot, mime, data, g, opts = {}) => {
  const u = URLS[slot];
  if (IMG_MODE === 'foreign') {
    const src = u ? escUrl(u) : `data:image/${mime};base64,${data}`;
    const fit = opts.cover ? 'object-fit:cover;' : '';
    return `<foreignObject x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}"><img xmlns="http://www.w3.org/1999/xhtml" src="${src}" style="display:block;width:${g.w}px;height:${g.h}px;${fit}"/></foreignObject>`;
  }
  const attr = u ? hrefPair(escUrl(u)) : imgAttrs(mime, data);
  const par = opts.cover ? ' preserveAspectRatio="xMidYMid slice"' : '';
  return `<image ${attr} x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}"${par}/>`;
};
const OUT = path.resolve(process.cwd(), process.argv[2] || 'almanac-card.html');

const b64 = f => {
  const hit = [path.join(__dirname, f), path.join(process.cwd(), f)].find(p => fs.existsSync(p));
  if (!hit) { console.error(`✗ 缺少素材：${f}\n  请放到脚本同目录或当前工作目录，或用环境变量指定路径。`); process.exit(1); }
  return fs.readFileSync(hit).toString('base64');
};
const maybeB64 = (slot, f) => (URLS[slot] || !f ? '' : b64(f));
const PLANT_B64 = maybeB64('plant', ASSETS.plant);
const GIF_B64 = maybeB64('anim', ASSETS.anim);
const LAWN_B64 = maybeB64('lawn', ASSETS.lawn);
const LAWN_OK = !!(LAWN_B64 || URLS.lawn);
/* 背景一致性：草坪按固定基准高绘制（不随组件高度缩放），多张卡放进同一篇文章草坪颗粒一样大。
   矮于基准的卡顶部对齐、底部少露出一点；高于基准的卡等比放大保证铺满。（LAWN_XY 在 H 算出后定义） */
const LAWN_RATIO = parseFloat(process.env.LAWN_RATIO || '1.7143');  /* 草坪图 宽/高（1392×812） */
const LAWN_MIN_H = parseFloat(process.env.LAWN_MIN_H || '395');

/* ================= 数据区 ================= */
/* 默认数据（向日葵·校学生会）；设 CARD_JSON=path 可整包替换，做多卡系列时无需改脚本：
 *   CARD_JSON=card.json node gen-almanac.js 输出.html
 * JSON 字段：name/cost/title/no/lead/body/close */
const CARD = Object.assign({
  name: '向日葵',                 // 植物名（封面横幅 + 揭示层圆牌）
  cost: 50,                       // 阳光花费（封面右下角标）
  title: '校学生会',              // 组织名（揭示层木牌）
  no: '01',                       // 序号（揭示层右上角徽章）
  lead: '阳光生产者，校园学生活动的核心能量来源。',   // 导语（木牌下方，一行）
  body: '一场活动从想法变成现实，中间可少不了向日葵的持续供能。从统筹协调到现场执行，从前期筹备到后勤保障，校园里的许多精彩时刻，都有它在背后持续积攒阳光。',
  close: '想让你的创意变成现实？来这里，一起给校园活动充能！',  // 结尾（按句分两行，居中）
}, process.env.CARD_JSON
  ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), process.env.CARD_JSON), 'utf8'))
  : {});
/* ====================================================== */

const W = 375, PAD = 14;

/* ---- 揭示层布局：顶行左对齐、紧凑上移，序号缩至右上角 ---- */
const FRAME_X = PAD, FRAME_W = W - PAD * 2;
const GIF_W = CARD.gifW || 70, GIF_H = CARD.gifH || 70, GIF_X = 26, GIF_Y = 50;
const X_L = GIF_X + GIF_W + 16;                        /* 圆牌/木牌/导语公共左对齐线（与动图留 16px 间隙） */
/* 植物名圆牌 / 组织名木牌：按字数自适应宽度；可用宽度仍不够则缩字号（长组织名不再顶穿） */
const PILL_W = Math.max(86, CARD.name.length * 15 + 18), PILL_H = 24, PILL_Y = 42;
const NUM = CARD.no, BCX = 322, BCY = 50, BR = 15;     /* 右上角小徽章 */
const PLATE_FS = 16, PLATE_LS = 2, PLATE_PAD_X = 18;
const PLATE_AVAIL = (BCX - BR - 10) - X_L;             /* 木牌右边界不能碰到徽章 */
const _plateNeed = CARD.title.length * (PLATE_FS + PLATE_LS) + PLATE_PAD_X;
/* 长组织名：即使缩到 11px，单行也放不进 X_L→徽章之间的可用宽度
 * → 木牌位置不变（仍在植物名圆牌正下方、左缘与圆牌齐平，与其他卡一致），
 *   但右缘可扩展到面板内缘（牌区在徽章下方 y≥73，与徽章 y35-65 不冲突），
 *   并按「·」分段（中点留上行行末，符合禁则）最多两行、缩小字号。 */
const TITLE_LONG = CARD.title.length * 13 + PLATE_PAD_X > PLATE_AVAIL;
const TXT_X = 38, TXT_W = 299;                         /* 正文列 */
let plateLines = [CARD.title];
let PLATE_X = X_L, PLATE_W = Math.min(Math.max(122, _plateNeed), PLATE_AVAIL);
let PLATE_FS_EFF = _plateNeed <= PLATE_AVAIL ? PLATE_FS
  : Math.max(11, Math.floor((PLATE_AVAIL - PLATE_PAD_X) / CARD.title.length) - PLATE_LS);
const PLATE_Y = PILL_Y + PILL_H + 7;
let PLATE_H = 32;
if (TITLE_LONG) {
  PLATE_W = (FRAME_X + FRAME_W - 12) - X_L;            /* 木牌右缘极限（面板内） */
  const _pw = PLATE_W - 16;                            /* 牌内文字可用宽（左右各留 8） */
  plateLines = CARD.title.split(/(?<=·)/).map(s => s.trim()).filter(Boolean);
  plateLines = plateLines.flatMap(l => {
    if (l.length * 13 <= _pw) return [l];              /* ≤11px 字号 + 2 间距可容下则不拆 */
    const chars = [...l], half = l.length / 2;
    let acc = 0, i = 0;
    while (i < chars.length - 1 && acc + 1 <= half) { acc++; i++; }
    return [l.slice(0, i), l.slice(i)];
  });
  const _maxLen = Math.max(...plateLines.map(l => l.length));
  PLATE_FS_EFF = Math.max(8, Math.min(15, Math.floor(_pw / _maxLen) - PLATE_LS));
  PLATE_H = plateLines.length === 1 ? 32 : plateLines.length * 20 + 14;
}
const LEAD_FS = 12, LEAD_Y = PLATE_Y + PLATE_H + 22;   /* 导语一行放下（12px × N 字 ≤ 254 可用宽） */
const BODY_FS = 15, BODY_LH = 27;
const bodyLines = wrap(CARD.body, Math.floor(TXT_W / BODY_FS));
const BODY_Y0 = Math.max(LEAD_Y + 40, GIF_Y + GIF_H + 44);
const CLOSE_FS = 16.5, CLOSE_LH = 28;
/* 结尾先按句末标点（？。！）断行；某行横向会顶穿边框时，再在逗号处拆成两行（平衡断法） */
const CLOSE_MAX_W = FRAME_W - 28;
let closeLines = CARD.close.split(/(?<=[？。！])/).map(s => s.trim()).filter(Boolean);
/* 并列短句（如「喜欢表达？喜欢创作？」）会被断成过短的多行 → 与相邻行并回，
   条件：任一行短于总长 1/3，且合并后不超宽。仅对碎行生效，正常句长不受影响。 */
if (closeLines.length > 1) {
  const _total = closeLines.reduce((a, l) => a + l.length, 0), _min = _total / 3, _m = [];
  for (const l of closeLines) {
    const p = _m[_m.length - 1];
    if (p !== undefined && (p.length < _min || l.length < _min)
        && (p.length + l.length) * CLOSE_FS <= CLOSE_MAX_W) _m[_m.length - 1] = p + l;
    else _m.push(l);
  }
  closeLines = _m;
}
closeLines = closeLines.flatMap(l => {
  if (l.length * CLOSE_FS <= CLOSE_MAX_W) return [l];
  const parts = l.split(/(?<=，)/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return [l];
  const half = l.length / 2;
  let acc = 0, i = 0;
  while (i < parts.length - 1 && acc + parts[i].length <= half) { acc += parts[i].length; i++; }
  return [parts.slice(0, i).join(''), parts.slice(i).join('')];
});
const CLOSE_FS_EFF = Math.min(CLOSE_FS,
  ...closeLines.map(l => Math.floor(CLOSE_MAX_W / l.length * 10) / 10));
const CLOSE_Y0 = BODY_Y0 + (bodyLines.length - 1) * BODY_LH + 44;
/* 组件高度：由文案决定，但不低于草坪基准高（LAWN_MIN_H）。
 * 目的：背景图（草坪）的显示尺寸必须恒定，与文案行数/组件高度完全解耦 ——
 * 否则多张卡放进同一篇文章时，草地颗粒与显示区域会随卡片高低变化（"背景图大小不要变"）。 */
const H_CONTENT = CLOSE_Y0 + (closeLines.length - 1) * CLOSE_LH + 34 + PAD;
const H = Math.max(H_CONTENT, LAWN_MIN_H);
const DY = (H - H_CONTENT) / 2;        /* 内容在卡内垂直居中，矮卡不露大片空白 */
/* 草坪按固定基准尺寸绘制：宽 = 基准高 × 原图宽高比 → 图框比例 = 原图比例。
 * 因此 slice / meet、以及编辑器是否支持 preserveAspectRatio，渲染结果都一样：
 * 不变形、不裁切、颗粒大小与组件高度无关。 */
const _lawnW = LAWN_MIN_H * LAWN_RATIO, _lawnH = LAWN_MIN_H;
const _lawnY = (H - _lawnH) / 2;
const _lawnX = (-(_lawnW - W)) / 2;
const LAWN_G = { x: _lawnX.toFixed(1), y: _lawnY.toFixed(1), w: _lawnW.toFixed(1), h: _lawnH.toFixed(1) };

const under = [];
/* 面板边框（羊皮纸风：深棕外框 + 细金内线）——固定铺满组件，不随内容居中而偏移 */
const panel = [];
panel.push(`<rect x="${FRAME_X}" y="${PAD}" width="${FRAME_W}" height="${H - PAD * 2}" rx="10" fill="#FFFCF2" stroke="#4B3418" stroke-width="3"/>`);
panel.push(`<rect x="${FRAME_X + 6}" y="${PAD + 6}" width="${FRAME_W - 12}" height="${H - PAD * 2 - 12}" rx="7" fill="none" stroke="#D9BC7A" stroke-width="1.5"/>`);

/* 顶行：左动图(小) + 左对齐堆叠（植物名圆牌/组织名木牌/导语单行） + 右上角小徽章
 * 属性写法统一走 HREF_MODE（默认 href 单写，公众号/秀米都会保留 href、过滤 xlink:href）。 */
under.push(imgEl('anim', 'gif', GIF_B64, { x: GIF_X, y: GIF_Y, w: GIF_W, h: GIF_H }));
under.push(`<rect x="${X_L}" y="${PILL_Y}" width="${PILL_W}" height="${PILL_H}" rx="12" fill="#FFF9E8" stroke="#4B3418" stroke-width="2"/>`);
under.push(`<text x="${X_L + PILL_W / 2}" y="${PILL_Y + 17}" text-anchor="middle" font-size="13" font-weight="bold" fill="#4B3418" letter-spacing="2">${esc(CARD.name)}</text>`);
under.push(`<rect x="${PLATE_X}" y="${PLATE_Y}" width="${PLATE_W}" height="${PLATE_H}" rx="6" fill="#4B3418"/>`);
under.push(`<rect x="${PLATE_X + 3.5}" y="${PLATE_Y + 3.5}" width="${PLATE_W - 7}" height="${PLATE_H - 7}" rx="4" fill="none" stroke="#C9A96A" stroke-width="1.5"/>`);
plateLines.forEach((l, i) => {
  const ty = plateLines.length === 1 ? PLATE_Y + 23 : PLATE_Y + 22 + 20 * i;
  under.push(`<text x="${PLATE_X + PLATE_W / 2}" y="${ty}" text-anchor="middle" font-size="${PLATE_FS_EFF}" font-weight="bold" fill="#EFC75E" letter-spacing="${PLATE_LS}">${esc(l)}</text>`);
});
under.push(`<text x="${X_L}" y="${LEAD_Y}" text-anchor="start" font-size="${LEAD_FS}" fill="#4A331C">${esc(CARD.lead)}</text>`);
under.push(`<circle cx="${BCX}" cy="${BCY}" r="${BR}" fill="#FFDD33" stroke="#4B3418" stroke-width="2.5"/>`);
under.push(`<text x="${BCX}" y="${BCY + 5.5}" text-anchor="middle" font-size="14" font-weight="bold" fill="#4B3418">${NUM}</text>`);

/* 正文（整段两端对齐，末行靠左，纯黑）
 * 两端对齐实现：SVG 无 justify，用 textLength=行宽 + lengthAdjust="spacing" 拉伸非末行；
 * 微信若剥掉该属性则优雅降级为左对齐，不会乱版。 */
bodyLines.forEach((l, i) => {
  const last = i === bodyLines.length - 1;
  const justify = last ? '' : ` textLength="${TXT_W}" lengthAdjust="spacing"`;
  under.push(`<text x="${TXT_X}" y="${BODY_Y0 + i * BODY_LH}" text-anchor="start" font-size="${BODY_FS}" fill="#000000"${justify}>${esc(l)}</text>`);
});
closeLines.forEach((l, i) => {
  under.push(`<text x="${W / 2}" y="${CLOSE_Y0 + i * CLOSE_LH}" text-anchor="middle" font-size="${CLOSE_FS_EFF}" font-weight="bold" fill="#3F7D1F">${esc(l)}</text>`);
});

/* ---- 封面：盖板 + 图鉴卡本体（点击收起 + 淡出）
 *
 * 盖板的作用：SMIL 无 id 无法跨兄弟触发、父级 opacity 必然影响子级，
 * 所以必须有一块不透明盖板压住揭示层。要让盖板"隐形"，有两种做法：
 *   ① 有草坪背景时 → 盖板直接用**同一张草坪图、同一位置同一缩放**（像素级对齐），
 *      于是卡片外看不到任何边框/空白环，点击时是自然的草坪幕布上扫；
 *   ② 无草坪背景时 → 盖板做成与揭示层面板完全同形同色（羊皮纸）的圆角矩形。
 * 早期用"整幅白底盖板"会在秀米/公众号画布上露出白块；用"羊皮纸同形盖板"会在卡片外
 * 留一圈米白空白环（用户明确不要）—— 有背景图时务必走 ①。
 */
const CARD_S = 0.9;                                   /* 卡片相对设计尺寸缩放，居中压在盖板上 */
const CW = 224, CH = 336, CX = (W - CW) / 2, CY = 12; /* 卡片设计坐标系（勿改，内部元素按此排布） */
const _cx = W / 2, _cy = PAD + (H - PAD * 2) / 2;      /* 盖板中心 */
const _tx = (_cx - (CX + CW / 2) * CARD_S).toFixed(2), _ty = (_cy - (CY + CH / 2) * CARD_S).toFixed(2);

const cover = [];
/* 盖板 */
if (LAWN_OK) {
  /* 内容高于草坪基准时，草坪盖不到上下边缘 → 先垫与背景层同色的深绿，
   * 保证封面仍是整片"草坪幕布"，不会露出揭示层面板的边框/米色底 */
  if (H > LAWN_MIN_H + 0.5) cover.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#3E7D2E"/>`);
  cover.push(imgEl('lawn', 'jpeg', LAWN_B64, LAWN_G, { cover: true }));
} else {
  cover.push(`<rect x="${FRAME_X}" y="${PAD}" width="${FRAME_W}" height="${H - PAD * 2}" rx="10" fill="#FFFCF2" stroke="#4B3418" stroke-width="3"/>`);
  cover.push(`<rect x="${FRAME_X + 6}" y="${PAD + 6}" width="${FRAME_W - 12}" height="${H - PAD * 2 - 12}" rx="7" fill="none" stroke="#D9BC7A" stroke-width="1.5"/>`);
}
cover.push(`<g transform="translate(${_tx} ${_ty}) scale(${CARD_S})">`);
cover.push(`<ellipse cx="${W / 2}" cy="${CY + CH + 7}" rx="96" ry="9" fill="#000000" opacity="0.08"/>`);
/* 卡片骨架 */
cover.push(`<rect x="${CX}" y="${CY}" width="${CW}" height="${CH}" rx="10" fill="#F2F7EC" stroke="#3A3D2C" stroke-width="4"/>`);
cover.push(`<rect x="${CX + 13}" y="${CY + 49}" width="${CW - 26}" height="220" rx="6" fill="#D9EEE3" stroke="#B9D8C4" stroke-width="2"/>`);
/* 顶部横幅（与原卡同位） */
cover.push(`<rect x="${CX + 11}" y="${CY + 11}" width="${CW - 22}" height="28" rx="5" fill="#4B3418"/>`);
cover.push(`<rect x="${CX + 15}" y="${CY + 14}" width="${CW - 30}" height="22" rx="4" fill="none" stroke="#C9A96A" stroke-width="1.5"/>`);
cover.push(`<text x="${W / 2}" y="${CY + 32}" text-anchor="middle" font-size="19" font-weight="bold" fill="#EFC75E" letter-spacing="4">${esc(CARD.name)}</text>`);
/* 原版高清立绘（按素材真实比例摆放，避免拉伸变形：
 * CARD.plantW/plantH 可指定，缺省按向日葵 320:360）
 * 底部阳光条 */
const PH = CARD.plantH || 180, PW = CARD.plantW || Math.round(PH * 320 / 360);
cover.push(imgEl('plant', 'png', PLANT_B64, { x: (CX + (CW - PW) / 2).toFixed(1), y: (CY + 49 + (220 - PH) / 2).toFixed(1), w: PW, h: PH }));
/* 底部阳光条 */
cover.push(`<rect x="${CX + 13}" y="${CY + 281}" width="${CW - 26}" height="41" rx="6" fill="#F7F4DC" stroke="#D8D2A8" stroke-width="2"/>`);
cover.push(`<text x="${CX + 100}" y="${CY + 312}" text-anchor="middle" font-size="28" font-weight="bold" fill="#3B3B33">${esc(String(CARD.cost))}</text>`);
/* 太阳图标（圆 + 8 向光线） */
const SCX = CX + 175, SCY = CY + 301;
let rays = '';
for (let k = 0; k < 8; k++) {
  const a = k * Math.PI / 4;
  rays += `<line x1="${(SCX + Math.cos(a) * 16).toFixed(1)}" y1="${(SCY + Math.sin(a) * 16).toFixed(1)}" x2="${(SCX + Math.cos(a) * 21.5).toFixed(1)}" y2="${(SCY + Math.sin(a) * 21.5).toFixed(1)}" stroke="#E8A81C" stroke-width="2.8" stroke-linecap="round"/>`;
}
cover.push(rays);
cover.push(`<circle cx="${SCX}" cy="${SCY}" r="14" fill="#FFDD33" stroke="#E8A81C" stroke-width="2.4"/>`);
cover.push(`<circle cx="${SCX}" cy="${SCY}" r="8.5" fill="#FFF3A6"/>`);
cover.push(`</g>`);

/* ---- 组装：揭示层在下，封面（白底 + 卡片，点击收起 + 淡出）在上 ---- */
const svgParts = [];
svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg"${HREF_MODE === 'href' ? '' : ' xmlns:xlink="http://www.w3.org/1999/xlink"'} viewBox="0 0 ${W} ${H}" width="100%" style="display:block;width:100%;height:auto;" font-family="-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif">`);
/* 草坪背景：垫在最底层，两个状态都可见（固定基准尺寸，各卡完全一致） */
if (LAWN_OK) {
  /* 兜底底色：仅当内容高于草坪基准（组件比草坪高）时才会露出，避免上下出现空白条 */
  if (H > LAWN_MIN_H + 0.5) svgParts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#3E7D2E"/>`);
  svgParts.push(imgEl('lawn', 'jpeg', LAWN_B64, LAWN_G, { cover: true }));
}
svgParts.push(panel.join('\n'));
svgParts.push(DY > 0.05 ? `<g transform="translate(0 ${DY.toFixed(1)})">\n${under.join('\n')}\n</g>` : under.join('\n'));
svgParts.push(`<g><g>`);
svgParts.push(`<animateTransform attributeName="transform" type="scale" begin="click" from="1 1" to="1 0.001" dur="0.45s" fill="freeze" restart="always"/>`);
svgParts.push(`<animate attributeName="opacity" begin="click" from="1" to="0" dur="0.4s" fill="freeze" restart="always"/>`);
svgParts.push(cover.join('\n'));
svgParts.push(`</g></g>`);
svgParts.push(`</svg>`);

const svgRaw = svgParts.join('\n');
/* 展开成多行便于人工查看（文本全为中文时安全）；base64 内的换行要清掉 */
const pretty = svgRaw.replace(/></g, '>\n<').replace(/(data:image\/(?:gif|png);base64,[A-Za-z0-9+/=]+)/g, m => m.replace(/\n/g, ''));

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(CARD.name)} · ${esc(CARD.title)}（SVG 互动图鉴）</title>
<style>body{margin:0;padding:24px 0;background:#EDEDED;}/* 浅灰仅为在本机看清"透明背景"效果；公众号文章里是白底，视觉一样 */#wrap{max-width:375px;margin:0 auto;}</style>
</head>
<body>
<!-- 秀米导入区：复制下方 section 起的全部代码 -->
<section style="margin:0;padding:0;max-width:677px;">
${pretty}
</section>
</body>
</html>
`;

/* ① 预览版：带 <style> 方便本机浏览器查看（body 白底与公众号一致） */
fs.writeFileSync(OUT, html);

/* ② 秀米清洁版：无 <style> 标签、无脚本，最小文档 —— 用于「导入HTML代码」或 F12 替换 */
const xiumi = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:transparent;">
<!-- 秀米导入区：复制下方 section 起的全部代码（组件本身无底色，透明背景） -->
<section style="margin:0;padding:0;max-width:677px;">
${pretty}
</section>
</body>
</html>
`;
const XIUMI_OUT = OUT.replace(/\.html?$/i, '') + '-xiumi.html';
fs.writeFileSync(XIUMI_OUT, xiumi);

console.log(`written: ${OUT} | ${(html.length / 1024).toFixed(0)} KB | H=${H} | body ${bodyLines.length} 行 / close ${closeLines.length} 行`);
console.log(`written: ${XIUMI_OUT} | ${(xiumi.length / 1024).toFixed(0)} KB（秀米导入用）`);

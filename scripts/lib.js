// -*- coding: utf-8 -*-
/**
 * 公共库：植物矢量图形 + 中文断行工具
 * 供 gen.js（7 卡片全量版）与 gen-cob.js（玉米加农炮单卡版）共用
 */

const rot = (n, cx, cy, inner) =>
  Array.from({ length: n }, (_, i) =>
    `<g transform="rotate(${(i * 360 / n).toFixed(2)} ${cx} ${cy})">${inner}</g>`).join('');

const PLANTS = {
  sunflower: () =>
    `<ellipse cx="50" cy="113" rx="24" ry="5.5" fill="#000000" opacity="0.10"/>` +
    `<path d="M50 113 C47 93 47 76 50 58" stroke="#4E9E2C" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    `<path d="M50 97 C32 99 17 89 13 75 C34 70 46 78 50 88 Z" fill="#5BB733" stroke="#3E8A22" stroke-width="2.5"/>` +
    `<path d="M50 93 C68 95 83 85 87 71 C66 66 54 74 50 84 Z" fill="#4FA82B" stroke="#3E8A22" stroke-width="2.5"/>` +
    rot(12, 50, 42, `<ellipse cx="50" cy="18" rx="8.5" ry="16" fill="#FFD43B" stroke="#E2A21D" stroke-width="2"/>`) +
    `<circle cx="50" cy="42" r="17" fill="#E8902E" stroke="#B96A18" stroke-width="2.5"/>` +
    `<ellipse cx="43.5" cy="38" rx="3.6" ry="4.8" fill="#fff"/><ellipse cx="56.5" cy="38" rx="3.6" ry="4.8" fill="#fff"/>` +
    `<circle cx="44.2" cy="39" r="2" fill="#2B1A0C"/><circle cx="57.2" cy="39" r="2" fill="#2B1A0C"/>` +
    `<path d="M42.5 48 Q50 56 57.5 48" stroke="#7A3E10" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,

  cobcannon: () => {
    let k = '';
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++)
      k += `<circle cx="${44.5 + c * 7}" cy="${24 + r * 8}" r="2.7" fill="#DCA41A" opacity="0.85"/>`;
    const cob =
      `<rect x="40" y="14" width="21" height="60" rx="10.5" fill="#F2C33D" stroke="#C08C16" stroke-width="2.5"/>${k}` +
      `<path d="M40 62 C34 74 36 84 43 88 L43 66 Z" fill="#7DBF3C" stroke="#4E9E2C" stroke-width="2"/>` +
      `<path d="M61 62 C67 74 65 84 58 88 L58 66 Z" fill="#7DBF3C" stroke="#4E9E2C" stroke-width="2"/>`;
    return `<ellipse cx="50" cy="114" rx="32" ry="5.5" fill="#000000" opacity="0.10"/>` +
      `<rect x="20" y="76" width="60" height="34" rx="11" fill="#4E6B3A" stroke="#2F4423" stroke-width="2.5"/>` +
      `<rect x="26" y="82" width="48" height="9" rx="4.5" fill="#6C8C50"/>` +
      `<circle cx="34" cy="110" r="9" fill="#2F4423" stroke="#1C2C14" stroke-width="2"/><circle cx="34" cy="110" r="3" fill="#6C8C50"/>` +
      `<circle cx="66" cy="110" r="9" fill="#2F4423" stroke="#1C2C14" stroke-width="2"/><circle cx="66" cy="110" r="3" fill="#6C8C50"/>` +
      `<g transform="rotate(-19 50 70)">${cob}</g><g transform="rotate(19 50 70)">${cob}</g>`;
  },

  starfruit: () => {
    const R = 38, r2 = 16.5, cx = 50, cy = 56, pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (-90 + i * 36) * Math.PI / 180, rad = (i % 2 ? r2 : R);
      pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`);
    }
    return `<ellipse cx="50" cy="115" rx="22" ry="5" fill="#000000" opacity="0.10"/>` +
      `<path d="M50 22 C48 12 44 8 38 6 C44 14 46 18 47 24 Z" fill="#5BB733" stroke="#3E8A22" stroke-width="2"/>` +
      `<path d="M50 22 C52 12 56 8 62 6 C56 14 54 18 53 24 Z" fill="#4FA82B" stroke="#3E8A22" stroke-width="2"/>` +
      `<path d="M${pts.join(' L')} Z" fill="#FFE24D" stroke="#DFA317" stroke-width="3" stroke-linejoin="round"/>` +
      `<ellipse cx="43" cy="52" rx="3.4" ry="4.4" fill="#fff"/><ellipse cx="57" cy="52" rx="3.4" ry="4.4" fill="#fff"/>` +
      `<circle cx="43.6" cy="53" r="1.9" fill="#2B1A0C"/><circle cx="57.6" cy="53" r="1.9" fill="#2B1A0C"/>` +
      `<path d="M43 61 Q50 68 57 61" stroke="#B37E10" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  },

  cattail: () =>
    `<ellipse cx="50" cy="114" rx="20" ry="5" fill="#000000" opacity="0.10"/>` +
    `<path d="M50 114 C46 92 46 62 50 34" stroke="#4E9E2C" stroke-width="7.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M48 108 C28 100 16 82 16 60 C32 70 42 84 48 98 Z" fill="#5BB733" stroke="#3E8A22" stroke-width="2.5"/>` +
    `<path d="M52 104 C72 96 84 78 84 56 C68 66 58 80 52 94 Z" fill="#4FA82B" stroke="#3E8A22" stroke-width="2.5"/>` +
    `<path d="M50 34 L50 16" stroke="#8A5A2B" stroke-width="4" stroke-linecap="round"/>` +
    `<rect x="40.5" y="14" width="19" height="42" rx="9.5" fill="#8A5A2B" stroke="#5C3A1E" stroke-width="2.5"/>` +
    `<circle cx="45" cy="23" r="1.7" fill="#B98A54"/><circle cx="55" cy="30" r="1.7" fill="#B98A54"/>` +
    `<circle cx="46" cy="40" r="1.7" fill="#B98A54"/><circle cx="54" cy="48" r="1.7" fill="#B98A54"/>` +
    `<ellipse cx="45.5" cy="31" rx="2.6" ry="3.4" fill="#fff"/><ellipse cx="54.5" cy="31" rx="2.6" ry="3.4" fill="#fff"/>` +
    `<circle cx="46" cy="32" r="1.5" fill="#2B1A0C"/><circle cx="55" cy="32" r="1.5" fill="#2B1A0C"/>` +
    `<path d="M45 38 Q50 43 55 38" stroke="#3A2210" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,

  fumeshroom: () =>
    `<ellipse cx="50" cy="114" rx="30" ry="5.5" fill="#000000" opacity="0.10"/>` +
    `<rect x="38" y="70" width="24" height="44" rx="11" fill="#F5E9F8" stroke="#C9A9D6" stroke-width="2.5"/>` +
    `<path d="M18 68 C18 40 32 26 50 26 C68 26 82 40 82 68 Z" fill="#9B59B6" stroke="#6E3A87" stroke-width="3"/>` +
    `<ellipse cx="50" cy="68" rx="32" ry="8" fill="#8A4BA6" stroke="#6E3A87" stroke-width="2.5"/>` +
    `<ellipse cx="35" cy="45" rx="6" ry="4.5" fill="#C79BDB" opacity="0.75"/>` +
    `<ellipse cx="62" cy="39" rx="5" ry="3.6" fill="#C79BDB" opacity="0.75"/>` +
    `<ellipse cx="44" cy="80" rx="3.6" ry="4.8" fill="#fff"/><ellipse cx="57" cy="80" rx="3.6" ry="4.8" fill="#fff"/>` +
    `<circle cx="44.6" cy="81" r="2" fill="#3A1550"/><circle cx="57.6" cy="81" r="2" fill="#3A1550"/>` +
    `<path d="M42 92 Q50 100 58 92" stroke="#7A3E9A" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<circle cx="16" cy="86" r="6" fill="#D6BEE4" opacity="0.55"/><circle cx="8" cy="96" r="4" fill="#D6BEE4" opacity="0.55"/>`,

  torchwood: () =>
    `<ellipse cx="50" cy="115" rx="28" ry="5.5" fill="#000000" opacity="0.10"/>` +
    `<path d="M50 6 C60 26 42 34 50 52 C56 38 68 38 62 22 C70 32 72 44 66 54 C62 62 54 64 50 66 C46 64 38 62 34 54 C28 44 30 32 38 22 C32 38 44 38 50 6 Z" fill="#FF8A2B" stroke="#D95F0C" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M50 26 C56 38 46 42 50 54 C54 44 60 46 56 36 C60 42 60 50 56 56 C53 61 52 62 50 63 C48 62 47 61 44 56 C40 50 40 42 44 36 C40 46 46 44 50 26 Z" fill="#FFDD4D"/>` +
    `<path d="M26 114 L29 62 Q50 52 71 62 L74 114 Z" fill="#A9743F" stroke="#6E451E" stroke-width="3"/>` +
    `<ellipse cx="50" cy="62" rx="21" ry="8.5" fill="#C4884A" stroke="#6E451E" stroke-width="3"/>` +
    `<ellipse cx="50" cy="62" rx="12" ry="4.8" fill="none" stroke="#8A5E2E" stroke-width="2"/>` +
    `<ellipse cx="41" cy="82" rx="3.4" ry="4.6" fill="#fff"/><ellipse cx="59" cy="82" rx="3.4" ry="4.6" fill="#fff"/>` +
    `<circle cx="41.6" cy="83" r="1.9" fill="#2B1A0C"/><circle cx="59.6" cy="83" r="1.9" fill="#2B1A0C"/>` +
    `<path d="M41 96 Q50 105 59 96" stroke="#3A2210" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,

  sunshroom: () =>
    `<circle cx="50" cy="76" r="46" fill="#FFF3B0" opacity="0.20"/>` +
    `<circle cx="50" cy="76" r="34" fill="#FFF3B0" opacity="0.25"/>` +
    rot(8, 50, 76, `<rect x="48.8" y="14" width="2.4" height="9" rx="1.2" fill="#FFD93B" opacity="0.8"/>`) +
    `<ellipse cx="50" cy="114" rx="22" ry="5" fill="#000000" opacity="0.10"/>` +
    `<rect x="42" y="80" width="16" height="34" rx="8" fill="#FBF0D2" stroke="#D9C08A" stroke-width="2.5"/>` +
    `<path d="M20 82 C20 58 33 44 50 44 C67 44 80 58 80 82 Z" fill="#FFE97A" stroke="#DFA317" stroke-width="3"/>` +
    `<ellipse cx="50" cy="82" rx="30" ry="7.5" fill="#FFD43B" stroke="#DFA317" stroke-width="2.5"/>` +
    `<ellipse cx="37" cy="63" rx="5.5" ry="4" fill="#FFF6C4"/><ellipse cx="62" cy="57" rx="4.5" ry="3.2" fill="#FFF6C4"/>` +
    `<ellipse cx="44.5" cy="92" rx="3.2" ry="4.3" fill="#fff"/><ellipse cx="55.5" cy="92" rx="3.2" ry="4.3" fill="#fff"/>` +
    `<circle cx="45" cy="93" r="1.8" fill="#5A3C08"/><circle cx="56" cy="93" r="1.8" fill="#5A3C08"/>` +
    `<path d="M44 102 Q50 108 56 102" stroke="#B07C10" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
};

const PLANT_BOX = { w: 100, h: 118, scale: 0.575 };   // → 57.5 x 67.85

/* ---- 装饰性图形：空位幼苗 / 僵尸 ---- */
function zombieSvg(skin, eye, mouth) {
  return `<ellipse cx="50" cy="112" rx="24" ry="5" fill="#000000" opacity="0.15"/>`
    + `<path d="M32 112 L32 74 Q32 66 40 66 L60 66 Q68 66 68 74 L68 112 Z" fill="${skin}" stroke="#3F4A31" stroke-width="2.5"/>`
    + `<path d="M32 112 L32 74 Q32 66 40 66 L46 66 L46 112 Z" fill="#FFFFFF" opacity="0.14"/>`
    + `<rect x="28" y="40" width="44" height="32" rx="13" fill="${skin}" stroke="#3F4A31" stroke-width="2.5"/>`
    + `<circle cx="42" cy="55" r="4.6" fill="#2A331E"/><circle cx="59" cy="55" r="4.6" fill="#2A331E"/>`
    + `<text x="42" y="58" font-size="7" font-weight="900" fill="#C8D6B0" text-anchor="middle" font-family="sans-serif">${eye}</text>`
    + `<text x="59" y="58" font-size="7" font-weight="900" fill="#C8D6B0" text-anchor="middle" font-family="sans-serif">${eye}</text>`
    + `<path d="${mouth}" stroke="#2A331E" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    + `<rect x="16" y="76" width="20" height="7" rx="3.5" fill="${skin}" stroke="#3F4A31" stroke-width="2"/>`
    + `<rect x="64" y="78" width="20" height="7" rx="3.5" fill="${skin}" stroke="#3F4A31" stroke-width="2"/>`
    + `<rect x="22" y="58" width="7" height="26" rx="3.5" fill="${skin}" stroke="#3F4A31" stroke-width="2"/>`;
}

PLANTS.seedling = () =>
  `<ellipse cx="50" cy="104" rx="24" ry="5" fill="#000000" opacity="0.13"/>`
  + `<path d="M50 104 L50 70" stroke="#4E9E2C" stroke-width="6" fill="none" stroke-linecap="round"/>`
  + `<path d="M50 76 C36 78 26 70 24 60 C38 58 46 66 50 72 Z" fill="#6CC63F"/>`
  + `<path d="M50 72 C64 74 74 66 76 56 C62 54 54 62 50 68 Z" fill="#6CC63F"/>`
  + `<g opacity="0.55">`
  + `<path d="M80 106 L80 84 Q80 78 74 78 L68 78 Q62 78 62 84 L62 106 Z" fill="#5C6B4A"/>`
  + `<rect x="60" y="60" width="22" height="20" rx="8" fill="#8FA37A"/>`
  + `<circle cx="67" cy="69" r="2.4" fill="#39432C"/><circle cx="76" cy="69" r="2.4" fill="#39432C"/>`
  + `<rect x="52" y="82" width="12" height="5" rx="2.5" fill="#8FA37A"/>`
  + `</g>`;

PLANTS.z1 = () => zombieSvg('#7C8B6A', '?', 'M37 84 Q47 92 57 84');
PLANTS.z2 = () => zombieSvg('#8FA37A', '·', 'M38 86 L56 86');
PLANTS.z3 = () => zombieSvg('#6F7F5E', '?', 'M36 88 Q47 96 58 86');
PLANTS.z4 = () => zombieSvg('#9AAE82', '-', 'M38 88 Q47 82 56 88');


/**
 * 中文断行：中文=1 单位，英文/数字≈0.55 单位
 * maxUnits     首行之后每行的单位宽度
 * firstMaxUnits 首行单位宽度（用于给行内标签让位），不传则与 maxUnits 相同
 */
function wrap(text, maxUnits, firstMaxUnits) {
  const unit = (ch) => (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1 : 0.55);
  const lines = [];
  let cur = '', curU = 0, limit = firstMaxUnits || maxUnits;
  for (const ch of text) {
    const u = unit(ch);
    if (curU + u > limit && cur.length) { lines.push(cur); cur = ch; curU = u; limit = maxUnits; }
    else { cur += ch; curU += u; }
  }
  if (cur) lines.push(cur);
  // 中文禁则：行首不出现句读/收尾标点，把它们上提一行
  const bad = '、。，．！？；：」』）】》〉”’…';
  for (let i = 1; i < lines.length; i++) {
    let guard = 0;
    while (lines[i].length && bad.includes(lines[i][0]) && guard++ < 3) {
      if (lines[i - 1].length <= 1) break;
      lines[i] = lines[i - 1].slice(-1) + lines[i];
      lines[i - 1] = lines[i - 1].slice(0, -1);
    }
  }
  return lines;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = { rot, PLANTS, PLANT_BOX, wrap, esc };

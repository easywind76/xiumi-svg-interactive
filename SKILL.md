---
name: wechat-svg-interactive
description: 制作可在微信公众号正文直接发布、可导入秀米编辑器的 SVG 互动图文（点击展开/揭示类组件，无 JS、纯 SMIL 动画）。当用户要求做公众号 SVG 互动推文、秀米可导入的互动组件、点击展开式图文（如社团/组织招募、档案解锁、点击抽卡等），或需要把已有互动 H5 降级为公众号兼容的纯 SVG 版本时使用。典型触发词：SVG 互动、秀米、公众号互动图文、点击展开、-svg-组件。
agent_created: true
---

# 秀米SVG互动组件生成（WeChat SVG Interactive）

## Overview

产出符合微信公众号正文白名单的**纯 SVG + SMIL 动画**互动图文（点击揭示/展开），并交付**两种可粘贴代码**（公众号直注 / 秀米导入）。核心工作流（已实战验证）：

1. **生成** SVG 互动网页（数据驱动的生成脚本）
2. **编辑修改** 生成出的网页（改数据块重跑，不手改坐标）
3. **交付**：目标渠道是**公众号**时走「`foreignObject` + `<img>` + mmbiz 外链」骨架 + F12 直注（**首选**，见第 5 阶段通道 B）；需要秀米中转时走清洁 HTML（通道 A）
4. **验证**：合规 + 交互 + 公众号环境模拟（`verify.js` / `check-wx.js`）

## 核心约束（必读）

微信公众号会剥离 `<script>`、`onclick` 等事件属性、`<iframe>`、`id` 属性、`<filter>`、渐变、`<clipPath>`、`<use>`。唯一存活的交互方式是 **SVG SMIL 声明式动画**（`<animate>` / `<animateTransform>` + `begin="click"`）。

已实测验证的触发语义（架构设计的根基）：
- 点击动画元素本身 → 触发 ✅
- 点击持有动画的 `<g>` 的**任意子元素** → 触发（事件冒泡）✅
- 点击兄弟元素 → 不触发 ❌
- 跨元素触发（`begin="otherId.click"`）不可用，因为微信剥 `id` ❌

详细白名单、排版规则、踩坑清单见 `references/wechat-svg-constraints.md`——**动手前先读它**。

## 素材铁律（有素材必须原封不动使用）

**用户提供了素材（图片 / GIF / 截图 / 卡片原图）时，一律直接嵌入原文件本身，绝不用矢量代码"重画/仿制"。**

- 矢量重画只能"接近"，做不到"一模一样"——用户提供素材的**默认意图就是要那张图**，不是要一个像它的矢量图。
- 只有用户明确说"用代码画一个类似的"时，才走纯矢量路线。
- 落地方式：素材转 base64 内联（`<image href="data:image/png;base64,...">`），静态图与 GIF 同理。渲染时先用 Read 打开处理后的素材**亲眼确认**（抠底干净、无残边、动画帧在）。
  - ⚠️ **目标渠道是公众号时例外**：base64 与 SVG `<image>` 都会被保存期清洗掉，必须改成**外链 + `foreignObject`**（先把图传进公众号图片库，用 mmbiz 链接；见第 5 阶段通道 B）。本地预览仍可先用 base64 跑通版式，再切外链重生成。
- 需要处理（去白底 / 裁剪 / 压缩 / 抽帧）时**只做等价处理**，不改构图、不改配色、不改形状；处理完把中间产物存到工作区，便于用户复查。
- 只是"像"的方案必须提前告知并获得同意，不能擅自替换。
- 唯一例外：素材实在拿不到（用户只给了聊天粘贴的 JPG 而原 GIF 丢失）或分辨率不足需重建骨架时，先说明原因，再给替代方案让用户拍板。

常见错误（真实踩过）：用户上传向日葵 GIF 要"一模一样"，先做成了矢量重画——被退回。正确做法是**直接用那张图**。

## 工作流

### 第 1 阶段：需求与内容配对

1. 和用户确认内容：每张卡片对应什么实体（组织/产品/角色）、每张卡的展示分区（简介、为什么是它、加入收获等）、整体主题风格（配色、装饰元素）。
2. 确定版式：**多卡列表**（一屏多张卡，各自有揭示幕布）还是**单卡深潜**（一张大卡、多分区）。

### 第 2 阶段：生成 SVG 互动网页

1. 把 `scripts/` 整个目录复制到工作区（`lib.js` 必须与 gen 脚本同目录）。
2. 选生成器：
   - `gen-list.js` — 多卡列表版（**纯矢量**）：卡片矩阵 + 底部面板（档案/招募条件/收获）。改文件头部 `CFG`（配色）、`ORGS`（名称/植物映射/文案）、`ZOMBIES`、`WANTS`、`REWARDS` 数据块。
   - `gen-card.js` — 单卡版（**纯矢量**）：一张卡 + 多分区（label/color/text）。改 `ORG` 对象的 `sections` 数组。
   - `gen-almanac.js` — 图鉴卡版（**真素材嵌入**）：矢量高清图鉴卡做封面（植物名横幅 + 原版立绘 + 花费角标）+ 右上序号，点击整卡收起并淡出，露出羊皮纸揭示层（动图 + 植物名圆牌/组织名木牌/导语左对齐堆叠 + 右上序号徽章 + 正文两端对齐）。改 `CARD` 对象（name/cost/title/no/lead/body/close），素材由 `ASSETS` 指定（默认 `sunny-hd.png` 立绘 + `t_240.gif` 动图）。
     - **每次运行输出两个文件**：`输出.html`（预览版，带 `<style>` 方便本机查看）+ `输出-xiumi.html`（秀米清洁版，无 `<style>`/无脚本/最小文档，**交付给用户导入秀米用的就是它**）。
     - 输出路径按**当前工作目录**解析（`path.resolve(process.cwd(), argv[2])`），不要把 `../` 塞进参数——旧版内部再拼一层 `..`，会静默写到工作区外，导致验证报告"通过"其实验的是旧文件。
3. 运行（用托管 Node；本机版本目录为 `22.22.2-6`）：
   ```
   C:/Users/Lenovo/.workbuddy/binaries/node/versions/22.22.2-6/node.exe gen-list.js 输出.html
   ```
   输出为单文件 HTML（viewBox 尺寸自动按内容计算）。
4. 用浏览器（或 Read + 用户预览）检查：文字换行、卡片高度、配色、揭示幕布位置。

**素材准备（用真图 / 动图时）**

用户给的多半是聊天粘贴图——⚠️ **粘贴进聊天会把 GIF 变成静态 JPG**（动画帧丢失）。必须让用户给**本地文件路径**（如桌面上的原 `.gif`），再用脚本处理：

```bash
# ① 动图压缩（保留透明通道）：768px/107帧/9.5MB → 240px/54帧/约 690KB
ffmpeg -y -i 原图.gif -vf "fps=12.5,scale=240:240:flags=lanczos,split[a][b];[a]palettegen=reserve_transparent=on[p];[b][p]paletteuse=alpha_threshold=128" -loop 0 动图.gif

# ② 抽首帧做静态立绘（原版高清，768px）
ffmpeg -y -i 原图.gif -vf "select=eq(n\,0)" -frames:v 1 raw.png
# 再 PIL：getbbox() 裁掉透明边 → thumbnail((360,360), LANCZOS) 存 PNG

# ③ 去掉白底（素材是白底 JPG 时）
#    PIL 遍历像素：r,g,b > 242 → alpha=0；> 228 → alpha=120（边缘过渡），再 getbbox() 裁剪
```

素材准备用 `C:/Users/Lenovo/.workbuddy/binaries/python/envs/default/Scripts/python.exe`（已装 pillow）。

⚠️ 用真图会显著增大体积（base64 内嵌，动图占大头，成品常 1.8~2.2MB）。**发布到公众号时，图片必须改成外链**：把每张图（含草坪、封面立绘、揭示层动图）先传进公众号图片库，拿到 `mmbiz.qpic.cn` 链接，再切 `IMG_MODE=foreign` 重新生成——base64 与 SVG `<image>` 在保存期都会被清掉（见第 5 阶段通道 B）。动图体积大（尤其原始 GIF 上 MB 级）上传前先压缩：公众号对 GIF 有体积上限，长边压到显示尺寸的 2 倍即可（如显示 88px → 160px）。

### 第 3 阶段：编辑修改

**改需求 = 改数据块重跑脚本**，不要手改生成文件里的坐标——所有布局（换行、高度、居中）都是算出来的，手改会在下次重跑时丢失。

- 改文案/换行 → 数据块里的字符串（`wrap()` 自动按 CJK=1、ASCII=0.55 单位换行，含行首标点禁则）。
- 改配色 → `CFG` 里的色值。
- 加新植物/装饰向量 → `lib.js` 的 `PLANTS` 里加构造函数。
- 需要全新的分区结构 → 才考虑改 gen 脚本的模板部分，改完用同数据回归验证。

### 第 4 阶段：验证

```
NODE_PATH=C:/Users/Lenovo/.workbuddy/binaries/node/workspace/node_modules \
  C:/Users/Lenovo/.workbuddy/binaries/node/versions/22.22.2-6/node.exe verify.js 输出.html
```

`verify.js` 做三层检查：
1. **静态合规自检**：扫描源码确认无 `<script>`/`<use>`/`<defs>`/`<clipPath>`/渐变/`<filter>`/`id` 属性（`<foreignObject>` **不算**违禁——它是公众号唯一存活的图片通道）。
2. **公众号就绪度**：统计图片通道，给出可/不可存活的判定（0 个 `<image>` + N 个 `<foreignObject>` + 全 mmbiz 外链 = ✅）。
3. **puppeteer 交互实测**：找到所有揭示幕布，逐个点击，断言揭示后高度 ≤ 2；并检查每张图是否真的渲染出来、输出截图。

发布前再过一道**公众号环境模拟**（给所有外链请求加 `Referer: https://mp.weixin.qq.com/`，与真实正文一致）：
```
NODE_PATH=... 22.22.2-6/node.exe check-wx.js 输出.html [输出目录]
```
它逐张报告 `<img>`/`<image>` 的渲染尺寸与加载状态、列出非 mmbiz 图床的链接（会被清空）、并出两态截图。**这一步不能省**：本地无 Referer 通过 ≠ 公众号能显示（`img.xiumi.us` 对秀米 Referer 会返回 140×140 白块）。

⚠️ 幕布识别必须限定 `begin="click"`——页面里可能有**常驻氛围动画**（摇摆、呼吸、浮动等 `repeatCount="indefinite"`），把所有 `animateTransform` 都当幕布会误报。判定条件：
```js
[...g.children].some(c => c.tagName === 'animateTransform' && /click/.test(c.getAttribute('begin') || ''))
```

再跑一次视觉自查（两态截图）：
```
NODE_PATH=... 22.22.2-6/node.exe snap.js 输出.html [宽度] [展开态裁剪高度]
```
产出 `snap-closed.png`（收起态）+ `snap-opened.png`（展开态），用 Read 打开人工核对排版。

前置条件：`puppeteer-core` 已装在 `C:/Users/Lenovo/.workbuddy/binaries/node/workspace/node_modules`（若未装：先在该目录下用托管 node 执行 install）。浏览器候选项内置 Edge/Chrome 路径。

⚠️ 已知坑：Edge headless `--screenshot` 的视口宽度不可靠（最小约 500px），会产生假的横向溢出——验证一律走 puppeteer-core，不要用 headless 截图判断布局。

### 第 5 阶段：交付（两条通道，按目标渠道选）

#### 通道 B：公众号直注（**目标渠道是公众号时首选**，2026-10 实战定论）

公众号**保存期**会对正文做服务端清洗：SVG 里的 `<image>` **整块被剥**（href / xlink:href / 双写 / 无参数四种写法实测全灭），且只认自家 `mmbiz.qpic.cn` 图床。唯一存活的图片通道 = **`<foreignObject>` 内嵌普通 `<img>`**（实测可用，GIF 动画照常播放）。秀米作为中转会额外引入一次清洗（`img.xiumi.us` 外链被清空、mmbiz 图对秀米 Referer 返回白块），所以目标渠道是公众号时**不要绕秀米**。

**公众号可存活格式（照抄这个骨架）**：

```html
<section style="margin:0;padding:0;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 395" width="100%"
       style="display:block;width:100%;height:auto;">
    <!-- ① 矢量层：rect / text / animate / animateTransform 全部存活，交互全靠它 -->
    <rect .../>
    <text .../>
    <g transform="translate(X Y)"><g>
      <animateTransform attributeName="transform" type="scale" begin="click" .../>
    </g></g>
    <!-- ② 图片一律走 foreignObject + <img>（不要用 SVG <image>） -->
    <foreignObject x="10" y="20" width="138" height="160">
      <img xmlns="http://www.w3.org/1999/xhtml"
           src="https://mmbiz.qpic.cn/..../0?wx_fmt=png&amp;from=appmsg"
           style="display:block;width:138px;height:160px;"/>
    </foreignObject>
  </svg>
</section>
```

硬要求（少一条就丢图）：
1. **图片只用 `<foreignObject>` + `<img>`**，不要出现任何 `<image>`；
2. `<img>` **必须带 `xmlns="http://www.w3.org/1999/xhtml"`**，并写**内联 px 宽高**（缺宽高在 iOS 上不显示）；
3. `src` 必须是 **mmbiz.qpic.cn** 链接（自家图床），路径尾部尺寸参数用 **`/0`**（原图；`/300` 等缩略图会让 **GIF 退化成单帧静态**）；
4. URL 里的 `&` 必须转义成 `&amp;`（否则截断）；
5. 需要裁切时用 `object-fit:cover`（父级 `foreignObject` 的宽高比 ≠ 图片比例时才会裁）；
6. 不写 `id`、不用 `<script>`/`<use>`/`<filter>`/渐变/`<clipPath>`。

生成：`IMG_MODE=foreign`（`gen-almanac.js` 的环境变量；批量走 `scripts/gen-wx.js`）。
交付给用户的形态：**纯 `<section>` 代码的 .txt**（`scripts/pack-wx.js` 生成），用户在公众号后台走 **F12 → 选中占位元素 → 「以 HTML 格式编辑」→ 粘贴 → 保存草稿 → 手机预览**（绕过秀米，一步只测一个变量）。

#### 通道 A：秀米导入（无 F12 条件时用；注意秀米会再清洗一次）

目标形态（`gen-card.js` 的输出已经是这个形态）：
- `<!DOCTYPE html>` + `<body style="margin:0;padding:0;background:#ffffff;">`
- 注释标记 `<!-- 秀米导入区 -->` 包住 `<section style="...max-width:677px;">` 内的一个 `<svg>`
- 无 `<script>`、无 `<style>` 标签、样式全内联
- SVG 用 `svgRaw.replace(/></g, '>\n<')` 展开成多行（文本全为中文时安全），便于人工微调

**秀米无法上传文件时（实测会遇到）**：把源码直接放进 Windows 剪贴板，用户在秀米里 Ctrl+V 即可——
```powershell
Set-Clipboard -Value (Get-Content -Raw -Encoding UTF8 '路径\xiumi版.html')
```
并在回复里附上文件路径作为手动复制备份（记事本打开 → Ctrl+A → Ctrl+C）。

秀米导入路径（供指导用户）：
- **有 VIP**：秀米 → 图文排版 → 新建图文 → 更多 → 导入HTML代码（粘贴代码或上传 .html 文件）
- **免 VIP 替代**：秀米编辑器 F12 → 选中占位元素 → Edit as HTML → 粘贴代码
- 导出回公众号：秀米 → 导出 → 继续用复制粘贴（不要用"同步到公众号"以外的路径改动 SVG）

## 交互模型说明

公众号 SVG 交互是**单向揭示**（点击后幕布收起，无法再盖回去）——这是行业事实标准（Apple/小米式推文均如此），不要尝试做 toggle。幕布标准结构：

```svg
<g transform="translate(X Y)"><g>
  <rect .../>装饰、提示文字（均 pointer-events="none" 可省略）
  <animateTransform attributeName="transform" type="scale"
    begin="click" from="1 1" to="1 0.001" dur="0.45s" fill="freeze" restart="always"/>
</g></g>
```

外层 `<g>` 只管定位，内层 `<g>` 收拢幕布+装饰+提示文字一起缩放消失（利用"点子元素触发父级 g 动画"的冒泡语义）。

**五条硬约束（都踩过）**：

1. **幕布塌缩到 `scale(1,0.001)` 仍会留 1px 残线** → 必须并列一个 `opacity 1→0` 的 `<animate>` 同步淡出；盖板要盖满揭示内容的全部轮廓（否则揭示层文字会从卡片四周露出来）。
2. **整幅白底盖板会在秀米/公众号的浅灰画布上显形**（用户看到一块白砖，投诉"背景不是透明的"）——**透明背景的正解**：把盖板做成与揭示层面板**完全同轮廓**的圆角矩形（同位置/同尺寸/同描边同填充），面板之外一格填充都不放。点击前面板显示卡片、点击后同一位置显示文字，外部永远是文章背景（真·透明）。
3. **【2026-10-13 最终定论，覆盖一切旧结论】公众号保存期会剥掉 SVG 内全部 `<image>` 元素（href/xlink:href/双写/无参数四种写法实测全灭），唯一存活的图片通道 = `<foreignObject>` 内嵌普通 `<img>`**：`<foreignObject x y width height><img xmlns="http://www.w3.org/1999/xhtml" src="..." style="display:block;width:..px;height:..px"/></foreignObject>`（诊断卡 D 格实测可显示，SMIL 点击动画照常生效）。生成器用 `IMG_MODE` 环境变量切换：`image`（默认，SVG `<image>`，秀米/本地预览用）/ `foreign`（foreignObject+img，**公众号必用**）。注意 `<img>` 要写内联 width/height（否则 iOS 不显示）；草坪等需要裁切的场景用 `object-fit:cover`（本项目草坪图框比例=原图比例，无需裁切）。
4. **公众号图片链接规则（实测）**：href 必须是 mmbiz.qpic.cn（自家图床）链接，秀米图床/base64 均不行；mmbiz 链接路径尾部数字是尺寸参数，`/0`=原图全尺寸，`/300` 等是缩略图且 **GIF 会退化成单帧静态**。外链里的 `&` 必须转义为 `&amp;`。mmbiz 对 `xiumi.us` Referer 有防盗链（返回 140×140 白块）——组件在秀米编辑器里显示白块属正常。同一张图出现两次（背景 + 盖板）用同一 URL。用户实测「编辑器里正常、一保存/预览就丢图」= 保存期服务端白名单清洗，与中转工具无关；定位工具 `scripts/diag-card.js`（A–H 八格一变量，见 references 第 3.2 节）。
5. **秀米图床防盗链**：`img.xiumi.us` 对带 `file://` Referer 的请求返回 403（无 Referer、mp.weixin/秀米 Referer 均放行）——本地 file:// 自查必须剥掉 Referer 头（`snap.js` 已内置）。体积优化用查询参数（实测有效）：`?imageMogr2/format/jpg`（PNG 转 JPG，1.75MB→172KB）、`?imageMogr2/thumbnail/750x/format/jpg`；webp 风格参数（`x-oss-process=style/xmwebp`）慎用，部分环境对 SVG `<image>` 的 webp 支持不稳。

## 排版要点（实战结论）

- **正文两端对齐**：SVG 没有 `justify`。用 `textLength="行宽" lengthAdjust="spacing"` 拉伸**非末行**（末行自然靠左）；微信若剥掉该属性则优雅降级为左对齐，不会乱版。
- **一段话里有多句、要各占一行**：用 `text.split(/(?<=[？。！])/)` 按句末标点断开，别靠自动换行。
- **左对齐堆叠**（植物名圆牌 / 组织名木牌 / 导语）：三者共享同一个 `x` 常量（如 `X_L = 100`），不要各自居中，否则视觉上会"飘"。
- **导语要一行放下**：先算可用宽（`375 - 2*PAD - 左边距`），再定字号；中文 1 字约等于字号宽度。
- **断行宽度用文字栏宽，不是整面板宽**：`wrap(正文, Math.floor(TXT_W / 字号))`（`TXT_W` 是右栏可用宽）。用错会把文字排到 viewBox 之外被裁掉。

## Resources

- `scripts/lib.js` — 共享向量库（植物/僵尸构造函数）+ `wrap()` 中文换行（含禁则）+ `esc()` + `rot()`
- `scripts/gen-list.js` — 多卡列表生成器（纯矢量，3 个可编辑数据块）
- `scripts/gen-card.js` — 单卡分区生成器（纯矢量）
- `scripts/gen-almanac.js` — 图鉴卡生成器（真素材嵌入）。环境变量：
  - `IMG_MODE` = `image`（默认，SVG `<image>`，本地预览/秀米用）/ **`foreign`（公众号必用，`foreignObject`+`<img>`）**
  - `LAWN_URL` / `PLANT_URL` / `GIF_URL`（外链，优先于内嵌 base64）、`CARD_JSON`（卡数据）、`HREF_MODE`（`href` 默认 / `both` / `xlink`）、`LAWN_RATIO` / `LAWN_MIN_H`（背景框基准）
- `scripts/gen-wx.js` — **一键生成公众号可存活版**（`IMG_MODE=foreign` + mmbiz 外链批量出卡）。读 `wx-urls.json` 图链表：`{ lawn, cards: { key: { out, card, plant, gif, static?, cardStatic? } } }`。`--list` 报缺链接、`--print` 只打印 shell 命令（沙箱内 `spawnSync` 被拦时用）
- `scripts/pack-wx.js` — 打包交付件：每卡一份纯 `<section>` 的 `.txt`（F12 直注用）+ `all-cards-wx.html` 总览页
- `scripts/check-wx.js` — **公众号环境模拟实测**（带 `mp.weixin.qq.com` Referer）：图片加载/渲染尺寸、非 mmbiz 图床告警、两态截图
- `scripts/diag-card.js` — 图片通道诊断卡（A–H 八格一变量）：换渠道/微信改版后图片又丢时，用它一次定位保存期剥掉了什么
- `scripts/verify.js` — 合规 + 公众号就绪度 + 交互验证工具
- `scripts/snap.js` — 两态截图自查（收起态 / 展开态）
- `references/wechat-svg-constraints.md` — 深度技术参考：白名单表、**公众号可存活格式规范**、SMIL 触发语义表、排版规则、秀米路径、踩坑清单、交互模型对比

---
name: wechat-svg-interactive
description: 制作可在微信公众号正文直接发布、可导入秀米编辑器的 SVG 互动图文（点击展开/揭示类组件，无 JS、纯 SMIL 动画）。当用户要求做公众号 SVG 互动推文、秀米可导入的互动组件、点击展开式图文（如社团/组织招募、档案解锁、点击抽卡等），或需要把已有互动 H5 降级为公众号兼容的纯 SVG 版本时使用。典型触发词：SVG 互动、秀米、公众号互动图文、点击展开、-svg-组件。
agent_created: true
---

# 秀米SVG互动组件生成（WeChat SVG Interactive）

## Overview

产出符合微信公众号正文白名单的**纯 SVG + SMIL 动画**互动图文（点击揭示/展开），并提供**秀米可导入的 HTML 代码**。核心工作流分三阶段（已经实战验证可行）：

1. **生成** SVG 互动网页（数据驱动的生成脚本）
2. **编辑修改** 生成出的网页（改数据块重跑，不手改坐标）
3. **置换** 为可复制到秀米编辑器的代码（清洁 HTML，无 script/style，全内联样式）

## 核心约束（必读）

微信公众号会剥离 `<script>`、`onclick` 等事件属性、`<iframe>`、`id` 属性、`<filter>`、渐变、`<clipPath>`、`<use>`。唯一存活的交互方式是 **SVG SMIL 声明式动画**（`<animate>` / `<animateTransform>` + `begin="click"`）。

已实测验证的触发语义（架构设计的根基）：
- 点击动画元素本身 → 触发 ✅
- 点击持有动画的 `<g>` 的**任意子元素** → 触发（事件冒泡）✅
- 点击兄弟元素 → 不触发 ❌
- 跨元素触发（`begin="otherId.click"`）不可用，因为微信剥 `id` ❌

详细白名单、排版规则、8 条踩坑清单见 `references/wechat-svg-constraints.md`——**动手前先读它**。

## 工作流

### 第 1 阶段：需求与内容配对

1. 和用户确认内容：每张卡片对应什么实体（组织/产品/角色）、每张卡的展示分区（简介、为什么是它、加入收获等）、整体主题风格（配色、装饰元素）。
2. 确定版式：**多卡列表**（一屏多张卡，各自有揭示幕布）还是**单卡深潜**（一张大卡、多分区）。

### 第 2 阶段：生成 SVG 互动网页

1. 把 `scripts/` 整个目录复制到工作区（`lib.js` 必须与 gen 脚本同目录）。
2. 选生成器：
   - `gen-list.js` — 多卡列表版：卡片矩阵 + 底部面板（档案/招募条件/收获）。改文件头部 `CFG`（配色）、`ORGS`（名称/植物映射/文案）、`ZOMBIES`、`WANTS`、`REWARDS` 数据块。
   - `gen-card.js` — 单卡版：一张卡 + 多分区（label/color/text）。改 `ORG` 对象的 `sections` 数组。
3. 运行（用托管 Node）：
   ```
   C:/Users/Lenovo/.workbuddy/binaries/node/versions/22.22.2-3/node.exe gen-list.js 输出.html
   ```
   输出为单文件 HTML（viewBox 尺寸自动按内容计算）。
4. 用浏览器（或 Read + 用户预览）检查：文字换行、卡片高度、配色、揭示幕布位置。

### 第 3 阶段：编辑修改

**改需求 = 改数据块重跑脚本**，不要手改生成文件里的坐标——所有布局（换行、高度、居中）都是算出来的，手改会在下次重跑时丢失。

- 改文案/换行 → 数据块里的字符串（`wrap()` 自动按 CJK=1、ASCII=0.55 单位换行，含行首标点禁则）。
- 改配色 → `CFG` 里的色值。
- 加新植物/装饰向量 → `lib.js` 的 `PLANTS` 里加构造函数。
- 需要全新的分区结构 → 才考虑改 gen 脚本的模板部分，改完用同数据回归验证。

### 第 4 阶段：验证

```
NODE_PATH=C:/Users/Lenovo/.workbuddy/binaries/node/workspace/node_modules \
  C:/Users/Lenovo/.workbuddy/binaries/node/versions/22.22.2-3/node.exe verify.js 输出.html
```

`verify.js` 做两层检查：
1. **静态合规自检**：扫描源码确认无 `<script>`/`<use>`/`<defs>`/`<clipPath>`/渐变/`<filter>`/`<foreignObject>`/`id` 属性。
2. **puppeteer 交互实测**：找到所有揭示幕布（含 `animateTransform` 的 `<g>`），逐个点击，断言揭示后高度 ≤ 2；并截图。

前置条件：`puppeteer-core` 已装在 `C:/Users/Lenovo/.workbuddy/binaries/node/workspace/node_modules`（若未装：先在该目录下用托管 node 执行 install）。浏览器候选项内置 Edge/Chrome 路径。

⚠️ 已知坑：Edge headless `--screenshot` 的视口宽度不可靠（最小约 500px），会产生假的横向溢出——验证一律走 puppeteer-core，不要用 headless 截图判断布局。

### 第 5 阶段：置换为秀米可导入代码

目标形态（`gen-card.js` 的输出已经是这个形态）：
- `<!DOCTYPE html>` + `<body style="margin:0;padding:0;background:#ffffff;">`
- 注释标记 `<!-- 秀米导入区 -->` 包住 `<section style="...max-width:677px;">` 内的一个 `<svg>`
- 无 `<script>`、无 `<style>` 标签、样式全内联
- SVG 用 `svgRaw.replace(/></g, '>\n<')` 展开成多行（文本全为中文时安全），便于人工微调

秀米导入路径（供指导用户）：
- **有 VIP**：秀米 → 图文排版 → 新建图文 → 更多 → 导入HTML代码（粘贴代码或上传 .html 文件）
- **免 VIP 替代**：秀米编辑器 F12 → 选中占位元素 → Edit as HTML → 粘贴代码
- 导出回公众号：秀米 → 导出 → 继续用复制粘贴（不要用"同步到公众号"以外的路径改动 SVG）

发布到公众号后台的两条路：
1. 秀米排版后复制到公众号编辑器（推荐，保留全部样式）
2. 直接在公众号编辑器正文粘贴 HTML 源码（部分编辑器版本支持）

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

## Resources

- `scripts/lib.js` — 共享向量库（植物/僵尸构造函数）+ `wrap()` 中文换行（含禁则）+ `esc()` + `rot()`
- `scripts/gen-list.js` — 多卡列表生成器（3 个可编辑数据块）
- `scripts/gen-card.js` — 单卡分区生成器
- `scripts/verify.js` — 合规 + 交互 + 截图验证工具
- `references/wechat-svg-constraints.md` — 深度技术参考：白名单表、SMIL 触发语义表、排版规则、秀米路径、8 条踩坑清单、交互模型对比

# 秀米SVG互动组件生成

制作可在**微信公众号正文直接发布**、可**导入秀米编辑器**的 SVG 互动图文（点击展开/揭示类组件）——无 JS、无 `<script>`、纯 SVG + SMIL 动画。

> 实战验证过的三段式工作流：**生成 SVG 互动网页 → 在生成结果基础上编辑修改 → 置换为可复制到秀米编辑器的代码**。
> 已产出真实案例：公众号校级组织招新推文（植物大战僵尸主题，7 张植物卡片点击解锁档案）。

## 为什么是这个方案

微信公众号正文会剥离 `<script>`、`onclick` 等事件属性、`<iframe>`、`id` 属性、`<filter>`、渐变、`<clipPath>`、`<use>`。唯一存活的交互方式是 **SVG SMIL 声明式动画**（`<animate>` / `<animateTransform>` + `begin="click"`）——这正是 Apple、小米等品牌"点击展开"推文的实现原理。

经无头浏览器实测确认的 SMIL 触发语义（整个架构的根基）：

| 点击目标 | 结果 |
|---|---|
| 动画元素本身 | 触发 ✅ |
| 持有动画的 `<g>` 的任意子元素 | 触发（事件冒泡）✅ |
| 兄弟元素 | 不触发 ❌ |
| 跨元素触发 `begin="otherId.click"` | 不可用（微信剥 `id`）❌ |

## 仓库结构

```
├── SKILL.md                            # AI 助手使用的完整工作流说明
├── scripts/
│   ├── lib.js                          # 共享向量库（植物/僵尸构造函数）+ 中文换行（含行首标点禁则）
│   ├── gen-list.js                     # 多卡列表生成器（卡片矩阵 + 底部面板，3 个可编辑数据块）
│   ├── gen-card.js                     # 单卡分区生成器（秀米导入版样板）
│   └── verify.js                       # 合规自检 + puppeteer 点击实测 + 截图
└── references/
    └── wechat-svg-constraints.md       # 深度技术参考：白名单表 / SMIL 语义 / 排版规则 / 8 条踩坑清单
```

## 快速开始

### 1. 生成

复制 `scripts/` 到工作目录，改生成器头部**数据块**（文案、配色、卡片映射），然后用 Node 运行：

```bash
node gen-list.js 输出.html     # 多卡列表版
node gen-card.js 输出.html     # 单卡分区版
```

输出为单文件 HTML，viewBox 尺寸按内容自动计算，中文自动换行（CJK=1、ASCII=0.55 单位，行首不出标点）。

### 2. 编辑修改

**改需求 = 改数据块重跑脚本**，不要手改生成文件里的坐标——所有布局（换行、高度、居中）都是算出来的，手改会在下次重跑时丢失。

### 3. 验证（可选但推荐）

```bash
NODE_PATH=<你的 node_modules 路径> node verify.js 输出.html
```

自动做两层检查：静态合规扫描（禁用标签 / `id` 残留）+ puppeteer 真实点击每个揭示幕布并断言收起。

### 4. 导入秀米 / 发布

- **秀米有 VIP**：图文排版 → 新建图文 → 更多 → 导入HTML代码（粘贴代码或上传 .html）
- **免 VIP 替代**：秀米编辑器写占位文字 → F12 → Edit as HTML → 粘贴替换
- **发布**：秀米 → 导出 → 复制粘贴到公众号后台编辑器

生成的代码形态：无 `<script>`、无 `<style>` 标签、样式全内联，单个 `<svg>` 包在 `max-width:677px` 的 `<section>` 里。

## 核心交互模式

公众号 SVG 交互是**单向揭示**（点击后幕布收起，无法再盖回去）——这是行业事实标准。幕布标准结构：

```svg
<g transform="translate(X Y)"><g>
  <rect .../>装饰、提示文字
  <animateTransform attributeName="transform" type="scale"
    begin="click" from="1 1" to="1 0.001" dur="0.45s" fill="freeze" restart="always"/>
</g></g>
```

外层 `<g>` 只管定位，内层 `<g>` 收拢幕布+装饰+提示文字一起缩放消失（利用"点子元素触发父级 g 动画"的冒泡语义）。

## 已知踩坑（详见 references/）

- Edge headless `--screenshot` 视口宽度不可靠（最小约 500px），验证布局一律走 puppeteer-core
- puppeteer `args` 里 `--force-device-scale-factor` 与 `setViewport.deviceScaleFactor` 并存会挂起
- `mouse.click` 用视口坐标，长页面需先 `scrollIntoView`
- SVG `<text>` 不自动换行，需手动计算；行首标点需做中文禁则处理
- 揭示动画必须包住幕布整体（rect+装饰+文字），否则装饰会残留在揭示后的文字上

## License

MIT

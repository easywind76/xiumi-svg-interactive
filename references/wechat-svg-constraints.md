# 微信公众号 SVG 互动图文：硬约束与实测结论

本文件记录这条链路上所有「不踩就会翻车」的技术事实。改动生成器前先读一遍。

## 1. 为什么必须用 SVG SMIL，不能用 JS

公众号编辑器保存时会对正文 HTML 做清洗：

- `<script>`、`onclick` 等事件属性、`<iframe>` → **全部剥掉**
- 唯一放行的交互能力是 **SVG 声明式动画（SMIL）**：`<animate>` / `<animateTransform>` / `<set>`，
  用 `begin="click"` 触发。它不执行 JS、不能发网络请求，微信选择容忍。
- 这就是 Apple / 小米 / 喜茶等「点一下展开」推文的实现原理。

结论：**任何交互逻辑都必须翻译成 SMIL**，不要试图塞 JS 进去。

## 2. SMIL 触发语义（puppeteer + Edge 实测）

| 操作 | 结果 |
|---|---|
| 点击 `<animate>` 所在元素**自身** | ✅ 触发 |
| 点击该元素**任意子元素**（事件冒泡） | ✅ 触发 |
| 点击**兄弟元素** | ❌ 不触发 |
| 跨元素触发（`begin="otherId.click"`） | ❌ 不可用——**微信会剥掉 id** |

### 由此得出的标准结构（遮罩揭开）

```svg
<g transform="translate(X Y)">      <!-- 外层 g：只负责定位 -->
  <g>                                <!-- 内层 g：挂动画，点击其任意子元素都会触发 -->
    <rect .../>                      <!-- 遮罩本体 -->
    <rect ...  pointer-events="none"/>   <!-- 装饰线，穿透点击 -->
    <text ... pointer-events="none"/>    <!-- 提示文字，穿透点击 -->
    <animateTransform attributeName="transform" type="scale"
      begin="click" from="1 1" to="1 0.001" dur="0.45s" fill="freeze"/>
  </g>
</g>
```

要点：
- **遮罩、装饰、提示文字必须放进同一个内层 `<g>`**。若提示文字是遮罩 rect 的兄弟节点，
  遮罩收起后文字会残留在内容上方（实测踩过）。
- 用 `type="scale"` 纵向压扁，而不是对 `<g>` 做 `height` 动画——`<g>` 没有 height 属性；
  对单个 rect 做 height 动画则带不走装饰和文字。
- 缩放原点 = 内层 g 的局部原点，所以外层 g 必须先 `translate` 到遮罩左上角。
- `to="1 0.001"` 而不是 `1 0`，避免除零渲染异常。
- `fill="freeze"` 让动画停在终态；默认 `restart="always"`，可重复点击重放。

## 3. 微信 SVG 白名单（会被剥掉的东西）

| 禁止 | 原因 |
|---|---|
| `<script>`、事件属性 | 直接剥离 |
| `id` 属性 | **被剥掉**，所以 `<use>`、`url(#xxx)`、`begin="xx.click"` 全部不可用 |
| `<use>` | 依赖 id，连带不可用 |
| `<filter>`（含 drop-shadow）、渐变 `linearGradient/radialGradient`、`<clipPath>` | 白名单外，会被剥；需要时用**多层扁平色块 + opacity** 模拟 |
| `<foreignObject>` | 能用但风险高，**本项目一律不用**，文字全用 `<text>`+`<tspan>` 手动断行 |
| `<image>` | href 必须是**微信素材库链接**（mmbiz.qpic.cn），外链和 base64 都不显示 |

允许且实测可用：`opacity`、`transform`、`pointer-events`（作为 presentation attribute，
被剥掉时降级为「需点到遮罩空白处」，功能不致失效）。

## 4. 排版规则

- **文字必须手动断行**：SVG `<text>` 不自动换行。用 `lib.js` 的 `wrap()`，
  中文按 1 单位、英文数字按 0.55 单位折算宽度。
- **中文禁则**：行首不得出现 `、。，！？；：」』）】` 等，`wrap()` 里已做上提处理。
  不做的话会出现「、喜欢表达的同学」这种行。
- **给行内标签让位**：段落首行若前面有彩色胶囊标签，首行宽度要单独算
  （`wrap()` 的第三个参数 `firstMaxUnits`），否则文字会压到标签上。
- viewBox 宽度用 **375**；公众号正文实际可用宽约 345px，会等比缩到 ~0.92，
  正文 12px 实际渲染 ≈ 11px，仍在可读范围。**不要**用 640/750 宽的 viewBox，字会缩得太小。

## 5. 秀米导入路径

- 入口：xiumi.us → 图文排版 → 新建一个图文 → 顶部菜单「**更多**」→「**导入HTML代码**」
  → 可「导入文件」上传 `.html`，或直接粘贴代码。**该功能需要秀米 VIP。**
- 导出：编辑区顶部「导出」→「继续用复制粘贴」→ 到公众号后台 Ctrl+V。
- **免 VIP 替代法**：在秀米正文里打一段占位文字 → 浏览器 F12 选中那段文字 →
  Edit as HTML → 替换成整段 `<svg>...</svg>`。
- 免 VIP 的另一条路：在本地浏览器打开生成的 HTML，复制**渲染后的 SVG 节点**
  （不是源码字符串）直接粘进公众号后台编辑器。

## 6. 已知踩坑清单

1. **遮罩装饰/文字残留**：见第 2 节，必须同属一个内层 `<g>`。
2. **行首标点**：`wrap()` 必须做禁则，否则观感很差。
3. **无头浏览器假溢出**：Edge headless `--screenshot` 会强制最小窗宽（约 500px），
   且与 `--dump-dom` 测得的视口宽不一致，会产出「右侧被裁掉」的假象。
   判断是否真溢出要用 puppeteer 精确 setViewport，或对比 `document.scrollWidth` 与 `clientWidth`。
4. **puppeteer 参数冲突**：`launch.args` 里的 `--force-device-scale-factor` 与
   `setViewport({deviceScaleFactor})` 并存会挂起，二选一。
5. **mouse.click 是视口坐标**：页面超过一屏时必须先 `scrollIntoView` 再量坐标，
   或者像 `verify.js` 那样直接把视口高度给足（2400）。
6. **选择遮罩的选择器**：`querySelectorAll('g')` 会把外层定位 `<g>` 也算进去（数量翻倍）。
   正确写法是 `[...g.children].some(c => c.tagName === 'animateTransform')`。
7. **长组织名撑爆卡片**：名称超过约 12 字要缩小字号（`orgSize`）并单独给 `orgWrap` 断行宽度。
8. **单向展开是常态**：SMIL 做「展开后收回」需要跨元素触发，而 id 被剥掉做不到。
   「点开就不收回」正是公众号交互图文的通行做法，不要试图做 toggle。

## 7. 交互模型取舍

| 模型 | 可行性 | 说明 |
|---|---|---|
| 遮罩揭开（本 skill 采用） | ✅ | 每张卡自包含，无跨元素依赖，最稳 |
| 舞台切换（点缩略图换大图） | ❌ | 需要「隐藏上一次点开的」，跨元素触发做不到 |
| 手风琴下移 | ❌ | SVG 无文档流，展开会与后续内容重叠 |
| 点击后位移 | ✅ | 对自身/子元素做 translate，可用于小动效 |

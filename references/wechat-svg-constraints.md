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

| 禁止 | 原因 | 替代方案 |
|---|---|---|
| `<script>`、事件属性 | 直接剥离 | SMIL 动画（`begin="click"`） |
| `id` 属性 | **被剥掉**，所以 `<use>`、`url(#xxx)`、`begin="xx.click"` 全部不可用 | 每张卡自包含，不跨元素引用 |
| `<use>` | 依赖 id，连带不可用 | 直接把节点写全 |
| `<filter>`（含 drop-shadow）、渐变 `linearGradient`/`radialGradient`、`<clipPath>` | 白名单外，会被剥 | **多层扁平色块 + opacity** 模拟 |
| **`<image>`（SVG 内嵌图片）** | **公众号保存期整块剥掉**（href / xlink:href / 双写 / 无参数四种写法实测全灭，与链接、宽高、`preserveAspectRatio` 均无关） | **`<foreignObject>` + `<img>`**（唯一存活通道） |
| `base64` data URI、秀米图床（`img.xiumi.us`）外链 | 保存期清空 / 不认 | 图先传公众号图片库，用 **mmbiz.qpic.cn** 链接 |

允许且实测可用：`opacity`、`transform`、`pointer-events`（作为 presentation attribute，
被剥掉时降级为「需点到遮罩空白处」，功能不致失效）、`textLength`/`lengthAdjust`、
`animate`/`animateTransform`/`set`（含 `begin="click"`）、**`foreignObject`**。

⚠️ `<foreignObject>` 的角色只有**一个**：包图片。**不要**用它排文字/做布局——
文字一律 `<text>` + `<tspan>` 手动断行（foreignObject 内部的 HTML 排版在微信里行为不稳定，
且历史结论里它就属于「能用但风险高」的一类）。

### 3.1 公众号可存活格式规范（2026-10 定论，照此产出）

**图片骨架**：

```html
<foreignObject x="10" y="20" width="138" height="160">
  <img xmlns="http://www.w3.org/1999/xhtml"
       src="https://mmbiz.qpic.cn/mmbiz_png/xxxx/0?wx_fmt=png&amp;from=appmsg"
       style="display:block;width:138px;height:160px;"/>
</foreignObject>
```

**五条硬要求**（少一条就丢图）：

1. 图片**只用** `<foreignObject>` + `<img>`，全文 0 个 `<image>`。
2. `<img>` 必须带 `xmlns="http://www.w3.org/1999/xhtml"`，并写**内联 px 宽高**（缺宽高 iOS 不显示）。
3. `src` 用 mmbiz 图床链接，路径尾部尺寸参数用 **`/0`**（原图全尺寸；`/300`、`/640` 是缩略图，
   且 **GIF 会退化成单帧静态**——实测 `/300` 的 GIF 只剩 1 帧 4KB）。
4. URL 里的 `&` 转义为 `&amp;`（不转义会被当实体，URL 截断 → 图挂）。
5. 需要裁切时在 `<img style>` 上加 `object-fit:cover`（`foreignObject` 宽高比 ≠ 图片比例时才有裁切效果；
   比例一致时 cover/contain 等价）。

**矢量层不受影响**：`rect` / `text` / `animate` / `animateTransform` 全部保留，
所以「点击收起」的 SMIL 交互与所有文字排版都照旧，只有图片换了通道。

**验证顺序（每次交付前）**：
`verify.js`（合规 + 公众号就绪度 + 点击交互）→ `check-wx.js`（带公众号 Referer 的图片加载实测）。

### 3.2 交付路径：F12 直注（绕过秀米）

秀米中转会引入**第二次清洗**（`img.xiumi.us` 外链被清空；mmbiz 图对秀米 Referer 返回 140×140 白块，
秀米可能把加载失败的图直接删掉）。目标渠道是公众号时，直接注入：

1. 公众号后台新建图文 → 正文随便打两个字（如 `abc`）；
2. **F12** → Elements → `Ctrl+F` 搜 `abc` → 右键所在元素 → **「以 HTML 格式编辑」**；
3. 把 `pack-wx.js` 产出的纯 `<section>` 代码整段粘进去替换；
4. 点击页面其他区域生效 → **保存草稿 → 手机预览**。

诊断经验：用户报「编辑器里正常、一保存/预览就丢图」= 保存期服务端清洗的特征，
与浏览器渲染无关；此时先跑 `diag-card.js`（A–H 八格一变量）定位通道，不要凭猜改代码。

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

⚠️ **目标渠道是公众号时，优先走第 3.2 节的 F12 直注**——秀米中转会多一层清洗。下面的路径适用于
「必须经秀米排版」或「没有 F12 条件」的场景；此时图片务必先确认在秀米里能显示（mmbiz 图在秀米里
显示白块属正常现象，不代表链接坏）。

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
9. **「编辑器里正常、一保存/预览就丢图」= 公众号保存期服务端清洗**（不是秀米、不是浏览器）。
   特征：粘贴后当场能看到图，保存草稿或预览后图片全没（矢量与文字仍在）。定位用 `diag-card.js`，
   结论见 3.1（图片必须 `<foreignObject>` + mmbiz 链接）。
10. **mmbiz 图链的尺寸参数**：路径尾部 `/0` = 原图全尺寸（组件里必须用这个）；
    `/300`、`/640` 是缩略图，**GIF 会退化成单帧静态**（实测只剩 1 帧、4KB），组件里动图会「不动」。
11. **外链里的 `&` 必须转义**：`...?wx_fmt=png&from=appmsg` 直接写进属性会被当实体解析、URL 截断 → 图挂。
    生成器统一走 `escUrl()` 转义成 `&amp;`。
12. **别把「秀米图床链接坏了」当结论**：`img.xiumi.us` 与 `mmbiz.qpic.cn` 对不同 Referer 的放行策略不同
    （`file://` → 403；秀米 Referer → mmbiz 返回 140×140 白块）。判断链接好坏要用 `check-wx.js`
    模拟**公众号**的 Referer，不要用无 Referer 的一次 curl 下结论。
13. **批量生成后必须逐卡核对文案**：批量脚本里若参数位写错（如把 `CARD_JSON` 判空的 `$4` 写成 `$5`），
    生成器会静默 fallback 到默认卡数据——所有卡都「长得像」但顶着同一份文案。出图后逐张 grep
    圆牌/木牌文字核对，或用 `pack-wx.js` 输出的标签（取自各卡 JSON）交叉确认。
14. **沙箱内 `spawnSync` 可能被拦**（EBUSY，连 `shell:true` 一起拦）：
    `gen-wx.js --print` 只打印 shell 命令，把输出存成 `.sh` 再 `sh` 它即可绕过。

## 7. 交互模型取舍

| 模型 | 可行性 | 说明 |
|---|---|---|
| 遮罩揭开（本 skill 采用） | ✅ | 每张卡自包含，无跨元素依赖，最稳 |
| 舞台切换（点缩略图换大图） | ❌ | 需要「隐藏上一次点开的」，跨元素触发做不到 |
| 手风琴下移 | ❌ | SVG 无文档流，展开会与后续内容重叠 |
| 点击后位移 | ✅ | 对自身/子元素做 translate，可用于小动效 |

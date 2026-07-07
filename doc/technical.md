# Technical

## 1. 技术栈

- 框架 / 语言 / 构建：React 18、TypeScript 5、Vite 5、Less。
- 渲染方式：DOM + CSS/Less 渲染杂志架、漫画 panel、结局海报和弹窗；AI 插图通过 `<img>` 或 CSS background 展示，不使用 Canvas/WebGL。
- 平台能力：`@shared/save` 保存本人故事；`@shared/runtime` 提供 Aigram 环境、用户 ID 和打开资料页；`useGameEvent` 记录发布和反应事件；`useGameStats` 读取连续发布天数。
- 生成接口：`https://chat.aiwaves.tech/aigram/api/game-chat` 生成故事正文和翻译；`https://chat.aiwaves.tech/aigram/api/gen-image` 生成每页插图和终局插图。
- 发布元信息：`meta.json` 标题为 `Pulp Hour`，封面为 `/poster.png`；`src/game-id.ts` 写入永久 UUID `7596f93a-1c72-48c1-8120-9e43a09c4c0d`。

## 2. 目录结构

- `index.html`：Vite 入口，挂载 `#root`。
- `vite.config.ts`：Vite 配置，`base: './'` 保证子路径部署可移植。
- `meta.json`：平台发布标题和封面图。
- `public/poster.png`：平台封面图。
- `public/alteru.svg`：角落水印素材。
- `public/covers/*.jpg`：地摊杂志封面图，也是 AI 插图失败时的回退图。
- `src/main.tsx`：React 挂载入口。
- `src/App.tsx`：渲染 `PulpHour` 主游戏。
- `src/PulpHour/PulpHour.tsx`：主状态机，管理杂志架、选刊、写作、动态终局、发布和每日限制。
- `src/PulpHour/types.ts`：核心类型、动态页数边界常量、故事 outcome 类型。
- `src/PulpHour/PulpHour.less`：全局视觉、漫画 panel、结局印章、杂志架和响应式样式。
- `src/PulpHour/i18n/index.ts`：轻量多语言字典和 locale 检测。
- `src/PulpHour/hooks/useBeatEngine.ts`：故事生成、终局生成、插图生成和 Story 组装。
- `src/PulpHour/hooks/useWall.ts`：公共杂志架读取、解析和按故事去重。
- `src/PulpHour/hooks/useTranslateStory.ts`：故事阅读器的按需翻译和 localStorage 缓存。
- `src/PulpHour/utils/prompts.ts`：可变长度故事 prompt、语言约束、JSON 解析。
- `src/PulpHour/utils/scoring.ts`：隐藏分值系统，计算继续、成功、失败和失败原因。
- `src/PulpHour/utils/covers.ts` 与 `src/PulpHour/data/covers.manifest.json`：封面列表、上线时间和本地路径处理。
- `src/PulpHour/utils/storyArt.ts`：故事封面图选择，按终局插图、末尾 panel、原封面顺序回退。
- `src/PulpHour/utils/tapFeedback.ts`：全局点击音效和触感反馈。
- `src/PulpHour/components/Wall.tsx`：公共杂志架、本人故事合并、反应入口和资料页入口。
- `src/PulpHour/components/Newsstand.tsx`：封面选择界面。
- `src/PulpHour/components/BeatScreen.tsx` 与 `BeatPanel.tsx`：动态写作页、增长式进度点、panel 插图和选择按钮。
- `src/PulpHour/components/EndingScreen.tsx`：动态终局海报、成功/失败印章和发布按钮。
- `src/PulpHour/components/StoryViewer.tsx`：阅读弹窗、翻译、panel 列表和作者资料入口。

## 3. 核心模块

- 状态管理：`PulpHour.tsx` 使用 `phase` 在 `wall`、`newsstand`、`beat`、`ending` 间切换；`beats` 保存所有非终局 panel，`ending` 保存动态终局。
- 隐藏评分：`scoreStory()` 按选择累计 `insight`、`agency`、`cover`、`heat`，再用 `final = insight * 2 + agency * 2 + cover - heat * 2` 判定基础 `success` 或 `failure`；UI 不显示数值。
- 动态收束：`judgeStory()` 在每次选择后决定是否进入终局。最少 3 次选择，第 4 页可死亡；暧昧状态继续生成；12 次选择后强制终局。
- 终局生成：`finishStory()` 用 `judgeStory(beatsSoFar).score` 把 `SUCCESS` 或 `FAILURE`、失败原因和隐藏分摘要注入最终 prompt，要求模型写完整结局且不得提到分数。
- 进度显示：`BeatScreen.tsx` 不显示总页数，只显示 `Beat n` 和随当前页增长的圆点，避免给用户“还剩几页”的暗示。
- 插图流程：每个中段 panel 后台调用 gen-image；终局图同步等待。失败后最多重试 3 次，最终用封面回退并显示重试印章。
- 发布与存档：`useGameSave<PulpSave>('pulp-hour')` 只在初次加载时 seed 到 `mirror`；发布时从 `mirror.stories` 追加新故事并保留前 20 条，避免 `savedData` stale overwrite。
- 公共墙：`useWall()` 从平台读取多个用户保存的故事；`Wall.tsx` 把本人故事乐观合并到墙里，按 `story.id` 去重。
- 多语言：所有 UI 文案走 `t()`；故事生成根据当前 locale 输出；他人故事通过 `useTranslateStory()` 翻译到当前语言并缓存。
- 输入：写作选择、发布、返回和重试用 `onPointerDown`；可滚动墙卡、阅读弹窗关闭和作者资料入口用 `onClick`。
- 音效：`installTapFeedback()` 监听点击，播放 45 ms 三角波提示音并触发 6 ms 震动；隐藏评分不播放单独分数音。

## 4. 扩展点

- 改页数边界：修改 `src/PulpHour/types.ts` 的 `MIN_STORY_BEAT_COUNT`、`MIN_FINALE_PAGE`、`MAX_STORY_BEAT_COUNT`，再同步需求文档。
- 改继续/死亡/成功规则：修改 `src/PulpHour/utils/scoring.ts` 的 `deltaFor()`、`scoreStory()`、`judgeStory()` 和 `failureReasonFor()`。
- 改终局口吻：修改 `src/PulpHour/utils/scoring.ts` 的 `scorePromptLine()` 和 `src/PulpHour/utils/prompts.ts` 的 final beat 规则。
- 换封面素材：替换 `public/covers/*.jpg`，并同步 `src/PulpHour/data/covers.manifest.json` 的 `imageUrl`、`ink`、标题、hook、persona 和 `releasedOn`。
- 调视觉：修改 `src/PulpHour/PulpHour.less` 的颜色变量、panel 尺寸、选择按钮、结局印章和响应式规则。
- 改 UI 文案：修改 `src/PulpHour/i18n/index.ts`，保持 en/zh/ja/ko/es 五种语言都有同名 key。
- 改发布保存：在 `src/PulpHour/PulpHour.tsx` 的 `shareEnding()` 附近扩展，并继续从 `mirror` 读写完整 `PulpSave`。
- 改公共墙和反应：修改 `src/PulpHour/hooks/useWall.ts`、`src/PulpHour/components/Wall.tsx` 和 `src/PulpHour/utils/reactions.ts`。

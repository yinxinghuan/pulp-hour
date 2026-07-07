# Requirements

## 1. Overview

Pulp Hour 是一个移动端互动地摊杂志写作游戏：玩家挑选一本怪谈封面，连续在“抗 / 从 / 骗”之间做选择，故事会根据隐藏分值动态决定早死、脱身、沉没或继续翻页。

## 2. Visual Design

- 页面尺寸：主容器占用 100vw x 100vh，杂志架、选刊、写作页和结局页都在 640 px 最大宽度内居中；移动端底部操作区保留 22 px 内边距和至少 80 px 安全滚动空间。
- 配色：纸张底色 #fbf4dd，旧纸阴影 #f4ecd8，主墨色 #111111，成功/归档黄色 #ffd60a，失败红 #e63946，顺从蓝 #2c6df4，谎言粉 #ff6b9d；每本封面额外使用自己的 `ink` 色作为局部强调。
- 字体：正文使用 Inter/system-ui 15.5 px、行高 1.55；大标题使用 Bangers/Knewave/Permanent Marker 风格字体 22-56 px；选择轴标签固定 26 px，大写，正文选择说明 12 px。
- 写作页：顶部栏显示返回入口、随当前页增长的进度圆点和 “Beat n”；中部是可滚动漫画页堆叠，每个 panel 使用 4:3 插图区域、3 px 黑边、3-6 px 投影；底部三列选择按钮使用 `minmax(0, 1fr)` 防止长文撑开。
- 结局页：最终海报最大宽 520 px，插图 4:3，标题 34 px，结局正文有 3 px 黑边和 14 px 内边距；成功显示黄色 `CASE CLOSED` 印章，失败显示红色 `CASE LOST` 印章，印章动画 280 ms 弹入。
- 美术素材：`poster.png` 用于平台封面；`alteru.svg` 用于水印；`public/covers/*.jpg` 是可选杂志封面和失败回退图；每个故事 panel 的 AI 插图使用封面或玩家头像作为 ref_url 生成。

## 3. Game Mechanics

- 初始值：`MAX_STORIES = 20`；`MIN_STORY_BEAT_COUNT = 3`；`MIN_FINALE_PAGE = 4`；`MAX_STORY_BEAT_COUNT = 12`；`PUBLISH_WAIT_MS = 60000`；`IMAGE_FETCH_TIMEOUT_MS = 280000`；每个 gen-image 失败后最多重试 3 次，间隔 3000 ms 和 6000 ms。
- 动态叙事长度：玩家至少选择 3 次；第 4 页起隐藏判定可以让故事直接死亡或收束。若分值仍暧昧，故事继续生成下一页；第 10 页之后仍允许继续；第 12 次选择后强制生成终局，避免无限生成。
- 隐藏分值：每次选择都累计不可见的 `insight`、`agency`、`cover`、`heat` 四项。第 1-2 页偏向建立线索，第 3-6 页偏向调查推进，第 7 页以后偏向终局压力；所有数值只影响结局和提示词，不在 UI 里显示。
- 计分规则：第 1-2 页选择 `defy` 得 agency +2、heat +2；`yield` 得 insight +2；`lie` 得 cover +2、heat +1。第 3-6 页选择 `defy` 得 agency +2、heat +1；`yield` 得 insight +1、agency -1；`lie` 得 cover +1、heat +2、insight -1。第 7 页以后选择 `defy` 得 agency +3、heat +1；`yield` 得 insight +1、heat +1；`lie` 得 cover +1、heat +3、insight -2。
- 基础成败公式：隐藏总分 `final = insight * 2 + agency * 2 + cover - heat * 2`。成功基础条件为 `final >= 8` 且 `insight + agency >= 8` 且 `heat <= 12`；失败原因分为 `burned`（heat >= 11）、`lost`（insight <= 2）、`unmasked`（cover >= agency + insight + 3）和 `doomed`（默认）。
- 动态收束规则：第 3 次选择后若 `heat >= 6` 且 `final < 4`，第 4 页直接失败；第 4 次选择后若 `insight <= -2` 或伪装压过主动性与线索，直接失败；第 6 次选择后若 `final >= 14`、`insight + agency >= 9` 且 `heat <= 8`，可以成功收束；第 7 次选择后若 `final <= -4`，失败收束；第 10 次选择后只有 `final >= 18` 的强成功会提前收束，否则继续到最多 12 次选择。
- AI 生成：中段提示词必须把故事控制在当前页，不可提前写结局；终局提示词会明确收到 `SUCCESS` 或 `FAILURE`，成功结尾需要付出代价但完成目标，失败结尾需要完整收束而不是突然中断。
- 反馈：每次选择在 200 ms 内进入下一页写作占位或终局占位；插图未完成时显示印刷机占位，失败时显示可点击重试章；最终成败用印章、结局文案和故事墙封面共同体现。

## 4. Controls

- Pointer：写作页底部的“抗 / 从 / 骗”、重试插图、发送到杂志架、返回目录等动作按钮使用 `onPointerDown`，一次按下只触发一次。
- Click：杂志架卡片、可滚动故事列表、阅读弹窗关闭按钮和用户资料入口使用 `onClick`，避免手指滑动列表时误触。
- Scroll：写作页正文区和故事阅读器纵向滚动；新 panel 到达时在 60 ms 后平滑滚动到最新 panel，但图片到达或状态刷新不得反复抢滚动。
- Locale：语言切换按钮更新当前语言；刷新或打开故事时，用户可把他人故事翻译到当前语言。

## 5. Win / Lose Conditions

- 胜利：隐藏判定返回 `success` 后生成终局页；结算页展示标题、终局插图、成功正文、作者署名、黄色 `CASE CLOSED` 印章和“送到杂志架 / 回到目录”按钮。
- 失败：隐藏判定返回 `failure` 后生成终局页；结算页展示标题、终局插图、失败正文、作者署名、红色 `CASE LOST` 印章和同样的发布/返回按钮。
- 继续：隐藏判定返回 `shouldEnd = false` 时继续生成下一页，用户仍看到三选一，不知道剩余页数。
- 发布：玩家每天默认只能发布 1 篇；发布后故事保存到本人的 `stories` 前 20 条，同时刷新公共杂志架。
- 兼容旧故事：缺少 `outcome` 的旧故事仍按普通已归档故事阅读，不显示数值，也不阻止翻译、反应或打开作者主页。

## 6. Sound Effects

- 全局点击反馈：首次交互恢复音频；所有按钮点击触发三角波 680 Hz 到 520 Hz，时长 45 ms，音量约 0.055，并伴随 6 ms 震动。
- 选择成功：沿用点击反馈，并在 200 ms 内切换到写作占位或终局占位；不额外播放分数音，避免暴露隐藏评分。
- 插图重试：触发同一点击音，视觉上用失败印章回到印刷机占位。
- 结局完成：当前版本不新增可感知的胜负音效，成败只通过终局文案和 `CASE CLOSED` / `CASE LOST` 印章表达。

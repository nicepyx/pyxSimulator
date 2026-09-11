# 人生模拟器第一版核心框架

## 范围和入口

环境：Cocos Creator 3.8.8、TypeScript、fairygui-cc 1.2.2。

正常入口仍是 `assets/LoadingScene/LoadingScene.scene` 和原 `UIBootstrap.ts`。本次未改动这两个文件，也未改动 FairyGUI 发布文件或 npm 依赖。

验证入口为 `assets/debug/SimulationDebug.scene`。这是基于现有 LoadingScene 制作的独立调试副本，保留同一份 FairyGUI MainView 接入，并新增 `SimulationDebugRunner` 节点。它不是正式游戏必需的场景。

## 文件与职责

所有脚本位于 `assets/scripts/`，新增资源附带 Cocos `.meta`。

| 文件 | 职责 |
| --- | --- |
| `core/model/PlayerData.ts` | 模式、性别、年龄阶段，以及玩家、属性、家庭、关系、Tag、经历的数据契约 |
| `core/model/GameState.ts` | 玩家和当前/待办事件 ID；纯数据快照复制 |
| `core/model/DataValidation.ts` | 存档输入校验：完整结构、有限数值、范围、唯一 ID 和日志关联 |
| `core/event/LifeEvent.ts` | 事件、条件、选择、效果，以及只读事件来源契约 |
| `core/factory/PlayerFactory.ts` | 生成 6 岁玩家；少量属性在基准值 ±2 内随机；两种模式共享基础规则 |
| `core/system/EffectSystem.ts` | 执行增量、属性 clamp、Tag 添加/删除与去重；非法数字不留下部分修改 |
| `core/system/EventSystem.ts` | 条件判断、选择执行、once 防重、叙事日志、连锁事件；不加载资源、不操作 UI |
| `repository/EventValidation.ts` | 校验人工编辑的事件 JSON、重复 ID、属性键、运算符和事件引用 |
| `repository/EventRepository.ts` | 使用 `resources.load(..., JsonAsset)` 加载 JSON 并建立 ID 索引 |
| `manager/GameManager.ts` | 新游戏、事件推进、存读档；返回独立玩家/状态快照，不直接控制 FairyGUI |
| `manager/SaveManager.ts` | 使用 `sys.localStorage` 存读、检查及清除 `pyxSimulator_save_v1` |
| `debug/SimulationDebugRunner.ts` | 实际资源加载、两事件演示、真实存储往返及清晰的 Console 输出 |
| `debug/SimulationChecks.ts` | 边界自检和内存存储故障夹具；不加入正式事件数据 |
| `assets/resources/data/events/primary_school.json` | 两个正式事件、七个选择及指定的叙事内容 |

核心和 GameManager 没有 Cocos/FGUI 运行时导入。只有资源、存储和 Debug Component 使用 `cc`。

## 流程与 API

先 `await repository.initialize()`，再创建 `GameManager(repository, new SaveManager())`。

```ts
const repository = new EventRepository();
await repository.initialize();
const game = new GameManager(repository, new SaveManager());
game.newGame(OriginMode.Reality, Gender.Male, '小禾');
game.startEvent('primary_first_day');
game.choose('rear_seat'); // 自动进入 primary_first_break
game.choose('join');
const saved = game.saveGame();
const loaded = saved && game.loadGame();
```

调用结果需要检查：`startEvent()`、`choose()` 失败返回 `null`；保存/读取失败返回 `false`。无效选择不改变状态。读取失败不替换当前游戏。Repository 初始化失败会拒绝 Promise，入口需要 try/catch；Debug Runner 已处理。

`newGame()` 只创建玩家，不自动挑选首事件。UI 从 `getCurrentEvent()` 读取标题、剧情及 choices；点击后调用 `choose(choiceId)`，然后重新获取快照刷新。UI 不应缓存旧快照并期待其自动变化。

执行后排选择：independence、curiosity 各 +1，并加入 `first_day_rear_seat`。执行 join：confidence、social、happiness 各 +1，并加入 `joined_classmates_first_break`。两事件分别写入 completedEvents 和指定 LifeLog，玩家仍为 6 岁 Childhood。

当前事件的选择结果提交后，才判断 nextEventId 的条件。满足条件时立即开始下一事件：currentEventId 为下一事件，nextEventId 清空。不满足时保留 nextEventId，后续可通过 `startEvent(id)` 重试。进行中的事件或待办连锁不能被其他事件覆盖。

同一效果中 addTags 与 removeTags 包含同一 Tag 时，删除优先。一次性事件只完成一次；允许重复的事件每次添加经历日志，而 completedEvents 始终只保留一个 ID。

## 使用 SimulationDebugRunner

1. 使用 Cocos Creator **3.8.8** 打开此项目，等待资源导入结束。
2. 在资源管理器中打开 `assets/debug/SimulationDebug.scene`。
3. 确认层级中的 `SimulationDebugRunner` 节点挂有同名组件，Run On Start 已开启。
4. 点击预览运行。FairyGUI MainView 应继续显示；查看编辑器或浏览器 Console，按 `[LifeSimulator]` 过滤。
5. 检查两个事件、四个/三个选择、属性前后值、Added Tag、completedEvents 及两条叙事日志。
6. 最后必须出现 `SAVE/LOAD PASS`、`CHECKS PASS` 和 `ALL CHECKS PASSED`，且没有 `[LifeSimulator] FAIL`、脚本导入错误或未处理异常。
7. 再打开原 `assets/LoadingScene/LoadingScene.scene` 预览，确认原 MainView 独立正常显示。

也可将组件手动挂到其他场景的空节点；不需要改动 UIBootstrap。关闭 Run On Start 可阻止自动运行，通过代码 `await runner.run()` 手动运行，返回 boolean。组件阻止自身并发运行。

验证使用真实 `sys.localStorage` 的指定 Key。已有存档会在 finally 中逐字恢复；原本无存档时保留本次演示存档。损坏 JSON、读取失败、配额不足等故障在内存存储夹具中验证，不会故意破坏实际存档。若恢复旧存档失败，组件输出明确 FAIL，不会报告全部通过。

仅删除调试节点/场景或组件即可取消自动演示；正式运行不依赖 debug 目录。

## 自检覆盖与当前证据

自检代码覆盖：

- Reality/Fantasy 与两种性别，6 岁 Childhood，完整初始数据范围。
- 全部 4 × 3 = 12 条选择路径、前置条件、无效选择、重入和 once 防重。
- 六种属性运算符的真/假分支，显性/隐藏属性，多条件 AND，年龄/阶段/模式/Tag/已完成事件条件。
- 所有显性和隐藏属性上下界，money 可正可负且不使用 0～100 限制。
- Tag 去重、移除不存在 Tag、重复事件的 completedEvents 去重。
- 中途存档、当前事件恢复、待办连锁恢复、快照隔离。
- 损坏或结构无效存档、越界家庭/关系/属性、重复 ID、错误日志关联、存储故障、事件配置错误。
- 演示主流程中的完整 GameState 真实保存/读取一致性。

2026-09-11 已取得的验收证据：

- JSON 可解析；两个事件、七个选择、rear_seat/join 指定增量、连锁指向、once、前置条件和日志文本通过静态检查。
- 调试场景的脚本压缩 UUID 已对照原 UIBootstrap 序列化格式校验；资源及节点引用静态检查通过。
- 核心模型/系统不导入 `cc`，GameManager 不操作 UI；新增代码没有显式 `any` / `as any`。
- Main.bin、UIBootstrap.ts、原 LoadingScene、package.json、package-lock.json 与本次开始时的 SHA256 一致。
- `git diff --check` 通过。按要求没有在终端运行 TypeScript 编译器。
- Cocos Creator 3.8.8 已实际导入全部新增脚本并运行浏览器预览，无脚本导入/转译错误。
- 19:26:58（北京时间），调试场景完成真实 `resources.load` 和 `sys.localStorage` 往返，输出 **224 项断言通过**及 `ALL CHECKS PASSED`。浏览器日志的 warning/error 列表为空。
- 19:28:43，原 LoadingScene 单独预览，输出 `FairyGUI Main 包加载成功`、`MainView 创建成功`，截图确认“人生模拟器”界面正常显示。
- 通过已安装编辑器自带 TypeScript 5.8.2 的只读 API 完成项目语义诊断：18 个源文件入口，诊断为 0；`noEmit: true`，未调用 emit 或终端 tsc。第三方声明文件使用 `skipLibCheck`。
- [运行验收记录](life-simulator-v1-verification.md) 保存关键实测输出、验收对应关系及检查范围；[类型诊断记录](life-simulator-v1-type-diagnostics.json) 保存入口文件清单和空诊断结果。

## 必要调整

- 事件增加可选 `logDescription` 字段，保存指定的人生经历摘要。未配置时使用选择 resultText 或事件标题；属性变化只出现在 Debug Console。
- 第二事件声明 `requiredCompletedEvents: ["primary_first_day"]`，避免越过第一事件。
- 新增两个 JSON 输入校验文件和独立自检文件，防止合法 JSON 中的坏结构进入核心。
- 保留 UIBootstrap 原位置，使用独立调试场景，避免移动现有接入代码或改变正式入口。
- tsconfig 增加 `lib: ["ES2017", "DOM"]`，声明 includes/Object.values 等 API 的类型；没有更改 target、严格模式或现有 Cocos extends，也没有新增依赖。

职业、完整教育、投资、资产、婚姻、成就、战斗、复杂家庭/关系、更多事件、正式 FairyGUI 游戏 UI 均留待后续阶段。

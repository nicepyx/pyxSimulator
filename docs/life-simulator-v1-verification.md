# 第一版运行验收记录

日期：2026-09-11，时间为北京时间。使用已安装的 **Cocos Creator 3.8.8** 导入当前工作区，并访问该编辑器提供的 localhost:7456 预览服务。不是 Node 模拟 Cocos API，也没有新增 npm 依赖。

## 实际运行输出

19:26:58，场景 `35cb72d9-7721-4979-a895-fec3bb020c01`（`assets/debug/SimulationDebug.scene`）：

```text
[LifeSimulator] 已加载 2 个人生事件
[LifeSimulator] 创建 Reality 玩家：age=6, stage=childhood
[LifeSimulator] visible: {"health":81,"intelligence":48,"charm":49,"social":50,"willpower":50,"happiness":70,"money":0}
[LifeSimulator] hidden: {"confidence":52,"independence":50,"discipline":50,"riskTolerance":50,"curiosity":52,"responsibility":50,"empathy":50,"resilience":50}
[LifeSimulator] tags: []
[LifeSimulator] Choice rear_seat: 找一个靠后排的位置坐下
[LifeSimulator] Choice front_seat: 找一个靠前的位置坐下
[LifeSimulator] Choice social_seat: 找一个看起来好相处的同学旁边坐下
[LifeSimulator] Choice wait_teacher: 站在门口等老师安排
[LifeSimulator] independence: 50 -> 51
[LifeSimulator] curiosity: 52 -> 53
[LifeSimulator] Added Tag: first_day_rear_seat
[LifeSimulator] Choice join: 跟他们一起出去
[LifeSimulator] Choice stay: 摇摇头，继续坐在座位上
[LifeSimulator] Choice hesitate_join: 有点犹豫，但还是跟了过去
[LifeSimulator] social: 50 -> 51
[LifeSimulator] happiness: 70 -> 71
[LifeSimulator] confidence: 52 -> 53
[LifeSimulator] Added Tag: joined_classmates_first_break
[LifeSimulator] completedEvents: primary_first_day, primary_first_break
[LifeSimulator] tags: first_day_rear_seat, joined_classmates_first_break
[LifeSimulator] 6岁 · 第一次上小学：我第一次走进了小学教室。
[LifeSimulator] 6岁 · 第一次下课：小学的第一次下课，我开始认识身边的新同学。
[LifeSimulator] SAVE/LOAD PASS：完整 GameState 一致
[LifeSimulator] CHECKS PASS：224 项断言，含全部 12 条选择路径
[LifeSimulator] ALL CHECKS PASSED
```

两个事件的标题、完整剧情也在此次 Console 输出中显示。以上为便于阅读省略剧情后的关键结果摘录。查询该预览页 warning/error 日志返回空数组；截图显示原 FairyGUI MainView“人生模拟器”标题。

19:28:43，单独打开原场景 `ee5422c5-7762-47ab-bd38-aaea98abfc07`（`assets/LoadingScene/LoadingScene.scene`）：

```text
Cocos Creator v3.8.8
FairyGUI Main 包加载成功
MainView 创建成功
```

截图再次确认灰色背景及“人生模拟器”标题；该场景没有挂载 Debug Runner，能够独立运行。

## 验收对应关系

| 要求 | 证据 |
| --- | --- |
| 纯 TS 数据模型、完整字段/枚举、6 岁 Childhood、双模式 | 源码核对；224 项断言中的模式/性别/初始数据检查 |
| 两事件使用 JSON、JsonAsset 加载、ID 索引、七个选择 | 真正 resources.load 输出两个事件；Console 显示全部选择；JSON 静态核对 |
| rear_seat 与 join 的指定效果 | 上述实际前后数值和 Added Tag 输出 |
| 条件运算、年龄/模式/阶段/Tag/前置事件 | 224 项断言覆盖六运算符真/假、AND、年龄边界及各项过滤 |
| once 防重、自动连锁、completedEvents 去重 | 12 条完整选择路径、一次性事件不能重放、可重复事件 ID 去重、待办连锁恢复检查 |
| 所有属性 clamp、money 不限制 0～100、Tag 去重和安全删除 | 所有显性/隐藏键上下界测试、money 正负增量、重复/不存在 Tag 测试 |
| 叙事 LifeLog | 上述两条指定叙事输出；12 条路径中的日志内容断言 |
| GameState 真实保存并恢复一致 | 使用指定 Key 的 sys.localStorage；新建 GameManager 读取后完整 JSON 相等 |
| 损坏存档/存储失败不崩溃 | 内存故障夹具验证损坏 JSON、越界数据及读取/写入/删除失败；浏览器无未处理异常 |
| 核心、资源、流程与 UI 解耦 | core 不导入 cc，EventSystem 使用 EventSource，GameManager 不导入 FGUI；正式场景独立成功 |
| FairyGUI 接入及发布文件保持正常 | 调试及原场景截图和成功日志；Main.bin/UIBootstrap/原场景哈希未变 |
| 无新增依赖、没有超出第一版范围 | package.json/package-lock.json 哈希未变；正式 JSON 仅两个事件；文件职责自检 |
| Cocos 脚本导入/运行无编译错误 | 当前工作区新增脚本均被 Cocos 转译导入，预览成功，无脚本异常 |
| 项目 TypeScript 类型检查 | 编辑器自带 TS 5.8.2 只读 API，18 个入口，诊断结果为空；详见类型诊断 JSON |

## 检查范围与环境说明

- 没有在终端执行 TypeScript 编译器或产生 tsc 输出。采用标准 CommonJS 加载已安装编辑器自带的 TypeScript 5.8.2，并通过只读 API 检查项目配置下的全部源文件入口：**18 个入口，0 项诊断**。`noEmit: true`，未调用 program.emit；`skipLibCheck: true` 跳过第三方声明实现检查。[完整入口及诊断结果](life-simulator-v1-type-diagnostics.json)。
- 编辑器自身的启动性能统计出现三条 `trackTimeEnd failed` 提示；游戏预览没有 warning/error，不影响脚本导入、资源加载和上述验收。
- 首次受限启动因缓存访问及 GPU 子进程问题失败；沙箱外启动已安装编辑器后解决，没有关闭安全保护或修改 GPU/系统设置。
- 这些结论针对 Creator 3.8.8 浏览器预览。本次未要求、也未验证发布构建、真机或下一阶段系统。

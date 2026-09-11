import { _decorator, Component, sys } from 'cc';
import { LifeEvent } from '../core/event/LifeEvent';
import { HIDDEN_KEYS, OriginMode, Gender, PlayerData, VISIBLE_KEYS } from '../core/model/PlayerData';
import { GameManager } from '../manager/GameManager';
import { SaveManager } from '../manager/SaveManager';
import { EventRepository } from '../repository/EventRepository';
import { check, runSimulationChecks } from './SimulationChecks';

const { ccclass, property } = _decorator;
const PREFIX = '[LifeSimulator]';

/** 仅供调试：可删除本组件和调试场景，核心与 FairyGUI 均不依赖它。 */
@ccclass('SimulationDebugRunner')
export class SimulationDebugRunner extends Component {
    @property({ tooltip: '启动时自动运行两个人生事件及边界自检' })
    runOnStart = true;

    private running = false;

    start(): void {
        if (this.runOnStart) void this.run();
    }

    async run(): Promise<boolean> {
        if (this.running) return false;
        this.running = true;
        let originalSave: string | null = null;
        let storageRead = false;
        let passed = false;
        try {
            originalSave = sys.localStorage.getItem(SaveManager.KEY);
            storageRead = true;
            const repository = new EventRepository();
            await repository.initialize();
            console.log(`${PREFIX} 已加载 ${repository.getAllEvents().length} 个人生事件`);
            const game = new GameManager(repository, new SaveManager());
            const initial = game.newGame(OriginMode.Reality, Gender.Male, '小禾');
            console.log(`${PREFIX} 创建 Reality 玩家：age=${initial.age}, stage=${initial.stage}`);
            console.log(`${PREFIX} visible: ${JSON.stringify(initial.visible)}`);
            console.log(`${PREFIX} hidden: ${JSON.stringify(initial.hidden)}`);
            console.log(`${PREFIX} tags: ${JSON.stringify(initial.tags)}`);

            const first = game.startEvent('primary_first_day');
            check(first, '开始第一次上小学');
            this.printEvent(first);
            check(game.choose('rear_seat'), '选择后排');
            const afterSeat = game.getPlayer()!;
            check(afterSeat.hidden.independence === initial.hidden.independence + 1
                && afterSeat.hidden.curiosity === initial.hidden.curiosity + 1, '后排属性增量');
            check(afterSeat.tags.includes('first_day_rear_seat')
                && afterSeat.completedEvents.includes(first.id), '后排 Tag 和完成记录');
            this.printChanges(initial, afterSeat);
            check(!game.getAvailableEvents().some(event => event.id === first.id), '一次性事件不再可触发');
            const second = game.getCurrentEvent();
            check(second?.id === 'primary_first_break', '自动进入第一次下课');
            this.printEvent(second);
            check(game.choose('join'), '选择一起出去');
            const final = game.getPlayer()!;
            check(final.hidden.confidence === afterSeat.hidden.confidence + 1
                && final.visible.social === afterSeat.visible.social + 1
                && final.visible.happiness === afterSeat.visible.happiness + 1, '一起出去属性增量');
            check(final.tags.includes('joined_classmates_first_break'), '下课 Tag');
            this.printChanges(afterSeat, final);
            console.log(`${PREFIX} completedEvents: ${final.completedEvents.join(', ')}`);
            console.log(`${PREFIX} tags: ${final.tags.join(', ')}`);
            for (const log of final.logs) console.log(`${PREFIX} ${log.age}岁 · ${log.title}：${log.description}`);

            const snapshot = JSON.stringify(game.getState());
            check(game.saveGame(), 'sys.localStorage 保存');
            const restored = new GameManager(repository, new SaveManager());
            check(restored.loadGame() && JSON.stringify(restored.getState()) === snapshot,
                '完整 GameState 保存读取一致（包括属性、家庭、关系、Tag、完成事件、日志及事件指针）');
            console.log(`${PREFIX} SAVE/LOAD PASS：完整 GameState 一致`);
            const count = runSimulationChecks(repository);
            console.log(`${PREFIX} CHECKS PASS：${count} 项断言，含全部 12 条选择路径`);
            passed = true;
        } catch (error) {
            console.error(`${PREFIX} FAIL：${error instanceof Error ? error.message : String(error)}`);
        } finally {
            // 已有存档逐字恢复；没有旧存档时保留本次演示存档供人工检查。
            if (storageRead && originalSave !== null) {
                try {
                    sys.localStorage.setItem(SaveManager.KEY, originalSave);
                    console.log(`${PREFIX} 已恢复运行前存档`);
                } catch (error) {
                    passed = false;
                    console.error(`${PREFIX} 原存档恢复失败：${String(error)}`);
                }
            }
            this.running = false;
        }
        if (passed) console.log(`${PREFIX} ALL CHECKS PASSED`);
        return passed;
    }

    private printEvent(event: LifeEvent): void {
        console.log(`${PREFIX} ${event.title}\n${event.content}`);
        for (const choice of event.choices) console.log(`${PREFIX} Choice ${choice.id}: ${choice.text}`);
    }

    private printChanges(before: PlayerData, after: PlayerData): void {
        for (const key of VISIBLE_KEYS) {
            if (before.visible[key] !== after.visible[key]) {
                console.log(`${PREFIX} ${key}: ${before.visible[key]} -> ${after.visible[key]}`);
            }
        }
        for (const key of HIDDEN_KEYS) {
            if (before.hidden[key] !== after.hidden[key]) {
                console.log(`${PREFIX} ${key}: ${before.hidden[key]} -> ${after.hidden[key]}`);
            }
        }
        for (const tag of after.tags) if (!before.tags.includes(tag)) console.log(`${PREFIX} Added Tag: ${tag}`);
    }
}

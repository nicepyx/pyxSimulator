import { ConditionOperator, EventSource, LifeEvent } from '../core/event/LifeEvent';
import { PlayerFactory } from '../core/factory/PlayerFactory';
import { isGameState } from '../core/model/DataValidation';
import { cloneGameState, GameState } from '../core/model/GameState';
import { Gender, HIDDEN_KEYS, LifeStage, OriginMode, VISIBLE_KEYS } from '../core/model/PlayerData';
import { EffectSystem } from '../core/system/EffectSystem';
import { EventSystem } from '../core/system/EventSystem';
import { GameManager } from '../manager/GameManager';
import { SaveManager, SaveStorage } from '../manager/SaveManager';
import { parseEvents } from '../repository/EventValidation';

export function check(value: unknown, message: string): asserts value {
    if (!value) throw new Error(`验收失败：${message}`);
}

export class MemorySaveStorage implements SaveStorage {
    text: string | null = null;
    getItem(_key: string): string | null { return this.text; }
    setItem(_key: string, value: string): void { this.text = value; }
    removeItem(_key: string): void { this.text = null; }
}

/** 额外事件只作为局部测试副本，不进入正式 JSON 或 Repository。 */
export function runSimulationChecks(repository: EventSource): number {
    let count = 0;
    const expect = (value: unknown, label: string): void => { check(value, label); count++; };
    const fresh = (): GameState => ({
        player: PlayerFactory.createPlayer(OriginMode.Reality, Gender.Male),
        currentEventId: null, nextEventId: null,
    });
    const first = repository.getEventById('primary_first_day');
    const second = repository.getEventById('primary_first_break');
    check(first && second, '两个正式事件均已加载');
    expect(repository.getAllEvents().length === 2, '第一版只有两个事件');
    expect(first.choices.length === 4 && second.choices.length === 3, '选择数量');
    for (const mode of [OriginMode.Reality, OriginMode.Fantasy]) {
        for (const gender of [Gender.Male, Gender.Female]) {
            const p = PlayerFactory.createPlayer(mode, gender);
            expect(p.age === 6 && p.stage === LifeStage.Childhood && p.originMode === mode
                && p.gender === gender && isGameState({ player: p, currentEventId: null, nextEventId: null }), '开局模式及数据范围');
        }
    }

    // 所有 4 × 3 分支均应结束、生成两条日志并且不能重放一次性事件。
    for (const a of first.choices) for (const b of second.choices) {
        const state = fresh();
        const system = new EventSystem(repository, state);
        expect(!system.startEvent(second.id), '下课不能越过上学前置');
        expect(!!system.startEvent(first.id), '开始第一事件');
        const before = JSON.stringify(state);
        expect(!system.startEvent(first.id) && !system.choose('unknown_choice')
            && JSON.stringify(state) === before, '无效调用不改变状态');
        expect(!!system.choose(a.id) && state.currentEventId === second.id, '所有座位选择自动连锁');
        expect(!system.canTriggerEvent(first), '上学 once 防重');
        expect(!!system.choose(b.id) && state.currentEventId === null && state.nextEventId === null, '所有下课选择正常结束');
        expect(!system.startEvent(first.id) && !system.startEvent(second.id) && !system.choose(b.id), '结束后不能再次执行');
        expect(state.player.completedEvents.join(',') === `${first.id},${second.id}` && state.player.logs.length === 2, '完成记录不重复');
        expect(state.player.logs[0].description === '我第一次走进了小学教室。'
            && state.player.logs[1].description === '小学的第一次下课，我开始认识身边的新同学。', '叙事日志');
        expect(isGameState(state), '完整流程后数据有效');
    }

    for (const id of ['wait_teacher', 'stay']) {
        const state = fresh();
        const choice = [...first.choices, ...second.choices].find(c => c.id === id)!;
        const before = JSON.stringify([state.player.visible, state.player.hidden]);
        EffectSystem.apply(state.player, choice.effects);
        expect(JSON.stringify([state.player.visible, state.player.hidden]) === before, '内向选择没有数值惩罚');
    }

    const state = fresh();
    const system = new EventSystem(repository, state);
    const p = state.player;
    const conditionEvent = (): LifeEvent => ({ ...first, once: false, minAge: undefined, maxAge: undefined, stages: undefined });
    expect(!system.canTriggerEvent({ ...conditionEvent(), minAge: 7 }), '最小年龄');
    expect(!system.canTriggerEvent({ ...conditionEvent(), maxAge: 5 }), '最大年龄');
    expect(system.canTriggerEvent({ ...conditionEvent(), minAge: 6, maxAge: 6 }), '年龄边界包含');
    expect(!system.canTriggerEvent({ ...conditionEvent(), stages: [LifeStage.Adult] }), '年龄阶段');
    expect(!system.canTriggerEvent({ ...conditionEvent(), originModes: [OriginMode.Fantasy] }), '模式过滤');
    p.tags = ['known_tag'];
    p.completedEvents = [second.id];
    for (const event of [
        { ...conditionEvent(), requiredTags: ['missing_tag'] },
        { ...conditionEvent(), excludedTags: ['known_tag'] },
        { ...conditionEvent(), requiredCompletedEvents: [first.id] },
        { ...conditionEvent(), excludedCompletedEvents: [second.id] },
    ]) expect(!system.canTriggerEvent(event), 'Tag/事件前置与排除');
    expect(system.canTriggerEvent({ ...conditionEvent(), requiredTags: ['known_tag'],
        excludedTags: ['missing_tag'], requiredCompletedEvents: [second.id], excludedCompletedEvents: [first.id] }), '所有前置共同通过');
    const cases: Array<[ConditionOperator, number, boolean]> = [
        ['>', 50, false], ['>', 49, true], ['>=', 50, true], ['>=', 51, false],
        ['<', 50, false], ['<', 51, true], ['<=', 50, true], ['<=', 49, false],
        ['==', 50, true], ['==', 49, false], ['!=', 50, false], ['!=', 49, true],
    ];
    p.visible.social = 50;
    p.hidden.confidence = 50;
    for (const [operator, value, expected] of cases) {
        expect(system.canTriggerEvent({ ...conditionEvent(), visibleConditions: [{ key: 'social', operator, value }] }) === expected, `显性条件 ${operator}`);
        expect(system.canTriggerEvent({ ...conditionEvent(), hiddenConditions: [{ key: 'confidence', operator, value }] }) === expected, `隐藏条件 ${operator}`);
    }
    expect(!system.canTriggerEvent({ ...conditionEvent(), visibleConditions: [
        { key: 'social', operator: '>=', value: 50 }, { key: 'social', operator: '<', value: 50 },
    ] }), '多个条件采用 AND');

    for (const key of VISIBLE_KEYS) {
        EffectSystem.apply(p, { visible: { [key]: 1000 } });
        expect(key === 'money' ? p.visible[key] === 1000 : p.visible[key] === 100, '显性上界/现金不限');
        EffectSystem.apply(p, { visible: { [key]: -2000 } });
        expect(key === 'money' ? p.visible[key] === -1000 : p.visible[key] === 0, '显性下界/现金可负');
    }
    for (const key of HIDDEN_KEYS) {
        EffectSystem.apply(p, { hidden: { [key]: 1000 } });
        expect(p.hidden[key] === 100, '隐藏上界');
        EffectSystem.apply(p, { hidden: { [key]: -2000 } });
        expect(p.hidden[key] === 0, '隐藏下界');
    }
    EffectSystem.apply(p, { addTags: ['known_tag', 'new_tag', 'new_tag'], removeTags: ['missing_tag'] });
    expect(p.tags.join(',') === 'known_tag,new_tag', 'Tag 去重与安全删除');
    EffectSystem.apply(p, { addTags: ['new_tag'], removeTags: ['new_tag'] });
    expect(p.tags.join(',') === 'known_tag', '删除优先');
    const beforeInvalid = JSON.stringify(p);
    let rejected = false;
    try { EffectSystem.apply(p, { visible: { social: 2 }, hidden: { confidence: NaN } }); } catch { rejected = true; }
    expect(rejected && beforeInvalid === JSON.stringify(p), '非法数字原子拒绝');

    const memory = new MemorySaveStorage();
    const saves = new SaveManager(memory);
    expect(!saves.hasSave() && saves.load() === null, '无存档');
    const game = new GameManager(repository, saves);
    game.newGame();
    game.startEvent(first.id);
    expect(game.saveGame(), '选择前保存');
    const resumed = new GameManager(repository, saves);
    expect(resumed.loadGame() && resumed.getCurrentEvent()?.id === first.id, '恢复当前待选事件');
    const detached = resumed.getPlayer()!;
    detached.visible.health = 900;
    expect(resumed.getPlayer()!.visible.health <= 100, '外部快照隔离');
    resumed.choose('rear_seat');
    expect(resumed.saveGame() && game.loadGame() && game.getCurrentEvent()?.id === second.id, '连锁中途存档');
    const beforeBadLoad = JSON.stringify(game.getState());
    for (const text of ['{', 'null', '{}', JSON.stringify({ ...fresh(), player: { age: 6 } })]) {
        memory.text = text;
        expect(!saves.hasSave() && !game.loadGame() && JSON.stringify(game.getState()) === beforeBadLoad, '损坏存档安全返回');
    }
    const unknownEvent = fresh();
    unknownEvent.currentEventId = 'missing_event';
    saves.save(unknownEvent);
    expect(!game.loadGame() && JSON.stringify(game.getState()) === beforeBadLoad, '缺失事件存档不替换当前状态');
    const invalid = cloneGameState(fresh());
    invalid.player.visible.health = 101;
    expect(!saves.save(invalid), '拒绝越界存档');
    const broken = new SaveManager({
        getItem: () => { throw new Error('测试读取失败'); },
        setItem: () => { throw new Error('测试配额已满'); },
        removeItem: () => { throw new Error('测试删除失败'); },
    });
    expect(broken.load() === null && !broken.hasSave() && !broken.save(fresh()) && !broken.clear(), '存储异常全部安全返回');
    expect(saves.clear() && !saves.hasSave(), '清除存档');

    // 可重复事件的 completedEvents 仍然去重，经历日志按发生次数保留。
    const repeat = conditionEvent();
    repeat.choices = [{ id: 'again', text: '再次体验' }];
    const repeatState = fresh();
    const repeatSystem = new EventSystem({ getEventById: () => repeat, getAllEvents: () => [repeat] }, repeatState);
    for (let i = 0; i < 2; i++) { repeatSystem.startEvent(repeat.id); repeatSystem.choose('again'); }
    expect(repeatState.player.completedEvents.length === 1 && repeatState.player.logs.length === 2, '重复事件记录语义');

    const gated = { ...second, requiredTags: ['future_tag'] };
    const gatedSource: EventSource = {
        getEventById: id => id === first.id ? first : id === second.id ? gated : null,
        getAllEvents: () => [first, gated],
    };
    const pending = fresh();
    const pendingSystem = new EventSystem(gatedSource, pending);
    pendingSystem.startEvent(first.id);
    pendingSystem.choose('rear_seat');
    expect(pending.currentEventId === null && pending.nextEventId === second.id, '条件未满足的连锁保留 nextEventId');
    expect(!pendingSystem.startEvent(first.id), '待办连锁不能被其他事件覆盖');
    const pendingSaves = new SaveManager(new MemorySaveStorage());
    const pendingGame = new GameManager(gatedSource, pendingSaves);
    expect(pendingSaves.save(pending) && pendingGame.loadGame()
        && pendingGame.getState()!.nextEventId === second.id, '待办连锁也能存读');
    EffectSystem.apply(pending.player, { addTags: ['future_tag'] });
    expect(!!pendingSystem.startEvent(second.id) && pending.nextEventId === null, '条件满足后启动待办连锁');

    for (const kind of ['attribute', 'tags', 'completedEvents', 'family', 'relationship', 'log']) {
        const bad = fresh();
        if (kind === 'attribute') bad.player.hidden.confidence = -1;
        if (kind === 'tags') bad.player.tags = ['duplicate', 'duplicate'];
        if (kind === 'completedEvents') bad.player.completedEvents = [first.id, first.id];
        if (kind === 'family') bad.player.family.harmony = 101;
        if (kind === 'relationship') bad.player.relationships.push({
            id: 'classmate', name: '同学', relationType: 'classmate', intimacy: 101, trust: 50, conflict: 0, tags: [],
        });
        if (kind === 'log') bad.player.logs.push({ age: 6, eventId: first.id, title: '未发生', description: '错误记录' });
        memory.text = JSON.stringify(bad);
        expect(saves.load() === null, '合法 JSON 中的非法玩家数据被拒绝');
    }
    for (const input of [null, [first, first], [{ ...first, choices: [{ id: 'bad', text: '错误', nextEventId: 'missing_event' }] }],
        [{ ...first, choices: [{ id: 'bad', text: '错误', effects: { hidden: { confidnce: 1 } } }] }]]) {
        let failed = false;
        try { parseEvents(input); } catch { failed = true; }
        expect(failed, '错误配置在加载边界拒绝');
    }
    return count;
}

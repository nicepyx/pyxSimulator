import { EventType, LifeEvent } from '../core/event/LifeEvent';
import { isId, isIdList, isNumber, isRecord } from '../core/model/DataValidation';
import { HIDDEN_KEYS, LifeStage, OriginMode, VISIBLE_KEYS } from '../core/model/PlayerData';

function conditions(value: unknown, keys: readonly string[]): boolean {
    return Array.isArray(value) && value.every(c => isRecord(c)
        && typeof c.key === 'string' && keys.includes(c.key)
        && ['>', '>=', '<', '<=', '==', '!='].includes(String(c.operator)) && isNumber(c.value));
}

function deltas(value: unknown, keys: readonly string[]): boolean {
    return isRecord(value) && Object.keys(value).every(key => keys.includes(key) && isNumber(value[key]));
}

function effects(value: unknown): boolean {
    return isRecord(value)
        && Object.keys(value).every(key => ['visible', 'hidden', 'addTags', 'removeTags'].includes(key))
        && (value.visible === undefined || deltas(value.visible, VISIBLE_KEYS))
        && (value.hidden === undefined || deltas(value.hidden, HIDDEN_KEYS))
        && (value.addTags === undefined || Array.isArray(value.addTags) && value.addTags.every(isId))
        && (value.removeTags === undefined || Array.isArray(value.removeTags) && value.removeTags.every(isId));
}

function event(value: unknown): value is LifeEvent {
    if (!isRecord(value) || !isId(value.id) || typeof value.title !== 'string' || !value.title.trim()
        || typeof value.content !== 'string' || !Object.values(EventType).includes(value.type as EventType)
        || typeof value.once !== 'boolean') return false;
    if (value.logDescription !== undefined && typeof value.logDescription !== 'string') return false;
    for (const key of ['minAge', 'maxAge']) {
        const limit = value[key];
        if (limit !== undefined && (!isNumber(limit) || !Number.isInteger(limit) || limit < 0)) return false;
    }
    if (isNumber(value.minAge) && isNumber(value.maxAge) && value.minAge > value.maxAge) return false;
    if (value.stages !== undefined && (!Array.isArray(value.stages)
        || !value.stages.every(s => Object.values(LifeStage).includes(s)))) return false;
    if (value.originModes !== undefined && (!Array.isArray(value.originModes)
        || !value.originModes.every(m => Object.values(OriginMode).includes(m)))) return false;
    for (const key of ['requiredTags', 'excludedTags', 'requiredCompletedEvents', 'excludedCompletedEvents']) {
        if (value[key] !== undefined && !isIdList(value[key])) return false;
    }
    if (value.visibleConditions !== undefined && !conditions(value.visibleConditions, VISIBLE_KEYS)) return false;
    if (value.hiddenConditions !== undefined && !conditions(value.hiddenConditions, HIDDEN_KEYS)) return false;
    if (!Array.isArray(value.choices) || value.choices.length === 0) return false;
    const ids = new Set<string>();
    return value.choices.every(c => {
        if (!isRecord(c) || !isId(c.id) || ids.has(c.id) || typeof c.text !== 'string' || !c.text.trim()
            || c.resultText !== undefined && typeof c.resultText !== 'string'
            || c.nextEventId !== undefined && !isId(c.nextEventId)
            || c.effects !== undefined && !effects(c.effects)) return false;
        ids.add(c.id);
        return true;
    });
}

/** 原子校验整个文件，防止重复 ID 被覆盖或剧情跳向缺失配置。 */
export function parseEvents(value: unknown): LifeEvent[] {
    if (!Array.isArray(value)) throw new Error('事件 JSON 顶层必须是数组');
    const events: LifeEvent[] = [];
    const ids = new Set<string>();
    for (const item of value) {
        if (!event(item)) throw new Error(`事件配置格式错误，位置 ${events.length}`);
        if (ids.has(item.id)) throw new Error(`事件 ID 重复：${item.id}`);
        ids.add(item.id);
        events.push(item);
    }
    for (const item of events) {
        const references = [...(item.requiredCompletedEvents ?? []), ...(item.excludedCompletedEvents ?? []),
            ...item.choices.map(c => c.nextEventId).filter((id): id is string => id !== undefined)];
        for (const id of references) {
            if (!ids.has(id)) throw new Error(`事件 ${item.id} 引用了不存在的事件 ${id}`);
        }
    }
    return events;
}

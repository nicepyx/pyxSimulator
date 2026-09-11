import { GameState } from './GameState';
import { Gender, HIDDEN_KEYS, LifeStage, OriginMode, VISIBLE_KEYS } from './PlayerData';

// 只用于 JSON 输入边界，不建立运行时通用 schema 框架。
export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

export function isId(value: unknown): value is string {
    return typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value);
}

export function isIdList(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(isId) && new Set(value).size === value.length;
}

function bounded(value: unknown): boolean {
    return isNumber(value) && value >= 0 && value <= 100;
}

function age(value: unknown): boolean {
    return isNumber(value) && Number.isInteger(value) && value >= 0;
}

export function isGameState(value: unknown): value is GameState {
    if (!isRecord(value) || !isRecord(value.player)) return false;
    if (!(value.currentEventId === null || isId(value.currentEventId))
        || !(value.nextEventId === null || isId(value.nextEventId))) return false;
    if (value.currentEventId !== null && value.nextEventId !== null) return false;
    const p = value.player;
    if (typeof p.name !== 'string' || !p.name.trim()
        || !Object.values(Gender).includes(p.gender as Gender)
        || !Object.values(OriginMode).includes(p.originMode as OriginMode)
        || !Object.values(LifeStage).includes(p.stage as LifeStage) || !age(p.age)) return false;
    const v = p.visible;
    const h = p.hidden;
    const f = p.family;
    if (!isRecord(v) || !VISIBLE_KEYS.every(key => key === 'money' ? isNumber(v[key]) : bounded(v[key]))) return false;
    if (!isRecord(h) || !HIDDEN_KEYS.every(key => bounded(h[key]))) return false;
    if (!isRecord(f)
        || !['wealth', 'harmony', 'educationSupport', 'emotionalSupport', 'expectation'].every(key => bounded(f[key]))
        || !['fatherOccupation', 'motherOccupation', 'fatherEducation', 'motherEducation', 'locationType']
            .every(key => typeof f[key] === 'string')) return false;
    if (!isIdList(p.tags) || !isIdList(p.completedEvents) || !Array.isArray(p.relationships) || !Array.isArray(p.logs)) return false;
    if (!p.relationships.every(r => isRecord(r) && isId(r.id) && typeof r.name === 'string'
        && typeof r.relationType === 'string' && bounded(r.intimacy) && bounded(r.trust)
        && bounded(r.conflict) && isIdList(r.tags))) return false;
    const completed = p.completedEvents;
    return p.logs.every(log => isRecord(log) && age(log.age) && Number(log.age) <= Number(p.age)
        && isId(log.eventId) && completed.includes(log.eventId)
        && typeof log.title === 'string' && typeof log.description === 'string');
}

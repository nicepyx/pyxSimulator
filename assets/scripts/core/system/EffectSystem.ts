import { EventEffect } from '../event/LifeEvent';
import { HIDDEN_KEYS, PlayerData, VISIBLE_KEYS } from '../model/PlayerData';

export class EffectSystem {
    static apply(player: PlayerData, effects: EventEffect = {}): void {
        const visible = { ...player.visible };
        const hidden = { ...player.hidden };
        // 先计算再提交；非法数字不会留下只执行了一半的选择。
        for (const key of VISIBLE_KEYS) {
            visible[key] = this.change(visible[key], effects.visible?.[key] ?? 0, key !== 'money');
        }
        for (const key of HIDDEN_KEYS) {
            hidden[key] = this.change(hidden[key], effects.hidden?.[key] ?? 0, true);
        }
        // 同时添加、删除同一 Tag 时，删除优先。
        const removed = new Set(effects.removeTags ?? []);
        const tags = [...new Set([...player.tags, ...(effects.addTags ?? [])])]
            .filter(tag => !removed.has(tag));
        player.visible = visible;
        player.hidden = hidden;
        player.tags = tags;
    }

    private static change(value: number, delta: number, bounded: boolean): number {
        if (!Number.isFinite(value) || !Number.isFinite(delta)) {
            throw new Error('属性及增量必须是有限数字');
        }
        const result = value + delta;
        if (bounded) return Math.max(0, Math.min(100, result));
        if (!Number.isFinite(result)) throw new Error('money 超出可保存的数值范围');
        return result;
    }
}

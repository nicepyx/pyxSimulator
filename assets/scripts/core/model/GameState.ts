import { PlayerData } from './PlayerData';

export interface GameState {
    player: PlayerData;
    currentEventId: string | null;
    nextEventId: string | null;
}

/** 全部数据都是 JSON 值；对外返回快照，避免 UI 意外修改运行状态。 */
export function cloneGameState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state)) as GameState;
}

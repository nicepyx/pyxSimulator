import { sys } from 'cc';
import { isGameState } from '../core/model/DataValidation';
import { GameState } from '../core/model/GameState';

export interface SaveStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export class SaveManager {
    static readonly KEY = 'pyxSimulator_save_v1';

    // 可传入内存存储验证故障；正常游戏始终使用 Cocos sys.localStorage。
    constructor(private readonly storage: SaveStorage = sys.localStorage) {}

    save(state: GameState): boolean {
        try {
            if (!isGameState(state)) return false;
            this.storage.setItem(SaveManager.KEY, JSON.stringify(state));
            return true;
        } catch {
            return false;
        }
    }

    load(): GameState | null {
        try {
            const text = this.storage.getItem(SaveManager.KEY);
            if (text === null) return null;
            const data: unknown = JSON.parse(text);
            return isGameState(data) ? data : null;
        } catch {
            return null;
        }
    }

    /** 只有可读取、结构有效的存档才算存在。 */
    hasSave(): boolean {
        return this.load() !== null;
    }

    clear(): boolean {
        try {
            this.storage.removeItem(SaveManager.KEY);
            return true;
        } catch {
            return false;
        }
    }
}

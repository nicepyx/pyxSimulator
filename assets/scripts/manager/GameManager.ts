import { EventSource, LifeEvent } from '../core/event/LifeEvent';
import { PlayerFactory } from '../core/factory/PlayerFactory';
import { cloneGameState, GameState } from '../core/model/GameState';
import { Gender, OriginMode, PlayerData } from '../core/model/PlayerData';
import { ChoiceResult, EventSystem } from '../core/system/EventSystem';
import type { SaveManager } from './SaveManager';

export class GameManager {
    private state: GameState | null = null;
    private events: EventSystem | null = null;

    constructor(private readonly repository: EventSource, private readonly saves: SaveManager) {}

    newGame(originMode = OriginMode.Reality, gender = Gender.Male, name?: string): PlayerData {
        this.setState({
            player: PlayerFactory.createPlayer(originMode, gender, name),
            currentEventId: null, nextEventId: null,
        });
        return this.getPlayer()!;
    }

    getPlayer(): PlayerData | null {
        return this.getState()?.player ?? null;
    }

    getState(): GameState | null {
        return this.state ? cloneGameState(this.state) : null;
    }

    getCurrentEvent(): LifeEvent | null {
        return this.state?.currentEventId ? this.repository.getEventById(this.state.currentEventId) : null;
    }

    getAvailableEvents(): LifeEvent[] {
        return this.events?.getAvailableEvents() ?? [];
    }

    startEvent(eventId: string): LifeEvent | null {
        return this.events?.startEvent(eventId) ?? null;
    }

    choose(choiceId: string): ChoiceResult | null {
        return this.events?.choose(choiceId) ?? null;
    }

    saveGame(): boolean {
        return this.state !== null && this.saves.save(this.state);
    }

    loadGame(): boolean {
        const loaded = this.saves.load();
        if (!loaded) return false;
        const events = new EventSystem(this.repository, loaded);
        // 配置可能在存档之后变动；失败时保留当前游戏。
        for (const id of [loaded.currentEventId, loaded.nextEventId]) {
            if (id === null) continue;
            const event = this.repository.getEventById(id);
            if (!event || event.once && loaded.player.completedEvents.includes(id)) return false;
            if (id === loaded.currentEventId && !events.canTriggerEvent(event)) return false;
        }
        this.setState(loaded);
        return true;
    }

    private setState(state: GameState): void {
        this.state = state;
        this.events = new EventSystem(this.repository, state);
    }
}

import { AttributeCondition, EventSource, LifeChoice, LifeEvent } from '../event/LifeEvent';
import { cloneGameState, GameState } from '../model/GameState';
import { PlayerData } from '../model/PlayerData';
import { EffectSystem } from './EffectSystem';

export interface ChoiceResult {
    eventId: string;
    choiceId: string;
    resultText: string;
    currentEvent: LifeEvent | null;
    nextEventId: string | null;
}

export class EventSystem {
    constructor(private readonly source: EventSource, private readonly state: GameState) {}

    getEventById(id: string): LifeEvent | null {
        return this.source.getEventById(id);
    }

    canTriggerEvent(event: LifeEvent, player: PlayerData = this.state.player): boolean {
        if (event.once && player.completedEvents.includes(event.id)) return false;
        if (event.minAge !== undefined && player.age < event.minAge) return false;
        if (event.maxAge !== undefined && player.age > event.maxAge) return false;
        if (event.stages && !event.stages.includes(player.stage)) return false;
        if (event.originModes && !event.originModes.includes(player.originMode)) return false;
        return (event.requiredTags ?? []).every(tag => player.tags.includes(tag))
            && !(event.excludedTags ?? []).some(tag => player.tags.includes(tag))
            && (event.requiredCompletedEvents ?? []).every(id => player.completedEvents.includes(id))
            && !(event.excludedCompletedEvents ?? []).some(id => player.completedEvents.includes(id))
            && (event.visibleConditions ?? []).every(c => this.matches(player.visible[c.key], c))
            && (event.hiddenConditions ?? []).every(c => this.matches(player.hidden[c.key], c));
    }

    getAvailableEvents(player: PlayerData = this.state.player): LifeEvent[] {
        return this.source.getAllEvents().filter(event => this.canTriggerEvent(event, player));
    }

    startEvent(eventId: string): LifeEvent | null {
        if (this.state.currentEventId !== null) return null;
        if (this.state.nextEventId !== null && this.state.nextEventId !== eventId) return null;
        const event = this.getEventById(eventId);
        if (!event || !this.canTriggerEvent(event)) return null;
        this.state.currentEventId = event.id;
        this.state.nextEventId = null;
        return event;
    }

    /** 无当前事件、未知选项时返回 null，且不修改状态。 */
    choose(choiceId: string): ChoiceResult | null {
        const event = this.state.currentEventId === null ? null : this.getEventById(this.state.currentEventId);
        const choice = event?.choices.find(item => item.id === choiceId);
        if (!event || !choice || !this.canTriggerEvent(event)) return null;
        if (choice.nextEventId && !this.getEventById(choice.nextEventId)) return null;

        const draft = cloneGameState(this.state);
        try {
            EffectSystem.apply(draft.player, choice.effects);
        } catch {
            return null;
        }
        draft.player.completedEvents = [...new Set([...draft.player.completedEvents, event.id])];
        draft.player.logs.push({
            age: draft.player.age, eventId: event.id, title: event.title,
            description: event.logDescription ?? choice.resultText ?? event.title,
        });
        draft.currentEventId = null;
        draft.nextEventId = choice.nextEventId ?? null;
        this.state.player = draft.player;
        this.state.currentEventId = null;
        this.state.nextEventId = draft.nextEventId;

        // 在效果与前置事件记录写入后判断下一事件；不满足条件时保留待办 ID。
        const currentEvent = this.state.nextEventId === null ? null : this.startEvent(this.state.nextEventId);
        return this.result(event, choice, currentEvent);
    }

    private result(event: LifeEvent, choice: LifeChoice, currentEvent: LifeEvent | null): ChoiceResult {
        return {
            eventId: event.id, choiceId: choice.id, resultText: choice.resultText ?? '',
            currentEvent, nextEventId: this.state.nextEventId,
        };
    }

    private matches(value: number, condition: AttributeCondition): boolean {
        if (!Number.isFinite(value) || !Number.isFinite(condition.value)) return false;
        switch (condition.operator) {
            case '>': return value > condition.value;
            case '>=': return value >= condition.value;
            case '<': return value < condition.value;
            case '<=': return value <= condition.value;
            case '==': return value === condition.value;
            case '!=': return value !== condition.value;
            default: return false;
        }
    }
}

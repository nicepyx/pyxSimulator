import { JsonAsset, resources } from 'cc';
import { EventSource, LifeEvent } from '../core/event/LifeEvent';
import { parseEvents } from './EventValidation';

export class EventRepository implements EventSource {
    private events = new Map<string, LifeEvent>();

    async initialize(path = 'data/events/primary_school'): Promise<void> {
        const data: unknown = await new Promise<unknown>((resolve, reject) => {
            resources.load(path, JsonAsset, (error, asset) => {
                if (error) reject(error);
                else if (!asset) reject(new Error(`事件资源为空：${path}`));
                else resolve(asset.json);
            });
        });
        const parsed = parseEvents(data);
        this.events = new Map(parsed.map(event => [event.id, this.copy(event)]));
    }

    getEventById(id: string): LifeEvent | null {
        const event = this.events.get(id);
        return event ? this.copy(event) : null;
    }

    getAllEvents(): LifeEvent[] {
        return [...this.events.values()].map(event => this.copy(event));
    }

    private copy(event: LifeEvent): LifeEvent {
        return JSON.parse(JSON.stringify(event)) as LifeEvent;
    }
}

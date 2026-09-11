import { HiddenAttributes, LifeStage, OriginMode, VisibleAttributes } from '../model/PlayerData';

export enum EventType {
    Main = 'main',
    Random = 'random',
    Conditional = 'conditional',
    Chain = 'chain',
}

export type ConditionOperator = '>' | '>=' | '<' | '<=' | '==' | '!=';

export interface AttributeCondition<K extends string = keyof VisibleAttributes | keyof HiddenAttributes> {
    key: K;
    operator: ConditionOperator;
    value: number;
}

/** 数字表示增量，不是目标值。 */
export interface EventEffect {
    visible?: Partial<Record<keyof VisibleAttributes, number>>;
    hidden?: Partial<Record<keyof HiddenAttributes, number>>;
    addTags?: string[];
    removeTags?: string[];
}

export interface LifeChoice {
    id: string;
    text: string;
    resultText?: string;
    effects?: EventEffect;
    nextEventId?: string;
}

export interface LifeEvent {
    id: string;
    title: string;
    content: string;
    type: EventType;
    once: boolean;
    /** 面向玩家的经历摘要；未配置时采用选择结果或事件标题。 */
    logDescription?: string;
    minAge?: number;
    maxAge?: number;
    stages?: LifeStage[];
    originModes?: OriginMode[];
    requiredTags?: string[];
    excludedTags?: string[];
    requiredCompletedEvents?: string[];
    excludedCompletedEvents?: string[];
    visibleConditions?: AttributeCondition<keyof VisibleAttributes>[];
    hiddenConditions?: AttributeCondition<keyof HiddenAttributes>[];
    choices: LifeChoice[];
}

/** 只读数据契约；EventSystem 不知道 Cocos 或资源路径。 */
export interface EventSource {
    getEventById(id: string): LifeEvent | null;
    getAllEvents(): LifeEvent[];
}

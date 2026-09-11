export enum OriginMode {
    Reality = 'reality',
    Fantasy = 'fantasy',
}

export enum Gender {
    Male = 'male',
    Female = 'female',
}

/** 年龄阶段；教育状态不属于 LifeStage。 */
export enum LifeStage {
    Childhood = 'childhood',
    Adolescence = 'adolescence',
    YoungAdult = 'young_adult',
    Adult = 'adult',
    MiddleAge = 'middle_age',
    Elderly = 'elderly',
}

export interface VisibleAttributes {
    health: number;
    intelligence: number;
    charm: number;
    social: number;
    willpower: number;
    happiness: number;
    money: number;
}

export interface HiddenAttributes {
    confidence: number;
    independence: number;
    discipline: number;
    riskTolerance: number;
    curiosity: number;
    responsibility: number;
    empathy: number;
    resilience: number;
}

export interface FamilyData {
    wealth: number;
    harmony: number;
    educationSupport: number;
    emotionalSupport: number;
    expectation: number;
    fatherOccupation: string;
    motherOccupation: string;
    fatherEducation: string;
    motherEducation: string;
    locationType: string;
}

export interface RelationshipData {
    id: string;
    name: string;
    relationType: string;
    intimacy: number;
    trust: number;
    conflict: number;
    tags: string[];
}

export interface LifeLog {
    age: number;
    eventId: string;
    title: string;
    description: string;
}

export interface PlayerData {
    name: string;
    gender: Gender;
    originMode: OriginMode;
    age: number;
    stage: LifeStage;
    visible: VisibleAttributes;
    hidden: HiddenAttributes;
    family: FamilyData;
    relationships: RelationshipData[];
    tags: string[];
    completedEvents: string[];
    logs: LifeLog[];
}

export const VISIBLE_KEYS: ReadonlyArray<keyof VisibleAttributes> = [
    'health', 'intelligence', 'charm', 'social', 'willpower', 'happiness', 'money',
];
export const HIDDEN_KEYS: ReadonlyArray<keyof HiddenAttributes> = [
    'confidence', 'independence', 'discipline', 'riskTolerance',
    'curiosity', 'responsibility', 'empathy', 'resilience',
];

import { Gender, LifeStage, OriginMode, PlayerData } from '../model/PlayerData';

export class PlayerFactory {
    static createPlayer(originMode: OriginMode, gender: Gender, name = '小禾'): PlayerData {
        // 两种模式先共享基础规则，未来可在此按 originMode 分支。
        const mild = (base: number): number => base + Math.floor(Math.random() * 5) - 2;
        return {
            name: name.trim() || '小禾', gender, originMode,
            age: 6, stage: LifeStage.Childhood,
            visible: {
                health: mild(80), intelligence: mild(50), charm: mild(50),
                social: 50, willpower: 50, happiness: 70, money: 0,
            },
            hidden: {
                confidence: mild(50), independence: 50, discipline: 50,
                riskTolerance: 50, curiosity: mild(50), responsibility: 50,
                empathy: 50, resilience: 50,
            },
            family: {
                wealth: 50, harmony: 60, educationSupport: 60,
                emotionalSupport: 60, expectation: 50,
                fatherOccupation: '普通职员', motherOccupation: '普通职员',
                fatherEducation: '高中', motherEducation: '高中', locationType: '城镇',
            },
            relationships: [], tags: [], completedEvents: [], logs: [],
        };
    }
}

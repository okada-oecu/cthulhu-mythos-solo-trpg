export interface Scenario {
    id: string;
    title: string;
    description: string;
    systemInstruction: string;
    bgm?: {
        url: string;
        title: string;
    };
}

export interface CharacterStats {
    STR: number;
    CON: number;
    SIZ: number;
    DEX: number;
    APP: number;
    INT: number;
    POW: number;
    EDU: number;
}

export interface Skills {
    [key: string]: number;
}

export interface Character {
    name: string;
    occupation: string;
    stats: CharacterStats;
    hp: number;
    maxHp: number;
    sanity: number;
    maxSanity: number;
    mp: number;
    maxMp: number;
    skills: Skills;
    inventory: string[];
    backstory?: string;
    skillPointAllocation?: {[key: string]: {occupation: number, hobby: number}};
}

export interface Enemy {
    name: string;
    hp: number;
    maxHp: number;
}

export enum Role {
    Player = 'Player',
    GM = 'GM',
    NPC = 'NPC',
    System = 'System'
}

export interface LogEntry {
    role: Role;
    content: string;
    isError?: boolean;
}

export enum GameState {
    ScenarioSelection = 'scenario_selection',
    Setup = 'setup',
    Playing = 'playing',
    Loading = 'loading',
    Error = 'error',
    Finished = 'finished',
    Epilogue = 'epilogue',
}

// AI Response Types
export interface GameEvent {
    type: 'skill_check' | 'sanity_check' | 'combat' | 'none' | 'scenario_end' | 'combat_start' | 'combat_end';
    details: {
        skill?: string;
        difficulty?: number;
        loss?: string; // e.g., '1d4' or '0/1d6'
        damage?: string; // e.g., '1d6'
        message?: string; // For scenario_end
        enemies?: { name: string; hp: number; }[]; // For combat_start
    };
}

export interface PlayerUpdate {
    sanity: number;
    hp: number;
    inventory_add?: string[];
    inventory_remove?: string[];
}

export interface AIResponse {
    narrative: string;
    npc_dialogue: string;
    game_event: GameEvent;
    player_update: PlayerUpdate;
    enemy_updates?: { name: string; hp_change: number }[];
}
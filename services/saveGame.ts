import type { Content } from '@google/genai';
import type { Character, Enemy, LogEntry, Scenario } from '../types';
import { GameState } from '../types';

// One auto-save slot in localStorage, plus file export/import so a game
// can be moved to another browser or kept as a backup.
const SAVE_KEY = 'cthulhu_solo_save';
const SAVE_VERSION = 1;

export type SavableState = GameState.Playing | GameState.Epilogue | GameState.Finished;

export interface SaveData {
    version: number;
    savedAt: string;
    scenario: Scenario;
    character: Character;
    gameLog: LogEntry[];
    enemies: Enemy[];
    isInCombat: boolean;
    numberOfCompanions: number;
    gameState: SavableState;
    scenarioResult: string | null;
    // Gemini conversation so far, so the GM remembers the story on resume
    history: Content[];
}

const isSaveData = (data: any): data is SaveData =>
    !!data && typeof data === 'object' &&
    data.version === SAVE_VERSION &&
    !!data.scenario && typeof data.scenario.title === 'string' &&
    !!data.character && typeof data.character.name === 'string' &&
    Array.isArray(data.gameLog) &&
    Array.isArray(data.history) &&
    [GameState.Playing, GameState.Epilogue, GameState.Finished].includes(data.gameState);

export const loadSave = (): SaveData | null => {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return isSaveData(data) ? data : null;
    } catch {
        return null;
    }
};

// Returns false when the browser refuses to store it (e.g. storage full).
export const writeSave = (data: SaveData): boolean => {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Auto-save failed:', error);
        return false;
    }
};

export const clearSave = () => {
    try {
        localStorage.removeItem(SAVE_KEY);
    } catch {
        // nothing to clear
    }
};

export const downloadSave = (data: SaveData) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = data.savedAt.slice(0, 16).replace(/[-:T]/g, '');
    link.href = url;
    link.download = `save_${data.character.name}_${data.scenario.title}_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const pickSaveFile = (): Promise<SaveData> =>
    new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            file.text().then(text => {
                const data = JSON.parse(text);
                if (!isSaveData(data)) {
                    throw new Error('セーブデータの形式ではありません。（キャラクターファイルは「インポート」から読み込んでください）');
                }
                resolve(data);
            }).catch(reject);
        };
        input.click();
    });

export const formatSavedAt = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

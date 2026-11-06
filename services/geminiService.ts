import { GoogleGenAI, Type, type Chat } from '@google/genai';
import type { Character, AIResponse, Scenario } from '../types';

// The game runs entirely in the browser (GitHub Pages), so each player uses
// their own Gemini API key, kept only in this browser's localStorage.
const API_KEY_STORAGE = 'gemini_api_key';

export const getApiKey = (): string => {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
};

export const setApiKey = (key: string) => {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // storage unavailable; key just won't persist
  }
};

export interface GameSession {
  sessionId: string;
  character: Character;
  scenario: Scenario;
  numberOfCompanions: number;
  modelName: string;
  chat?: Chat;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    narrative: {
      type: Type.STRING,
      description: 'ゲームマスターとしての情景描写や、プレイヤーの行動結果を記述します。',
    },
    npc_dialogue: {
      type: Type.STRING,
      description: 'AIが操作するNPCコンパニオンの発言です。複数のNPCがいる場合は、改行で区切り「NPC名: セリフ」の形式で記述してください。発言がない場合は空文字列にしてください。',
    },
    game_event: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ['skill_check', 'sanity_check', 'none', 'scenario_end', 'combat_start', 'combat_end'],
          description: '発生するゲームイベントの種類です。',
        },
        details: {
          type: Type.OBJECT,
          properties: {
            skill: { type: Type.STRING, description: '技能チェックが必要な場合、その技能名（例：「目星」「図書館」）。' },
            difficulty: { type: Type.NUMBER, description: '技能チェックの目標値。プレイヤーの技能値と比較します。' },
            loss: { type: Type.STRING, description: '正気度喪失が発生する場合の減少量（例：「1d4」「0/1d6」）。' },
            damage: { type: Type.STRING, description: '戦闘が発生した場合のダメージ量（例：「1d6」）。' },
            message: { type: Type.STRING, description: 'シナリオまたは戦闘終了時の結末の要約。' },
            enemies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hp: { type: Type.NUMBER },
                },
              },
              description: '戦闘開始時に出現する敵のリスト。',
            },
          },
          nullable: true,
        },
      },
      description: 'ゲーム内で発生する特別なイベントを定義します。',
    },
    player_update: {
      type: Type.OBJECT,
      properties: {
        sanity: { type: Type.NUMBER, description: 'プレイヤーの正気度の変化量。減少は負の値、増加は正の値で示します。' },
        hp: { type: Type.NUMBER, description: 'プレイヤーのHPの変化量。減少は負の値、増加は正の値で示します。' },
        inventory_add: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'プレイヤーが入手したアイテムのリスト。' },
        inventory_remove: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'プレイヤーが失った、または使用したアイテムのリスト。' },
      },
      description: 'プレイヤーキャラクターのステータス変化を定義します。',
    },
    enemy_updates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'HPが変化した敵の名前。' },
          hp_change: { type: Type.NUMBER, description: '敵のHPの変化量。ダメージは負の値で示します。' },
        },
      },
      description: '戦闘中の敵キャラクターのHP変化を定義します。',
    },
  },
  required: ['narrative', 'npc_dialogue', 'game_event', 'player_update'],
};

const buildSystemInstruction = (scenario: any, numberOfCompanions: number) => {
  const companionInstruction = `
あなたはクトゥルフ神話TRPGのゲームマスター（GM）です。
プレイヤーに同行するAI操作のノンプレイヤーキャラクター（NPC）の役割も演じます。
NPCはプレイヤーの頼れる相棒として、探索、謎解き、戦闘においてプレイヤーをサポートします。
物語の開始時に、以下の要件に基づいて${numberOfCompanions}人のNPCコンパニオンを生成し、プレイヤーに紹介してください。

1. 各コンパニオンにはユニークな名前を与えてください。
2. 各コンパニオンに簡潔な個性（例：冷静沈着、陽気、臆病など）を与えてください。
3. 各コンパニオンに、物語で役立つ可能性のあるスキル（例：医学、鍵開け、説得など）を1つ以上与えてください。
4. コンパニオンのセリフは'npc_dialogue'フィールドに、行動は'narrative'フィールドに記述してください。
5. コンパニオンのセリフは必ず「コンパニオン名: セリフ」の形式で記述してください。
6. コンパニオンが敵にダメージを与えた場合は、'enemy_updates'を適切に更新してください。
7. コンパニオンは常にプレイヤーの安全を第一に考えます。必要に応じて情報提供、提案、疑問投げかけを行い、物語の進行を促します。戦闘では積極的に敵と交戦し、プレイヤーを援護します。
`;
  return `${companionInstruction}\n${scenario?.systemInstruction || ''}`;
};

const buildCharacterSheet = (character: any) => {
  return `
--- プレイヤーキャラクター情報 ---
名前: ${character.name}
職業: ${character.occupation}
HP: ${character.hp}/${character.maxHp}
正気度(SAN): ${character.sanity}/${character.maxSanity}
MP: ${character.mp}/${character.maxMp}
能力値: ${JSON.stringify(character.stats)}
技能: ${JSON.stringify(character.skills)}
所持品: ${character.inventory && character.inventory.length > 0 ? character.inventory.join(', ') : 'なし'}
背景: ${character.backstory || 'なし'}
------------------------------`;
};

export const startChatSession = (
  character: Character,
  scenario: Scenario,
  modelName: string,
  numberOfCompanions: number,
): GameSession => {
  return {
    sessionId: `cthulhu_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    character,
    scenario,
    modelName: modelName || 'gemini-2.5-flash',
    numberOfCompanions,
  };
};

const getChat = (session: GameSession): Chat => {
  if (session.chat) return session.chat;
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini APIキーが設定されていません。画面右上の「APIキー」から設定してください。');
  }
  const ai = new GoogleGenAI({ apiKey });
  session.chat = ai.chats.create({
    model: session.modelName,
    history: [
      {
        role: 'user',
        parts: [{ text: `ゲームを開始します。これがプレイヤーキャラクターのデータです。\n${buildCharacterSheet(session.character)}` }],
      },
      {
        role: 'model',
        parts: [{ text: 'キャラクターシートを読み込みました。準備ができましたら、ゲームマスターとして物語を開始します。' }],
      },
    ],
    config: {
      systemInstruction: buildSystemInstruction(session.scenario, session.numberOfCompanions),
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
    },
  });
  return session.chat;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sendMessage = async (
  session: GameSession,
  message: string,
  onRetry?: (attempt: number) => void
): Promise<AIResponse> => {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const chat = getChat(session);
      const result = await chat.sendMessage({ message });
      const jsonText = result.text ? result.text.trim() : '';
      if (!jsonText) {
        throw new Error('AIからの応答が空または無効です。');
      }
      const parsedData = JSON.parse(jsonText);
      if (!parsedData.enemy_updates) {
        parsedData.enemy_updates = [];
      }
      return parsedData as AIResponse;
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`Gemini request failed (Attempt ${attempt}/${MAX_RETRIES}):`, e);

      const isRateLimit = /429|resource_exhausted|quota|503|unavailable/i.test(lastError.message || '');
      if (isRateLimit && attempt < MAX_RETRIES) {
        if (onRetry) onRetry(attempt);
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  const rawMessage = lastError?.message || '不明なエラーが発生しました。';
  if (/api key not valid|api_key_invalid|permission_denied|401|403/i.test(rawMessage)) {
    throw new Error('Gemini APIキーが無効です。画面右上の「APIキー」から正しいキーを設定し直してください。');
  }
  if (/resource_exhausted|quota|rate limit|429/i.test(rawMessage)) {
    throw new Error('APIの利用上限に達しました。しばらく時間をおいてから再度お試しください。');
  }
  throw new Error(`AIとの通信に失敗しました。詳細: ${rawMessage}`);
};

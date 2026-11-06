import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Chat } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY is not set in the server environment.');
}

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

// Store active chat sessions
interface SessionData {
  chat: Chat;
  lastActive: number;
}
const sessions = new Map<string, SessionData>();

// Clean up old sessions (> 2 hours)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > 2 * 60 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 15 * 60 * 1000);

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/trpg/message', async (req: Request, res: Response) => {
  const { sessionId, character, scenario, numberOfCompanions = 1, message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Model selection: gemini-2.5-flash offers optimal reasoning and high throughput with generous free limits
  const modelName = 'gemini-2.5-flash';

  try {
    let session = sessions.get(sessionId);

    if (!session) {
      const fullCharacterSheet = buildCharacterSheet(character);
      const systemInstruction = buildSystemInstruction(scenario, numberOfCompanions);

      const initialHistory = [
        {
          role: 'user' as const,
          parts: [{ text: `ゲームを開始します。これがプレイヤーキャラクターのデータです。\n${fullCharacterSheet}` }],
        },
        {
          role: 'model' as const,
          parts: [{ text: 'キャラクターシートを読み込みました。準備ができましたら、ゲームマスターとして物語を開始します。' }],
        },
        ...history,
      ];

      const chat = ai.chats.create({
        model: modelName,
        history: initialHistory,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      });

      session = { chat, lastActive: Date.now() };
      sessions.set(sessionId, session);
    } else {
      session.lastActive = Date.now();
    }

    const MAX_RETRIES = 3;
    let lastError: any = null;
    let jsonText = '';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await session.chat.sendMessage({ message });
        jsonText = result.text ? result.text.trim() : '';
        if (!jsonText) {
          throw new Error('AIからの応答が空または無効です。');
        }
        break;
      } catch (err: any) {
        lastError = err;
        console.error(`Gemini call attempt ${attempt} failed:`, err?.message || err);

        const errMsg = String(err?.message || err);
        const isRateLimit = /429|resource_exhausted|quota|503|unavailable/i.test(errMsg);

        if (isRateLimit && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await sleep(delay);
          continue;
        }
        break;
      }
    }

    if (!jsonText) {
      const errMsg = lastError?.message || 'Gemini API呼び出しに失敗しました。';
      return res.status(500).json({ error: errMsg });
    }

    const parsedJson = JSON.parse(jsonText);
    if (!parsedJson.enemy_updates) {
      parsedJson.enemy_updates = [];
    }

    return res.json({ success: true, data: parsedJson });
  } catch (err: any) {
    console.error('Server error handling /api/trpg/message:', err);
    return res.status(500).json({ error: err.message || '内部サーバーエラーが発生しました。' });
  }
});

async function start() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

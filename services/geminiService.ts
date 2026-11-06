import type { Character, AIResponse, Scenario } from '../types';

export interface GameSession {
  sessionId: string;
  character: Character;
  scenario: Scenario;
  numberOfCompanions: number;
  modelName: string;
}

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
      const response = await fetch('/api/trpg/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          character: session.character,
          scenario: session.scenario,
          numberOfCompanions: session.numberOfCompanions,
          modelName: session.modelName,
          message,
        }),
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errJson = await response.json();
          errorDetail = errJson.error || JSON.stringify(errJson);
        } catch {
          errorDetail = await response.text();
        }

        const isRateLimit =
          response.status === 429 ||
          response.status === 503 ||
          /rate limit|quota|resource_exhausted|unavailable/i.test(errorDetail);

        if (isRateLimit && attempt < MAX_RETRIES) {
          if (onRetry) onRetry(attempt);
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await sleep(delay);
          continue;
        }

        throw new Error(errorDetail || `サーバーエラー (HTTP ${response.status})`);
      }

      const resData = await response.json();
      if (!resData.success || !resData.data) {
        throw new Error(resData.error || 'AIからの応答データが不正です。');
      }

      const parsedData = resData.data;
      if (!parsedData.enemy_updates) {
        parsedData.enemy_updates = [];
      }

      return parsedData as AIResponse;
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`Gemini request failed (Attempt ${attempt}/${MAX_RETRIES}):`, e);

      const errorMessage = lastError.message || '';
      const isRateLimit = /429|resource_exhausted|quota|503/i.test(errorMessage);

      if (isRateLimit && attempt < MAX_RETRIES) {
        if (onRetry) onRetry(attempt);
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  if (lastError) {
    let finalErrorMessage = '';
    const rawMessage = lastError.message;
    const isRateLimitErrorFinal =
      /resource_exhausted/i.test(rawMessage) ||
      /quota/i.test(rawMessage) ||
      /rate limit/i.test(rawMessage) ||
      rawMessage.includes('429');

    if (isRateLimitErrorFinal) {
      finalErrorMessage =
        'APIの利用上限に達しました。現在リクエストが混み合っているため、しばらく時間をおいてから再度お試しください。';
    } else {
      finalErrorMessage = `AIとの通信に失敗しました。詳細: ${rawMessage}`;
    }
    throw new Error(finalErrorMessage);
  }

  throw new Error('不明なエラーが発生しました。');
};

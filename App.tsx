
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Character, LogEntry, AIResponse, Scenario, Enemy } from './types';
import { GameState, Role } from './types';
import { startChatSession, sendMessage, getChatHistory, type GameSession } from './services/geminiService';
import { loadSave, writeSave, clearSave, downloadSave, type SaveData, type SavableState } from './services/saveGame';
import CharacterSheet from './components/CharacterSheet';
import GameLog from './components/GameLog';
import ActionBar from './components/ActionBar';
import CharacterCreator from './components/CharacterCreator';
import ScenarioSelector from './components/ScenarioSelector';
import MusicPlayer from './components/MusicPlayer';

const CombatTracker: React.FC<{ enemies: Enemy[] }> = ({ enemies }) => {
    const EnemyHPBar: React.FC<{ enemy: Enemy }> = ({ enemy }) => (
        <div className="mb-2">
            <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-bold text-gray-300">{enemy.name}</span>
                <span className="font-mono text-gray-400">{enemy.hp} / {enemy.maxHp}</span>
            </div>
            <div className="w-full bg-black/30 rounded-full h-2.5">
                <div
                    className="bg-red-600 h-2.5 rounded-full"
                    style={{ width: `${enemy.maxHp > 0 ? (enemy.hp / enemy.maxHp) * 100 : 0}%`, transition: 'width 0.5s ease-in-out' }}
                ></div>
            </div>
        </div>
    );

    return (
        <div className="p-4 bg-gray-800/50 rounded-lg mb-4 border border-red-700/50 flex-shrink-0">
            <h3 className="font-display text-xl text-red-400 text-center mb-3">戦闘中</h3>
            <div className="space-y-2">
                {enemies.map((enemy) => (
                    <EnemyHPBar key={enemy.name} enemy={enemy} />
                ))}
            </div>
        </div>
    );
};

const ACTION_COOLDOWN_MS = 5000; // 5 seconds to stay safely under 15 RPM limit for Flash model

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.ScenarioSelection);
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [playerCharacter, setPlayerCharacter] = useState<Character | null>(() => {
        try {
            const savedCharacter = localStorage.getItem('cthulhu_solo_character');
            return savedCharacter ? JSON.parse(savedCharacter) : null;
        } catch (error) {
            console.error("Failed to parse character from localStorage", error);
            return null;
        }
    });
    const [gameLog, setGameLog] = useState<LogEntry[]>([]);
    const [scenarioResult, setScenarioResult] = useState<string | null>(null);
    const [isInCombat, setIsInCombat] = useState<boolean>(false);
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [isOnCooldown, setIsOnCooldown] = useState<boolean>(false);
    const [currentTrack, setCurrentTrack] = useState<{ url: string; title: string; } | null>(null);
    const [numberOfCompanions, setNumberOfCompanions] = useState(1); // New state for companion count
    const gameLogRef = useRef<HTMLDivElement>(null);
    const gameStateRef = useRef(gameState);
    const chatSessionRef = useRef<GameSession | null>(null);
    const [savedGame, setSavedGame] = useState<SaveData | null>(() => loadSave());
    const saveFailedWarnedRef = useRef(false);

    const buildSaveData = useCallback((): SaveData | null => {
        const savable = [GameState.Playing, GameState.Epilogue, GameState.Finished];
        if (!savable.includes(gameState) || !scenario || !playerCharacter || !chatSessionRef.current) return null;
        return {
            version: 1,
            savedAt: new Date().toISOString(),
            scenario,
            character: playerCharacter,
            gameLog,
            enemies,
            isInCombat,
            numberOfCompanions,
            gameState: gameState as SavableState,
            scenarioResult,
            history: getChatHistory(chatSessionRef.current),
        };
    }, [gameState, scenario, playerCharacter, gameLog, enemies, isInCombat, numberOfCompanions, scenarioResult]);

    // Auto-save whenever a turn settles (never mid-request while Loading)
    useEffect(() => {
        const data = buildSaveData();
        if (!data) return;
        if (writeSave(data)) {
            setSavedGame(data);
        } else if (!saveFailedWarnedRef.current) {
            saveFailedWarnedRef.current = true;
            alert('ブラウザの保存容量が足りず、自動セーブできませんでした。画面上部の「セーブを書き出す」でファイルに保存してください。');
        }
    }, [buildSaveData]);

    useEffect(() => {
        if (playerCharacter) {
            localStorage.setItem('cthulhu_solo_character', JSON.stringify(playerCharacter));
        } else {
            localStorage.removeItem('cthulhu_solo_character');
        }
    }, [playerCharacter]);

    useEffect(() => {
        if (gameLogRef.current) {
            gameLogRef.current.scrollTop = gameLogRef.current.scrollHeight;
        }
    }, [gameLog]);

    // シナリオ選択に戻るための完全なリセット
    const handleEndGame = useCallback(() => {
        setScenario(null);
        setGameLog([]);
        setScenarioResult(null);
        setIsInCombat(false);
        setEnemies([]);
        setCurrentTrack(null);
        setNumberOfCompanions(1); // Reset companion count
        setGameState(GameState.ScenarioSelection);
        chatSessionRef.current = null;
        // playerCharacter is preserved for the next game
    }, []);

    // "セッションを完全に終了": the story is over, so the save goes too
    const handleFinishSession = useCallback(() => {
        clearSave();
        setSavedGame(null);
        handleEndGame();
    }, [handleEndGame]);

    const handleReturnToTitle = useCallback(() => {
        if (gameStateRef.current === GameState.Loading) return;
        setSavedGame(loadSave());
        handleEndGame();
    }, [handleEndGame]);

    const handleResumeGame = useCallback((save: SaveData) => {
        setScenario(save.scenario);
        setPlayerCharacter(save.character);
        setGameLog([...save.gameLog, { role: Role.System, content: 'セーブデータから再開しました。' }]);
        setEnemies(save.enemies || []);
        setIsInCombat(!!save.isInCombat);
        setNumberOfCompanions(save.numberOfCompanions || 1);
        setScenarioResult(save.scenarioResult);
        setCurrentTrack(save.scenario.bgm || null);
        chatSessionRef.current = startChatSession(save.character, save.scenario, 'gemini-2.5-flash', save.numberOfCompanions || 1, save.history);
        saveFailedWarnedRef.current = false;
        setGameState(save.gameState);
    }, []);

    const handleDeleteSave = useCallback(() => {
        clearSave();
        setSavedGame(null);
    }, []);

    const handleExportSave = useCallback(() => {
        const data = buildSaveData();
        if (data) downloadSave(data);
    }, [buildSaveData]);

    const handleStartEpilogue = useCallback(() => {
        setGameState(GameState.Epilogue);
        setGameLog(prev => [...prev, {
            role: Role.System,
            content: "後日談が始まりました。シナリオは完了しましたが、物語は続きます。自由に行動してください。"
        }]);
    }, []);

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const startGame = useCallback(async (character: Character, selectedScenario: Scenario, companionsCount: number, isNewCharacter: boolean = false) => {
        if (!selectedScenario) {
            alert("シナリオが選択されていません。");
            setGameState(GameState.ScenarioSelection);
            return;
        }
        
        if (selectedScenario.bgm) {
            setCurrentTrack(selectedScenario.bgm);
        }

        const refreshedCharacter = {
            ...character,
            hp: character.maxHp,
            sanity: character.maxSanity,
            mp: character.maxMp,
            inventory: isNewCharacter ? character.inventory : [],
        };
        setPlayerCharacter(refreshedCharacter);
        setGameState(GameState.Loading);
        setGameLog([]);
        setIsInCombat(false);
        setEnemies([]);
        setNumberOfCompanions(companionsCount); // Set companion count

        try {
            const modelName = 'gemini-2.5-flash';
            
            chatSessionRef.current = startChatSession(refreshedCharacter, selectedScenario, modelName, companionsCount);
            
            let initialPrompt = `ゲームを開始し、導入シナリオを説明してください。`;
            
            const aiResponse = await sendMessage(chatSessionRef.current, initialPrompt);
            
            const initialLog: LogEntry[] = [
                { role: Role.System, content: `ゲーム開始。シナリオ: ${selectedScenario.title}。モデル: ${modelName}。コンパニオン数: ${companionsCount}人。` }
            ];
            
            setGameLog([
                ...initialLog,
                { role: Role.GM, content: aiResponse.narrative },
                ...(aiResponse.npc_dialogue ? [{ role: Role.NPC, content: aiResponse.npc_dialogue }] : [])
            ]);
            setGameState(GameState.Playing);
        } catch (error) {
            console.error("Failed to start game:", error);
            const message = error instanceof Error ? error.message : "不明なエラーが発生しました。";
            
            let userMessage = `ゲームの開始に失敗しました。\n\nエラー: ${message}`;
            if (message.includes("APIの利用上限") || message.toLowerCase().includes("quota")) {
                userMessage = `ゲームの開始に失敗しました: APIの利用上限に達したようです。\n\nこのアプリは高速・高性能で無料利用枠の広い「Gemini 2.5 Flash」モデルを使用しています。\n\nしばらく時間をおいてから、もう一度シナリオを開始してください。`;
            }
            
            alert(userMessage);

            // Reset state to allow the user to try again from the selection screen
            handleEndGame(); // エラー時は完全にリセット
        }
    }, [handleEndGame]);
    
    const handleScenarioSelect = (selectedScenario: Scenario, createNew: boolean, companionsCount: number) => {
        if (savedGame && !confirm(`新しいシナリオを始めると、途中のセーブデータ（${savedGame.scenario.title}）は上書きされます。よろしいですか？\n残したい場合は先に「書き出す」でファイルに保存してください。`)) {
            return;
        }
        setScenario(selectedScenario);
        setNumberOfCompanions(companionsCount); // Set companion count here as well
        if (createNew || !playerCharacter) {
            setGameState(GameState.Setup);
        } else {
            startGame(playerCharacter, selectedScenario, companionsCount);
        }
    };

    const handleGoToCreator = useCallback(() => {
        setScenario(null);
        setGameState(GameState.Setup);
    }, []);

    const handleCharacterImport = (character: Character) => {
        setPlayerCharacter(character);
    };

    const handleCharacterCreate = useCallback((character: Character) => {
        setPlayerCharacter(character);
        if (scenario) {
            startGame(character, scenario, numberOfCompanions, true);
        } else {
            setGameState(GameState.ScenarioSelection);
        }
    }, [scenario, startGame, numberOfCompanions]);
    
    const handlePlayerActionRef = useRef<((action: string, isContinuation?: boolean) => Promise<void>) | null>(null);

    const processAIResponse = useCallback((response: AIResponse, character: Character): { updatedCharacter: Character, gameFinished: boolean, chainInProgress: boolean } => {
        let newCharacter = { ...character };
        let logUpdate: LogEntry[] = [];
        let gameFinished = false;
    
        logUpdate.push({ role: Role.GM, content: response.narrative });
        if (response.npc_dialogue) {
            logUpdate.push({ role: Role.NPC, content: response.npc_dialogue });
        }

        if (response.player_update) {
            const sanityChange = response.player_update.sanity || 0;
            const hpChange = response.player_update.hp || 0;
            const inventoryAdd = response.player_update.inventory_add || [];
            const inventoryRemove = response.player_update.inventory_remove || [];
            let changes = [];

            if (sanityChange !== 0) {
                const oldSanity = newCharacter.sanity;
                newCharacter.sanity = Math.max(0, Math.min(newCharacter.maxSanity, oldSanity + sanityChange));
                const change = newCharacter.sanity - oldSanity;
                if (change !== 0) changes.push(`正気度が${change > 0 ? '+' : ''}${change}`);
            }
            if (hpChange !== 0) {
                const oldHp = newCharacter.hp;
                newCharacter.hp = Math.max(0, Math.min(newCharacter.maxHp, oldHp + hpChange));
                const change = newCharacter.hp - oldHp;
                 if (change !== 0) changes.push(`HPが${change > 0 ? '+' : ''}${change}`);
            }
            if (inventoryAdd.length > 0) {
                newCharacter.inventory = [...newCharacter.inventory, ...inventoryAdd];
                changes.push(`アイテム入手: ${inventoryAdd.join(', ')}`);
            }
            if (inventoryRemove.length > 0) {
                newCharacter.inventory = newCharacter.inventory.filter(
                    item => !inventoryRemove.includes(item)
                );
                changes.push(`アイテム喪失/使用: ${inventoryRemove.join(', ')}`);
            }

            if (changes.length > 0) {
                logUpdate.push({ role: Role.System, content: `ステータス更新: ${changes.join('、 ')}。` });
            }
        }
        
        if (response.enemy_updates && response.enemy_updates.length > 0) {
            let currentEnemies = [...enemies];
            const enemyChangesLog: string[] = [];
            currentEnemies = currentEnemies.map(enemy => {
                const update = response.enemy_updates.find(u => u.name === enemy.name);
                if (update) {
                    const newHp = Math.max(0, enemy.hp + update.hp_change);
                    if (update.hp_change < 0) {
                        enemyChangesLog.push(`${enemy.name}に${-update.hp_change}のダメージ`);
                    }
                    return { ...enemy, hp: newHp };
                }
                return enemy;
            }).filter(enemy => enemy.hp > 0);
            
            if (enemyChangesLog.length > 0) {
                logUpdate.push({ role: Role.System, content: `戦闘: ${enemyChangesLog.join('、')}。` });
            }
            
            const defeatedEnemies = enemies.filter(oldEnemy => !currentEnemies.some(newEnemy => newEnemy.name === oldEnemy.name));
            if (defeatedEnemies.length > 0) {
                logUpdate.push({ role: Role.System, content: `${defeatedEnemies.map(e => e.name).join('、')}を倒した！` });
            }
            setEnemies(currentEnemies);
        }

        if (response.game_event && response.game_event.type !== 'none') {
            const { type, details } = response.game_event;
            
            if (type === 'combat_start' && details?.enemies) {
                const newCombatants = details.enemies.map(e => ({ name: e.name, hp: e.hp, maxHp: e.hp }));
                setEnemies(newCombatants);
                setIsInCombat(true);
                logUpdate.push({ role: Role.System, content: `戦闘開始！ ${newCombatants.map(e => e.name).join('、')}が現れた。` });
            } else if (type === 'combat_end') {
                setIsInCombat(false);
                setEnemies([]);
                logUpdate.push({ role: Role.System, content: `戦闘終了。${details?.message || ""}` });
            }

            if (type === 'scenario_end') {
                logUpdate.push({ role: Role.System, content: `シナリオ終了。${details?.message || "お疲れ様でした。"}` });
                setScenarioResult(response.narrative);
                setGameState(GameState.Finished);
                gameStateRef.current = GameState.Finished; // refを即時更新
                gameFinished = true;
            }
            else if (type === 'skill_check' && details?.skill) {
                const targetValue = newCharacter.skills[details.skill] || 5;
                const roll = Math.floor(Math.random() * 100) + 1;
                const success = roll <= targetValue;
                logUpdate.push({ 
                    role: Role.System, 
                    content: `【技能チェック: ${details.skill}】\n目標値 (あなたの技能値): **${targetValue}**\nダイスロール: **${roll}**\n結果: ${success ? "🎉 成功" : "💥 失敗"}` 
                });
                
                setGameLog(prev => [...prev, ...logUpdate]);
                handlePlayerActionRef.current?.(
                    success ? "技能チェックに成功した。" : "技能チェックに失敗した。",
                    true // This flag bypasses the loading check for the recursive call.
                );
                return { updatedCharacter: newCharacter, gameFinished: false, chainInProgress: true };
            } else if (type === 'sanity_check' && details?.loss) {
                const parts = details.loss.split('d');
                let loss = 0;
                if (parts.length === 2) {
                    const [numDice, dieType] = parts.map(Number);
                    if (!isNaN(numDice) && !isNaN(dieType)) {
                       for (let i = 0; i < numDice; i++) {
                           loss += Math.floor(Math.random() * dieType) + 1;
                       }
                    }
                } else if (!isNaN(parseInt(details.loss, 10))) {
                    loss = parseInt(details.loss, 10);
                }
                const oldSanity = newCharacter.sanity;
                newCharacter.sanity = Math.max(0, oldSanity - loss);
                const actualLoss = oldSanity - newCharacter.sanity;
                logUpdate.push({ role: Role.System, content: `正気度喪失チェック: ${actualLoss}ポイントの正気度を失った！` });
            }
        }
    
        setGameLog(prev => [...prev, ...logUpdate]);
        return { updatedCharacter: newCharacter, gameFinished, chainInProgress: false };
    }, [setGameLog, setGameState, enemies, isInCombat]);

    const handlePlayerAction = useCallback(async (action: string, isContinuation = false) => {
        const preLoadingState = gameStateRef.current;
        if ((!isContinuation && (preLoadingState === GameState.Loading || isOnCooldown)) || !playerCharacter || !chatSessionRef.current) return;

        setGameState(GameState.Loading);
        gameStateRef.current = GameState.Loading;
        
        if (!isContinuation) {
            const newLogEntry: LogEntry = { role: Role.Player, content: action };
            setGameLog(prevLog => [...prevLog, newLogEntry]);
        }
        
        let finalAction = action;
        if (preLoadingState === GameState.Epilogue && !isContinuation) {
            finalAction = `【後日談】これはシナリオクリア後の自由なロールプレイです。状況に合わせて応答してください。プレイヤーの行動: ${action}`;
        }

        try {
            const onRetry = (attempt: number) => {
                const retryMessage = `APIの通信が混み合っています。自動で再試行します... (試行 ${attempt}/3)`;
                setGameLog(prevLog => {
                    const lastEntry = prevLog[prevLog.length - 1];
                    if (lastEntry?.role === Role.System && lastEntry.content.includes('再試行します')) {
                        const newLog = [...prevLog.slice(0, -1)];
                        newLog.push({ role: Role.System, content: retryMessage, isError: true });
                        return newLog;
                    }
                    return [...prevLog, { role: Role.System, content: retryMessage, isError: true }];
                });
            };

            const aiResponse = await sendMessage(chatSessionRef.current, finalAction, onRetry);
            
            setGameLog(prevLog => prevLog.filter(entry => !(entry.role === Role.System && entry.content.includes('再試行します'))));

            const processingResult = processAIResponse(aiResponse, playerCharacter);
            setPlayerCharacter(processingResult.updatedCharacter);
            
            if (enemies.length > 0 && !isInCombat) {
                 if (enemies.filter(e => e.hp > 0).length === 0) {
                     setIsInCombat(false);
                 }
            }
            
            if (!processingResult.gameFinished && !processingResult.chainInProgress) {
                setGameState(preLoadingState);
                gameStateRef.current = preLoadingState;
            }

        } catch (error) {
            console.error(error);
            const apiError = error instanceof Error ? error.message : "不明な通信エラー";

            setGameLog(prev => {
                const finalErrorMsg = {role: Role.System, content: `エラー: ${apiError}`, isError: true};
                const lastEntry = prev[prev.length - 1];
                if (lastEntry?.role === Role.System && lastEntry.content.includes('再試行します')) {
                    return [...prev.slice(0, -1), finalErrorMsg];
                }
                return [...prev, finalErrorMsg];
            });
            setGameState(preLoadingState); 
            gameStateRef.current = preLoadingState;
        } finally {
            if (!isContinuation) {
                setIsOnCooldown(true);
                setTimeout(() => setIsOnCooldown(false), ACTION_COOLDOWN_MS);
            }
             if (gameStateRef.current === GameState.Loading) {
                setGameState(preLoadingState);
                gameStateRef.current = preLoadingState;
            }
        }
    }, [playerCharacter, scenario, processAIResponse, enemies, isInCombat, isOnCooldown]);

    useEffect(() => {
        handlePlayerActionRef.current = handlePlayerAction;
    }, [handlePlayerAction]);

    const isEditingCharacter = gameState === GameState.Setup && !scenario;
    const isCreatingForScenario = gameState === GameState.Setup && !!scenario;

    // FIX: This comparison appears to be unintentional because the types 'GameState.Playing | GameState.Epilogue' and 'GameState.Loading' have no overlap.
    // The ActionBar should be visible during loading state only after the game has started (gameLog is not empty).
    // This prevents the ActionBar from appearing during the initial scenario setup loading screen,
    // and keeps it visible during player actions, fixing both a UX issue and a TypeScript type-narrowing error.
    const showActionBar = gameState === GameState.Playing || gameState === GameState.Epilogue || (gameState === GameState.Loading && gameLog.length > 0);

    return (
        <>
            {gameState === GameState.ScenarioSelection && <ScenarioSelector onScenarioSelect={handleScenarioSelect} existingCharacter={playerCharacter} onGoToCreator={handleGoToCreator} onCharacterImport={handleCharacterImport} savedGame={savedGame} onResumeGame={handleResumeGame} onDeleteSave={handleDeleteSave} selectedCompanionCount={numberOfCompanions} setSelectedCompanionCount={setNumberOfCompanions} />}
            {gameState === GameState.Setup && <CharacterCreator onCharacterCreate={handleCharacterCreate} isStartingGame={isCreatingForScenario} existingCharacter={isEditingCharacter ? playerCharacter : null} />}
            
            {(gameState !== GameState.ScenarioSelection && gameState !== GameState.Setup) && (
                <div className="bg-gray-900 text-gray-300 min-h-screen flex flex-col p-4 md:p-6 lg:p-8 relative" style={{backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-matter.png')`}}>
                    <MusicPlayer track={currentTrack} />
                    <div className="flex flex-wrap justify-end gap-2 mb-2 pr-20">
                        <button
                            onClick={handleExportSave}
                            disabled={gameState === GameState.Loading}
                            className="text-xs bg-gray-800/80 hover:bg-gray-700 disabled:opacity-40 text-gray-300 border border-gray-600 rounded px-3 py-1"
                            title="現在の進行状況をファイルに保存します"
                        >
                            セーブを書き出す
                        </button>
                        <button
                            onClick={handleReturnToTitle}
                            disabled={gameState === GameState.Loading}
                            className="text-xs bg-gray-800/80 hover:bg-gray-700 disabled:opacity-40 text-gray-300 border border-gray-600 rounded px-3 py-1"
                            title="進行状況は自動セーブされています"
                        >
                            タイトルへ（自動セーブ済み）
                        </button>
                    </div>
                    <header className="text-center mb-4">
                        <h1 className="text-3xl md:text-4xl font-display text-gray-100">
                            {scenario?.title || 'クトゥルフ神話TRPG'}
                        </h1>
                        <p className="text-md text-gray-400 font-serif">ソロアドベンチャー</p>
                    </header>
                    
                    <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                        <div className="lg:col-span-2 flex flex-col bg-black bg-opacity-30 border border-gray-700 rounded-lg shadow-lg h-full">
                            <div ref={gameLogRef} className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                                <GameLog log={gameLog} />
                            </div>
                             {showActionBar && (
                                <div className="p-4 border-t border-gray-700">
                                   <ActionBar onSubmit={handlePlayerAction} isLoading={gameState === GameState.Loading} isOnCooldown={isOnCooldown} playerCharacter={playerCharacter} isInCombat={isInCombat} enemies={enemies} />
                                </div>
                             )}
                        </div>

                        <div className="lg:col-span-1 bg-black bg-opacity-30 border border-gray-700 rounded-lg shadow-lg overflow-y-auto custom-scrollbar h-full flex flex-col">
                           {isInCombat && <CombatTracker enemies={enemies} />}
                           {playerCharacter && <CharacterSheet character={playerCharacter} />}
                        </div>
                    </main>

                    {gameState === GameState.Finished && (
                        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-500">
                            <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center border border-gray-600 max-w-2xl w-full">
                                <h2 className="text-3xl font-display mb-4 text-gray-100">セッション終了</h2>
                                <div className="text-left text-gray-300 mb-6 p-4 bg-black/20 rounded max-h-60 overflow-y-auto custom-scrollbar">
                                    <p className="whitespace-pre-wrap">{scenarioResult || "お疲れ様でした。"}</p>

                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={handleStartEpilogue}
                                        className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider"
                                    >
                                        後日談を続ける
                                    </button>
                                    <button
                                        onClick={handleFinishSession}
                                        className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider"
                                    >
                                        セッションを完全に終了
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <style>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 8px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: #1a202c;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background-color: #4a5568;
                            border-radius: 4px;
                            border: 2px solid #1a202c;
                        }
                    `}</style>
                </div>
            )}
        </>
    );
};

export default App;

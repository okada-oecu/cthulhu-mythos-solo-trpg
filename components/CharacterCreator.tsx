import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Character, CharacterStats, Skills } from '../types';
import { roll } from '../utils/characterGenerator';
import CharacterSheet from './CharacterSheet';
import { CthulhuIcon } from './icons';

interface Props {
  onCharacterCreate: (character: Character) => void;
  isStartingGame: boolean;
  existingCharacter?: Character | null;
}

const STAT_ROLLS: { [key in keyof CharacterStats]: string } = {
  STR: '3d6', CON: '3d6', POW: '3d6', DEX: '3d6', APP: '3d6',
  SIZ: '2d6+6', INT: '2d6+6', EDU: '2d6+6',
};

const BASE_SKILLS: Skills = {
    'アイデア': 0, '幸運': 0, '知識': 0, '回避': 0, 'キック': 25, '組み付き': 25,
    'パンチ': 50, '頭突き': 10, '投擲': 25, 'マーシャルアーツ': 1, '拳銃': 20, 'サブマシンガン': 15,
    'ショットガン': 30, 'マシンガン': 15, 'ライフル': 25, '応急手当': 30, '鍵開け': 1, '隠す': 15,
    '隠れる': 10, '聞き耳': 25, '忍び歩き': 10, '写真術': 10, '精神分析': 1, '追跡': 10,
    '登攀': 40, '図書館': 25, '目星': 25, '運転': 20, '機械修理': 20, '重機械操作': 1,
    '乗馬': 5, '水泳': 25, '製作': 5, '操縦': 1, '跳躍': 25, '電気修理': 10,
    'ナビゲート': 10, '変装': 1, '言いくるめ': 5, '信用': 15, '説得': 15, '値切り': 5,
    '母国語': 0, '医学': 5, 'オカルト': 5, '化学': 1, 'クトゥルフ神話': 0, '芸術': 5,
    '経リ': 10, '考古学': 1, 'コンピューター': 1, '心理学': 5, '人類学': 1, '生物学': 1,
    '地質学': 1, '電子工学': 1, '天文学': 1, '博物学': 10, '物理学': 1, '法律': 5,
    '薬学': 1, '歴史': 20,
};

const CharacterCreator: React.FC<Props> = ({ onCharacterCreate, isStartingGame, existingCharacter }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(existingCharacter?.name || '');
  const [occupation, setOccupation] = useState(existingCharacter?.occupation || '');

  const initialStats = useMemo(() => {
      if (!existingCharacter?.stats) {
          return { STR: 0, CON: 0, SIZ: 0, DEX: 0, APP: 0, INT: 0, POW: 0, EDU: 0 };
      }
      // Stored stats are multiplied by 5, so we divide to get the base roll
      const s = existingCharacter.stats;
      return {
          STR: s.STR / 5, CON: s.CON / 5, SIZ: s.SIZ / 5, DEX: s.DEX / 5,
          APP: s.APP / 5, INT: s.INT / 5, POW: s.POW / 5, EDU: s.EDU / 5,
      };
  }, [existingCharacter]);

  const [stats, setStats] = useState<CharacterStats>(initialStats);
  const [skills, setSkills] = useState<Skills>(existingCharacter?.skills || {});
  const [pointMode, setPointMode] = useState<'occupation' | 'hobby'>('occupation');
  const [backstory, setBackstory] = useState(existingCharacter?.backstory || '');
  const [inventoryText, setInventoryText] = useState(existingCharacter?.inventory?.join('\n') || '');
  
  const [skillPointAllocation, setSkillPointAllocation] = useState<{[key: string]: {occupation: number, hobby: number}}>(existingCharacter?.skillPointAllocation || {});

  const occupationPoints = useMemo(() => stats.EDU * 20, [stats.EDU]);
  const hobbyPoints = useMemo(() => stats.INT * 10, [stats.INT]);

  // FIX: Explicitly type the `sum` accumulator as `number` to correct a TypeScript inference issue where it was being treated as `unknown`.
  const allocatedOccupationPoints = useMemo(() => Object.values(skillPointAllocation).reduce((sum: number, points: {occupation: number, hobby: number}) => sum + points.occupation, 0), [skillPointAllocation]);
  // FIX: Explicitly type the `sum` accumulator as `number` to correct a TypeScript inference issue where it was being treated as `unknown`.
  const allocatedHobbyPoints = useMemo(() => Object.values(skillPointAllocation).reduce((sum: number, points: {occupation: number, hobby: number}) => sum + points.hobby, 0), [skillPointAllocation]);
  
  const remainingOccupationPoints = occupationPoints - allocatedOccupationPoints;
  const remainingHobbyPoints = hobbyPoints - allocatedHobbyPoints;


  const characterPreview = useMemo<Character>(() => {
    const finalSkills = { ...skills };
    const baseStats = { ...stats };
    
    // The stats object for the final character needs the *5 values
    const finalStats: Partial<CharacterStats> = {};
    for (const key in baseStats) {
        finalStats[key as keyof CharacterStats] = baseStats[key as keyof CharacterStats] * 5;
    }

    finalSkills['アイデア'] = stats.INT * 5;
    finalSkills['幸運'] = stats.POW * 5;
    finalSkills['知識'] = stats.EDU * 5;
    if(finalSkills['母国語'] === undefined || finalSkills['母国語'] < stats.EDU * 5) {
      finalSkills['母国語'] = stats.EDU * 5;
    }


    const maxHp = Math.ceil((stats.CON + stats.SIZ) / 2) || 0;
    const maxSanity = (stats.POW * 5) || 0;
    const maxMp = stats.POW || 0;
    
    const inventory = inventoryText.split('\n').map(item => item.trim()).filter(item => item !== '');

    return {
      name, occupation, stats: finalStats as CharacterStats,
      hp: maxHp, maxHp, sanity: maxSanity, maxSanity, mp: maxMp, maxMp,
      skills: finalSkills,
      inventory: inventory,
      backstory,
      skillPointAllocation,
    };
  }, [name, occupation, stats, skills, inventoryText, backstory, skillPointAllocation]);

  const rollStat = useCallback((statKey: keyof CharacterStats): number => {
      const rollString = STAT_ROLLS[statKey];
      if(rollString.includes('+')) {
        const [dice, add] = rollString.split('+');
        return roll(dice) + parseInt(add, 10);
      }
      return roll(rollString);
  }, []);

  const handleRollStats = useCallback(() => {
    const newStats: Partial<CharacterStats> = {};
    for (const key in STAT_ROLLS) {
      newStats[key as keyof CharacterStats] = rollStat(key as keyof CharacterStats);
    }
    setStats(newStats as CharacterStats);
  }, [rollStat]);

  useEffect(() => {
    if (step === 2 && !existingCharacter) {
      handleRollStats();
    }
  }, [step, handleRollStats, existingCharacter]);

  const handleRerollStat = useCallback((stat: keyof CharacterStats) => {
    setStats(prev => ({ ...prev, [stat]: rollStat(stat) }));
  }, [rollStat]);

  const handleStatChange = (stat: keyof CharacterStats, value: string) => {
    const numValue = parseInt(value, 10) || 0;
    setStats(prev => ({ ...prev, [stat]: numValue }));
  };

  const handleNextStep = () => {
    if (step === 2 && Object.keys(skills).length === 0) {
        const initialSkills = { ...BASE_SKILLS };
        initialSkills['母国語'] = stats.EDU * 5;
        initialSkills['回避'] = stats.DEX * 2;
        setSkills(initialSkills);
    }
    setStep(prev => prev + 1);
  };
  
  const handleSkillChange = useCallback((skill: string, delta: number) => {
    if (delta === 0) return;

    let basePoints: number;
    if (skill === '母国語') basePoints = stats.EDU * 5;
    else if (skill === '回避') basePoints = stats.DEX * 2;
    else basePoints = BASE_SKILLS[skill] || 0;

    const currentPoints = skills[skill] || basePoints;
    const currentAllocation = skillPointAllocation[skill] || { occupation: 0, hobby: 0 };
    
    const targetValue = currentPoints + delta;
    const clampedValue = Math.max(basePoints, Math.min(99, targetValue));
    const effectiveDelta = clampedValue - currentPoints;

    if (effectiveDelta === 0) return;

    if (effectiveDelta > 0) { // ADDING
        const pointsToAdd = effectiveDelta;
        if ( (pointMode === 'occupation' && remainingOccupationPoints >= pointsToAdd) || 
             (pointMode === 'hobby' && remainingHobbyPoints >= pointsToAdd) ) {
            
            setSkills(prev => ({ ...prev, [skill]: currentPoints + pointsToAdd }));
            
            const newAllocation = { ...currentAllocation };
            if (pointMode === 'occupation') {
                newAllocation.occupation += pointsToAdd;
            } else {
                newAllocation.hobby += pointsToAdd;
            }
            setSkillPointAllocation(prev => ({ ...prev, [skill]: newAllocation }));
        }
    } else { // REMOVING
        const pointsToRemove = -effectiveDelta;
        let occupationPointsRemoved = 0;
        let hobbyPointsRemoved = 0;

        if (pointMode === 'occupation') {
            occupationPointsRemoved = Math.min(pointsToRemove, currentAllocation.occupation);
            hobbyPointsRemoved = Math.min(pointsToRemove - occupationPointsRemoved, currentAllocation.hobby);
        } else {
            hobbyPointsRemoved = Math.min(pointsToRemove, currentAllocation.hobby);
            occupationPointsRemoved = Math.min(pointsToRemove - hobbyPointsRemoved, currentAllocation.occupation);
        }
        
        const totalRemoved = occupationPointsRemoved + hobbyPointsRemoved;

        if (totalRemoved > 0) {
            setSkills(prev => ({ ...prev, [skill]: currentPoints - totalRemoved }));
            setSkillPointAllocation(prev => ({...prev, [skill]: {
                occupation: currentAllocation.occupation - occupationPointsRemoved,
                hobby: currentAllocation.hobby - hobbyPointsRemoved
            }}));
        }
    }
  }, [skills, pointMode, remainingOccupationPoints, remainingHobbyPoints, skillPointAllocation, stats.EDU, stats.DEX]);

  const handleSkillValueChange = (skill: string, value: string) => {
      let base: number;
      if (skill === '母国語') base = stats.EDU * 5;
      else if (skill === '回避') base = stats.DEX * 2;
      else base = BASE_SKILLS[skill] || 0;
      
      const currentValue = skills[skill] || base;
      const newTotalValue = parseInt(value, 10);
  
      if (isNaN(newTotalValue)) return;
      
      const clampedValue = Math.max(base, Math.min(99, newTotalValue));
      const delta = clampedValue - currentValue;
      
      if (delta !== 0) {
          handleSkillChange(skill, delta);
      }
  };


  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <div className="mb-4">
              <label htmlFor="name" className="block text-gray-400 text-sm font-bold mb-2 font-serif">探索者の名前:</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="mb-6">
              <label htmlFor="occupation" className="block text-gray-400 text-sm font-bold mb-2 font-serif">職業:</label>
              <input type="text" id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} required className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <button onClick={handleNextStep} disabled={!name.trim() || !occupation.trim()} className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider disabled:bg-gray-600 disabled:cursor-not-allowed">次へ: 能力値</button>
          </div>
        );
      case 2:
        return (
          <div>
            <h3 className="text-xl text-center font-display mb-4">能力値の決定</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              {Object.keys(stats).map(statKey => (
                <div key={statKey}>
                  <label className="block text-gray-400 text-sm font-bold mb-1">{statKey} ({STAT_ROLLS[statKey as keyof CharacterStats]})</label>
                  <div className="flex items-center">
                    <input type="number" value={stats[statKey as keyof CharacterStats]} onChange={e => handleStatChange(statKey as keyof CharacterStats, e.target.value)} className="shadow appearance-none border border-gray-600 rounded-l w-full py-2 px-3 bg-gray-700 text-gray-200" />
                    <button onClick={() => handleRerollStat(statKey as keyof CharacterStats)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-r" title={`${statKey}を再挑戦`}>🔄</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleRollStats} className="w-full mb-2 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">一括で振り直す</button>
            <button onClick={handleNextStep} disabled={Object.values(stats).some(s => s === 0)} className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider disabled:bg-gray-600 disabled:cursor-not-allowed">次へ: 技能</button>
          </div>
        );
    case 3:
        const sortedSkills = Object.entries(BASE_SKILLS).sort((a, b) => a[0].localeCompare(b[0], 'ja'));
        return (
            <div className="flex flex-col h-[70vh]">
                <h3 className="text-xl text-center font-display mb-2">技能ポイントの割り振り</h3>
                <div className="text-center mb-2 p-2 bg-gray-800 rounded-md grid grid-cols-2 gap-2">
                    <p className="text-sm">職業P: <span className="font-bold text-green-400">{remainingOccupationPoints}</span> / {occupationPoints}</p>
                    <p className="text-sm">興味P: <span className="font-bold text-yellow-400">{remainingHobbyPoints}</span> / {hobbyPoints}</p>
                </div>
                 <div className="flex justify-center gap-2 mb-2">
                    <button onClick={() => setPointMode('occupation')} className={`py-1 px-4 text-sm rounded-full transition ${pointMode === 'occupation' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>職業P</button>
                    <button onClick={() => setPointMode('hobby')} className={`py-1 px-4 text-sm rounded-full transition ${pointMode === 'hobby' ? 'bg-yellow-500 text-white' : 'bg-gray-600 text-gray-300'}`}>興味P</button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-md">
                {sortedSkills.map(([skill]) => {
                    let base;
                    if (skill === '母国語') {
                        base = stats.EDU * 5;
                    } else if (skill === '回避') {
                        base = stats.DEX * 2;
                    } else {
                        base = BASE_SKILLS[skill] || 0;
                    }
                    const currentValue = skills[skill] || base;
                    return (
                        <div key={skill} className="flex items-center justify-between text-sm mb-1 p-1 rounded hover:bg-gray-700/50">
                            <span className="truncate pr-2">{skill} ({base})</span>
                            <div className="flex items-center">
                                <button onClick={() => handleSkillChange(skill, -5)} className="w-8 h-6 text-xs bg-gray-600 hover:bg-gray-500 rounded-l transition">-5</button>
                                <button onClick={() => handleSkillChange(skill, -1)} className="w-6 h-6 text-xs bg-gray-700 hover:bg-gray-600 border-l border-r border-gray-800 transition">-</button>
                                <input
                                    type="number"
                                    value={currentValue}
                                    onChange={(e) => handleSkillValueChange(skill, e.target.value)}
                                    className="font-mono w-12 h-6 text-center bg-gray-900 border-t border-b border-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button onClick={() => handleSkillChange(skill, 1)} className="w-6 h-6 text-xs bg-gray-700 hover:bg-gray-600 border-l border-r border-gray-800 transition">+</button>
                                <button onClick={() => handleSkillChange(skill, 5)} className="w-8 h-6 text-xs bg-gray-600 hover:bg-gray-500 rounded-r transition">+5</button>
                            </div>
                        </div>
                    );
                })}
                </div>
                <button onClick={handleNextStep} className="w-full mt-2 bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider">次へ: 背景</button>
            </div>
        );
      case 4:
        return (
          <div>
            <h3 className="text-xl text-center font-display mb-4">背景設定</h3>
            <p className="text-gray-400 text-sm mb-4">
                あなたの探索者の過去や、この物語に至るまでの経緯を自由に記述してください。この内容はゲームの導入に反映されます。
            </p>
            <textarea
                id="backstory"
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                rows={8}
                className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 font-serif"
                placeholder={`例：裕福な家庭に生まれたが、オカルトに魅了され家を飛び出した。古書店の店主として生計を立てる傍ら、不可解な事件の噂を聞きつけては首を突っ込んでいる...`}
            />
            <button onClick={handleNextStep} className="w-full mt-4 bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider">次へ: 装備</button>
          </div>
        );
      case 5:
        return (
          <div>
            <h3 className="text-xl text-center font-display mb-4">初期装備</h3>
            <p className="text-gray-400 text-sm mb-4">
                職業や個人的な背景に合わせて、初期の所持品をいくつか入力してください。1行に1アイテムずつ記入します。（例: 探偵なら、虫眼鏡、手帳、ペンなど）
            </p>
            <textarea
                id="inventory"
                value={inventoryText}
                onChange={(e) => setInventoryText(e.target.value)}
                rows={5}
                className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-700 text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-green-500 font-serif"
                placeholder={`懐中電灯\n手帳\n万年筆\n...`}
            />
            <button onClick={handleNextStep} className="w-full mt-4 bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider">次へ: 確認</button>
          </div>
        );
    case 6:
        return (
            <div className="flex flex-col h-[70vh]">
                 <h3 className="text-xl text-center font-display mb-2">キャラクター確認</h3>
                 <div className="flex-grow overflow-y-auto custom-scrollbar border border-gray-700 rounded-lg">
                    <CharacterSheet character={characterPreview} />
                 </div>
                 <button onClick={() => onCharacterCreate(characterPreview)} className="w-full mt-2 bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 font-display text-xl tracking-wider">
                    {isStartingGame ? '探索を始める' : 'キャラクターを保存'}
                 </button>
            </div>
        )
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen flex items-center justify-center p-4" style={{backgroundImage: `url('https://www.transparenttextures.com/patterns/dark-matter.png')`}}>
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700">
        <div className="text-center mb-8">
          <CthulhuIcon className="w-20 h-20 mx-auto text-green-400 opacity-50" />
          <h1 className="text-4xl font-display text-gray-100 mt-4">探索者作成</h1>
          <p className="text-lg text-gray-400 font-serif">ステップ {step} / 6</p>
        </div>
        {renderStep()}
        <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #1f2937;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #4b5563;
                border-radius: 4px;
            }
        `}</style>
      </div>
    </div>
  );
};

export default CharacterCreator;

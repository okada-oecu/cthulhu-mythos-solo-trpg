import React, { useState } from 'react';
import type { Character, Enemy } from '../types';

interface ActionBarProps {
    onSubmit: (action: string) => void;
    isLoading: boolean;
    isOnCooldown: boolean;
    playerCharacter: Character | null;
    isInCombat: boolean;
    enemies: Enemy[];
}

const ActionBar: React.FC<ActionBarProps> = ({ onSubmit, isLoading, isOnCooldown, playerCharacter, isInCombat, enemies }) => {
    const [action, setAction] = useState('');
    const [showSkills, setShowSkills] = useState(false);
    const [showItems, setShowItems] = useState(false);
    const [showTargets, setShowTargets] = useState(false);
    
    const isDisabled = isLoading || isOnCooldown;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (action.trim() && !isDisabled) {
            onSubmit(action);
            setAction('');
        }
    };

    const handleSkillClick = (skill: string) => {
        onSubmit(`【${skill}】を使って行動します。`);
        setShowSkills(false);
    };
    
    const handleItemClick = (item: string) => {
        onSubmit(`【${item}】を使用します。`);
        setShowItems(false);
    };

    const handleAttackClick = (enemy: string) => {
        onSubmit(`${enemy}を攻撃する。`);
        setShowTargets(false);
    };

    const sortedSkills = playerCharacter ? Object.entries(playerCharacter.skills).sort((a, b) => Number(b[1]) - Number(a[1])) : [];

    const getPlaceholderText = () => {
        if (isLoading) return "AIが思考中...";
        if (isOnCooldown) return "次の行動まで少々お待ちください...";
        if (isInCombat) return "戦闘行動を入力 (例: 敵を殴る)";
        return "あなたの行動を入力...";
    };

    return (
        <div className="relative">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    type="text"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder={getPlaceholderText()}
                    disabled={isDisabled}
                    className="flex-grow bg-gray-800 border border-gray-600 rounded-md py-2 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition duration-200 disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                />
                 <button
                    type="button"
                    onClick={() => { setShowSkills(!showSkills); setShowItems(false); setShowTargets(false); }}
                    disabled={isDisabled}
                    className={`px-3 py-2 rounded-md font-bold text-white transition duration-200 ${
                        isDisabled 
                            ? 'bg-gray-600 cursor-not-allowed' 
                            : 'bg-blue-700 hover:bg-blue-600'
                    } disabled:opacity-50`}
                    title="技能一覧"
                >
                    技能
                </button>
                 <button
                    type="button"
                    onClick={() => { setShowItems(!showItems); setShowSkills(false); setShowTargets(false); }}
                    disabled={isDisabled || !playerCharacter || playerCharacter.inventory.length === 0}
                    className={`px-3 py-2 rounded-md font-bold text-white transition duration-200 ${
                        isDisabled 
                            ? 'bg-gray-600 cursor-not-allowed' 
                            : 'bg-purple-700 hover:bg-purple-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="アイテム一覧"
                >
                    ｱｲﾃﾑ
                </button>
                 {isInCombat && (
                    <button
                        type="button"
                        onClick={() => { setShowTargets(!showTargets); setShowSkills(false); setShowItems(false); }}
                        disabled={isDisabled}
                        className={`px-3 py-2 rounded-md font-bold text-white transition duration-200 ${
                            isDisabled 
                                ? 'bg-gray-600 cursor-not-allowed' 
                                : 'bg-red-700 hover:bg-red-600'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="攻撃対象を選択"
                    >
                        攻撃
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isDisabled || !action.trim()}
                    className={`px-4 py-2 rounded-md font-bold text-white transition duration-200 ${
                        isDisabled
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-green-700 hover:bg-green-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? '待機' : '実行'}
                </button>
            </form>

            {showSkills && playerCharacter && (
                <div className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-lg max-h-60 overflow-y-auto z-10 shadow-lg">
                    <ul className="p-1">
                        {sortedSkills.map(([skill, value]) => (
                            <li 
                                key={skill} 
                                onClick={() => handleSkillClick(skill)} 
                                className="flex justify-between items-center p-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer rounded"
                            >
                                <span>{skill}</span>
                                <span className="font-mono bg-gray-900 px-2 py-0.5 rounded text-gray-300">{value}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {showItems && playerCharacter && playerCharacter.inventory.length > 0 && (
                <div className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-lg max-h-60 overflow-y-auto z-10 shadow-lg">
                    <ul className="p-1">
                        {playerCharacter.inventory.map((item, index) => (
                            <li 
                                key={index} 
                                onClick={() => handleItemClick(item)} 
                                className="p-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer rounded"
                            >
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {showTargets && isInCombat && enemies.length > 0 && (
                <div className="absolute bottom-full mb-2 w-full bg-gray-800 border border-gray-600 rounded-lg max-h-60 overflow-y-auto z-10 shadow-lg">
                    <ul className="p-1">
                        {enemies.filter(e => e.hp > 0).map((enemy) => (
                            <li 
                                key={enemy.name} 
                                onClick={() => handleAttackClick(enemy.name)} 
                                className="p-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer rounded"
                            >
                                <span>{enemy.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ActionBar;

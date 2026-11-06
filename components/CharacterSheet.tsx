
import React from 'react';
import type { Character } from '../types';
import { HealthIcon, SanityIcon, MagicIcon, BrainIcon, StrengthIcon, ConstitutionIcon, DexterityIcon, SizeIcon, AppearanceIcon, PowerIcon, EducationIcon } from './icons';

interface CharacterSheetProps {
    character: Character;
}

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: number }> = ({ icon, label, value }) => (
    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
        <div className="flex items-center">
            {icon}
            <span className="ml-2 text-sm text-gray-300">{label}</span>
        </div>
        <span className="font-bold text-gray-100">{value}</span>
    </div>
);

const ResourceBar: React.FC<{
    icon: React.ReactNode;
    label: string;
    current: number;
    max: number;
    textColor: string;
    barColor: string;
}> = ({ icon, label, current, max, textColor, barColor }) => (
    <div>
        <div className="flex justify-between items-center mb-1 text-sm">
            <div className={`flex items-center font-bold ${textColor}`}>
                {icon}
                <span className="ml-1.5">{label}</span>
            </div>
            <span className={`font-mono text-gray-300`}>{current} / {max}</span>
        </div>
        <div className={`w-full bg-black/30 rounded-full h-2`}>
            <div
                className={`${barColor} h-2 rounded-full`}
                style={{ width: `${max > 0 ? (current / max) * 100 : 0}%`, transition: 'width 0.5s ease-in-out' }}
            ></div>
        </div>
    </div>
);


const CharacterSheet: React.FC<CharacterSheetProps> = ({ character }) => {
    // Add defaults to prevent crashes with older character data from localStorage
    const stats = character.stats || { STR: 0, CON: 0, SIZ: 0, DEX: 0, APP: 0, INT: 0, POW: 0, EDU: 0 };
    const skills = character.skills || {};
    const inventory = character.inventory || [];

    return (
        <div className="p-4 text-gray-200 flex flex-col font-serif flex-grow min-h-0">
            <div className="text-center mb-4 pb-2 border-b border-gray-700">
                <h2 className="text-2xl font-display text-gray-100">{character.name}</h2>
                <p className="text-sm text-gray-400">{character.occupation}</p>
            </div>

            <div className="space-y-3 mb-4">
                 <ResourceBar
                    icon={<HealthIcon className="w-4 h-4" />}
                    label="HP"
                    current={character.hp}
                    max={character.maxHp}
                    textColor="text-red-400"
                    barColor="bg-red-500"
                />
                <ResourceBar
                    icon={<SanityIcon className="w-4 h-4" />}
                    label="SAN"
                    current={character.sanity}
                    max={character.maxSanity}
                    textColor="text-blue-400"
                    barColor="bg-blue-500"
                />
                <ResourceBar
                    icon={<MagicIcon className="w-4 h-4" />}
                    label="MP"
                    current={character.mp}
                    max={character.maxMp}
                    textColor="text-purple-400"
                    barColor="bg-purple-500"
                />
            </div>

            <div className="mb-4">
                <h3 className="font-bold text-gray-400 text-sm mb-2 text-center">能力値</h3>
                <div className="grid grid-cols-2 gap-2">
                    <StatItem icon={<StrengthIcon className="w-4 h-4 text-gray-400"/>} label="STR" value={stats.STR} />
                    <StatItem icon={<DexterityIcon className="w-4 h-4 text-gray-400"/>} label="DEX" value={stats.DEX} />
                    <StatItem icon={<ConstitutionIcon className="w-4 h-4 text-gray-400"/>} label="CON" value={stats.CON} />
                    <StatItem icon={<SizeIcon className="w-4 h-4 text-gray-400"/>} label="SIZ" value={stats.SIZ} />
                    <StatItem icon={<BrainIcon className="w-4 h-4 text-gray-400"/>} label="INT" value={stats.INT} />
                    <StatItem icon={<PowerIcon className="w-4 h-4 text-gray-400"/>} label="POW" value={stats.POW} />
                    <StatItem icon={<AppearanceIcon className="w-4 h-4 text-gray-400"/>} label="APP" value={stats.APP} />
                    <StatItem icon={<EducationIcon className="w-4 h-4 text-gray-400"/>} label="EDU" value={stats.EDU} />
                </div>
            </div>
            
            {character.backstory && (
                <div className="mb-4">
                    <h3 className="font-bold text-gray-400 text-sm mb-2 text-center">背景</h3>
                    <div className="text-xs p-2 bg-gray-800/50 rounded max-h-28 overflow-y-auto custom-scrollbar">
                        <p className="whitespace-pre-wrap text-gray-300">{character.backstory}</p>
                    </div>
                </div>
            )}

            <div className="flex-grow overflow-y-auto">
                <h3 className="font-bold text-gray-400 text-sm mb-2 text-center">技能</h3>
                <div className="space-y-1 text-xs">
                    {/* Fix: The original destructuring in the sort callback was causing a TypeScript type inference issue. Switched to standard array access which is more explicit and correctly typed. */}
                    {/* FIX: Explicitly cast skill values to Number to resolve arithmetic operation error. */}
                    {Object.entries(skills).sort((a, b) => Number(b[1]) - Number(a[1])).map(([skill, value]) => (
                        <div key={skill} className="flex justify-between items-center p-1 bg-gray-800/30 rounded">
                            <span>{skill}</span>
                            <span className="font-mono bg-gray-900 px-2 py-0.5 rounded text-gray-200">{String(value)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex-shrink-0">
                <h3 className="font-bold text-gray-400 text-sm mb-2 text-center">所持品</h3>
                <div className="space-y-1 text-xs px-2 max-h-24 overflow-y-auto custom-scrollbar">
                    {inventory.length > 0 ? (
                        inventory.map((item, index) => (
                            <div key={index} className="p-1.5 bg-gray-800/30 rounded">
                                <span>{item}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 italic">なし</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CharacterSheet;
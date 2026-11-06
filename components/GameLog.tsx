import React from 'react';
import type { LogEntry } from '../types';
import { Role } from '../types';
import { UserIcon, NpcIcon, SystemIcon, GmIcon } from './icons';

interface GameLogProps {
    log: LogEntry[];
}

const getRoleStyles = (role: Role, isError?: boolean) => {
    if (isError) {
        return {
            container: "bg-red-900/30 border-red-700",
            icon: <SystemIcon className="w-5 h-5 text-red-400" />,
            name: "システムエラー",
            nameColor: "text-red-400",
            contentColor: "text-red-300",
        };
    }
    switch (role) {
        case Role.Player:
            return {
                container: "bg-blue-900/20 border-blue-800",
                icon: <UserIcon className="w-5 h-5 text-blue-300" />,
                name: "あなた",
                nameColor: "text-blue-300",
                contentColor: "text-gray-200 font-semibold",
            };
        case Role.GM:
            return {
                container: "border-transparent",
                icon: <GmIcon className="w-5 h-5 text-gray-500" />,
                name: "GM",
                nameColor: "text-gray-500",
                contentColor: "text-gray-300 italic",
            };
        case Role.NPC:
            return {
                container: "bg-green-900/20 border-green-800",
                icon: <NpcIcon className="w-5 h-5 text-green-300" />,
                name: "コンパニオン",
                nameColor: "text-green-300",
                contentColor: "text-gray-300",
            };
        case Role.System:
            return {
                container: "bg-yellow-900/30 border-yellow-700 text-center",
                icon: <SystemIcon className="w-5 h-5 text-yellow-400" />,
                name: "システム",
                nameColor: "text-yellow-400 font-mono text-xs",
                contentColor: "text-yellow-300 font-mono text-sm",
            };
        default:
            return {
                container: "",
                icon: null,
                name: "",
                nameColor: "",
                contentColor: "",
            };
    }
};


const LogEntryComponent: React.FC<{ entry: LogEntry }> = ({ entry }) => {
    const { container, icon, name, nameColor, contentColor } = getRoleStyles(entry.role, entry.isError);

    if (entry.role === Role.System) {
        const renderContent = (content: string) => {
            const parts = content.split(/(\*\*.*?\*\*|【.*?】|🎉 成功|💥 失敗)/g);
            return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="text-yellow-200 font-bold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('【') && part.endsWith('】')) {
                    return <span key={index} className="text-yellow-200 font-bold bg-yellow-900/50 px-2 py-1 rounded">{part.slice(1, -1)}</span>;
                }
                if (part === '🎉 成功') {
                    return <span key={index} className="text-green-300 font-bold">{part}</span>;
                }
                if (part === '💥 失敗') {
                    return <span key={index} className="text-red-400 font-bold">{part}</span>;
                }
                return <span key={index}>{part}</span>;
            });
        };
    
        return (
            <div className={`my-4 p-3 border-t border-b ${container}`}>
                <p className={`${contentColor} whitespace-pre-wrap`}>{renderContent(entry.content)}</p>
            </div>
        );
    }
    
    if (entry.role === Role.GM) {
        return (
            <div className={`my-4 p-2 ${container}`}>
                <p className={`${contentColor} whitespace-pre-wrap`}>{entry.content}</p>
            </div>
        )
    }
    
    if (entry.role === Role.NPC) {
        const lines = entry.content.split('\n').filter(line => line.trim() !== '');
        const isMultiSpeaker = lines.some(line => /^([^:]+):/.test(line));
        
        let contentRender;

        if (isMultiSpeaker) {
            contentRender = (
                <div className="ml-7 space-y-1">
                    {lines.map((line, index) => {
                        const match = line.match(/^([^:]+):(.*)/);
                        if (match) {
                            const [, speaker, dialogue] = match;
                            return (
                                <div key={index}>
                                    <strong className="text-green-400">{speaker.trim()}:</strong>
                                    <span className={`${contentColor} whitespace-pre-wrap`}>{dialogue}</span>
                                </div>
                            );
                        }
                        return <p key={index} className={`${contentColor} whitespace-pre-wrap`}>{line}</p>;
                    })}
                </div>
            );
        } else {
             contentRender = <p className={`ml-7 text-base ${contentColor} whitespace-pre-wrap`}>{entry.content}</p>;
        }

        return (
             <div className={`p-3 my-2 rounded-lg border ${container} flex flex-col`}>
                <div className="flex items-center mb-1">
                    {icon}
                    <span className={`ml-2 text-sm font-bold ${nameColor}`}>{isMultiSpeaker ? 'コンパニオンたち' : name}</span>
                </div>
                {contentRender}
            </div>
        );
    }


    return (
        <div className={`p-3 my-2 rounded-lg border ${container} flex flex-col`}>
            <div className="flex items-center mb-1">
                {icon}
                <span className={`ml-2 text-sm font-bold ${nameColor}`}>{name}</span>
            </div>
            <p className={`ml-7 text-base ${contentColor} whitespace-pre-wrap`}>
                {entry.content}
            </p>
        </div>
    );
};

const GameLog: React.FC<GameLogProps> = ({ log }) => {
    return (
        <div className="space-y-2 font-serif">
            {log.map((entry, index) => (
                <LogEntryComponent key={index} entry={entry} />
            ))}
        </div>
    );
};

export default GameLog;
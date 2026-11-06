import React, { useState } from 'react';
import { getApiKey, setApiKey } from '../services/geminiService';

// Shows a setup dialog on first visit, then a small "APIキー" button
// in the top-right corner for changing the key later.
const ApiKeySettings: React.FC = () => {
    const [open, setOpen] = useState(() => !getApiKey());
    const [value, setValue] = useState(() => getApiKey());

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        setApiKey(value.trim());
        setOpen(false);
    };

    if (!open) {
        return (
            <button
                onClick={() => { setValue(getApiKey()); setOpen(true); }}
                className="fixed top-3 right-3 z-40 text-xs bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded px-3 py-1 backdrop-blur-sm"
            >
                APIキー
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
            <form onSubmit={save} className="bg-gray-900 text-gray-200 border border-gray-700 rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-2xl font-display text-gray-100">Gemini APIキーの設定</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                    このゲームはAIゲームマスターに Google Gemini を使います。
                    <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-teal-400 underline mx-1">Google AI Studio</a>
                    で無料のAPIキーを取得して入力してください。
                </p>
                <p className="text-xs text-gray-500">
                    キーはこのブラウザ内にだけ保存され、Google以外には送信されません。
                </p>
                <input
                    type="password"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="AIza..."
                    autoFocus
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-100 focus:outline-none focus:border-teal-500"
                />
                <div className="flex justify-end gap-2">
                    {getApiKey() && (
                        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded text-gray-400 hover:text-gray-200">
                            キャンセル
                        </button>
                    )}
                    <button type="submit" disabled={!value.trim()} className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white">
                        保存
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ApiKeySettings;

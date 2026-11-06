import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon, MusicNoteIcon } from './icons';

interface MusicPlayerProps {
    track: {
        url: string;
        title: string;
    } | null;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ track }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isInteracted, setIsInteracted] = useState(false);
    
    useEffect(() => {
        const handleInteraction = () => {
            setIsInteracted(true);
            if (audioRef.current && audioRef.current.paused && track) {
                 audioRef.current.play().catch(e => console.warn("Audio play failed after interaction:", e));
            }
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
        };
    }, [track]);

    useEffect(() => {
        if (isInteracted && audioRef.current && track) {
            audioRef.current.play().catch(e => console.warn("Audio auto-play failed on track change:", e));
        }
    }, [track, isInteracted]);
    
    const togglePlayPause = () => {
        if (!isInteracted) {
            setIsInteracted(true);
        }
        
        const audio = audioRef.current;
        if (!audio) return;

        if (audio.paused) {
            audio.play().catch(error => console.warn("Failed to play audio on toggle:", error));
        } else {
            audio.pause();
        }
    };

    if (!track) return null;

    return (
        <div className="fixed bottom-4 left-4 bg-gray-900/80 text-gray-200 p-2 rounded-lg shadow-lg flex items-center gap-3 border border-gray-700 backdrop-blur-sm animate-fade-in z-20">
            <audio 
                ref={audioRef}
                src={track.url}
                loop
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                key={track.url} // Forces re-mount on track change
            />
            <button onClick={togglePlayPause} className="w-8 h-8 flex items-center justify-center bg-green-700/50 hover:bg-green-600/70 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-400">
                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 pl-0.5" />}
            </button>
            <div className="flex items-center">
                <MusicNoteIcon className="w-4 h-4 mr-2 text-gray-400" />
                <p className="text-xs truncate max-w-[150px] font-serif" title={track.title}>{track.title}</p>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default MusicPlayer;
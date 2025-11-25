import React, { useState, useEffect } from 'react';
import { Rocket, Star, Gift, ArrowRight, Plus, User, X } from 'lucide-react';

interface OnboardingProps {
    onLogin: (familyName: string) => void;
}

export const Onboarding = ({ onLogin }: OnboardingProps) => {
    const [savedFamilies, setSavedFamilies] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('saved_families');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const [view, setView] = useState<'list' | 'create'>(savedFamilies.length > 0 ? 'list' : 'create');
    const [familyName, setFamilyName] = useState('');
    const [showTutorial, setShowTutorial] = useState(false);

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault();
        if (familyName.trim()) {
            setShowTutorial(true);
        }
    };

    const handleSelectFamily = (name: string) => {
        setFamilyName(name);
        // Skip tutorial for existing users
        completeLogin(name);
    };

    const removeFamily = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        const newList = savedFamilies.filter(f => f !== name);
        setSavedFamilies(newList);
        localStorage.setItem('saved_families', JSON.stringify(newList));
        if (newList.length === 0) setView('create');
    };

    const handleComplete = () => {
        completeLogin(familyName);
    };

    const completeLogin = (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        // Save to history
        const newFamilies = Array.from(new Set([trimmed, ...savedFamilies])).slice(0, 5); // Keep max 5
        localStorage.setItem('saved_families', JSON.stringify(newFamilies));

        onLogin(trimmed);
    };

    if (showTutorial) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-black pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-pulse"></div>

                <div className="relative z-10 max-w-md w-full space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500 drop-shadow-sm">
                            How it Works
                        </h2>
                        <p className="text-slate-400">Simple steps to start rewarding!</p>
                    </div>

                    <div className="space-y-4">
                        {/* Step 1 */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shrink-0">
                                <Rocket className="text-white" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">1. Create Missions</h3>
                                <p className="text-sm text-slate-300">Set up goals like "Potty Time" or "Clean Up".</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shrink-0">
                                <Star className="text-white" size={24} fill="currentColor" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">2. Collect Stars</h3>
                                <p className="text-sm text-slate-300">Tap to add stars when they do good!</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shrink-0">
                                <Gift className="text-white" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">3. Open Surprises</h3>
                                <p className="text-sm text-slate-300">Unlock fun rewards and animations.</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleComplete}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-4 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 animate-bounce-in delay-500"
                    >
                        <span>Let's Go!</span>
                        <ArrowRight size={24} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-black pointer-events-none"></div>

            <div className="relative z-10 max-w-md w-full text-center space-y-8">
                {/* Logo / Icon */}
                <div className="relative w-32 h-32 mx-auto mb-8 animate-float-slow">
                    <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-40 rounded-full animate-pulse"></div>
                    <img src="/mascot.png" alt="App Icon" className="w-full h-full object-contain drop-shadow-2xl relative z-10" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">
                        Toddler Rewards
                    </h1>
                    <p className="text-slate-400 text-lg">Make good habits fun & magical!</p>
                </div>

                {view === 'list' ? (
                    <div className="space-y-4 pt-4 animate-fade-in-up">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Continue as</p>
                        <div className="space-y-3">
                            {savedFamilies.map((name) => (
                                <div key={name} onClick={() => handleSelectFamily(name)} className="group relative bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all active:scale-95">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg">
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-xl flex-1 text-left">{name}</span>
                                    <button
                                        onClick={(e) => removeFamily(e, name)}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setView('create')}
                            className="mt-6 text-slate-400 hover:text-white flex items-center justify-center gap-2 w-full py-3 font-bold transition-colors"
                        >
                            <Plus size={18} />
                            <span>Add Another Family</span>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleStart} className="space-y-4 pt-8 animate-fade-in-up">
                        <div className="space-y-2 text-left">
                            <label className="text-sm font-bold text-slate-300 ml-1">Family Name</label>
                            <input
                                type="text"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                placeholder="e.g. The Smiths"
                                className="w-full bg-white/10 border-2 border-white/10 focus:border-blue-500 rounded-2xl px-6 py-4 text-xl font-bold text-white placeholder-white/30 outline-none transition-all"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!familyName.trim()}
                            className={`w-full py-4 rounded-2xl font-black text-xl shadow-lg transition-all flex items-center justify-center gap-2 ${familyName.trim()
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 active:scale-95'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            <span>Create Family</span>
                            <ArrowRight size={24} />
                        </button>

                        {savedFamilies.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="text-slate-400 hover:text-white text-sm font-bold mt-4"
                            >
                                Cancel
                            </button>
                        )}
                    </form>
                )}

                <p className="text-xs text-slate-600 mt-8">
                    Your data is saved locally and synced to your family name.
                </p>
            </div>

            <style>{`
        @keyframes float-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float-slow { animation: float-slow 4s ease-in-out infinite; }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; opacity: 0; }
      `}</style>
        </div>
    );
};

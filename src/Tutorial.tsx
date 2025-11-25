import { Rocket, Star, Gift, ArrowRight } from 'lucide-react';

interface TutorialProps {
    onComplete: () => void;
}

export const Tutorial = ({ onComplete }: TutorialProps) => {
    return (
        <div className="fixed inset-0 z-[100] bg-slate-900 text-white flex flex-col items-center justify-center p-6 overflow-hidden">
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
                            <p className="text-sm text-slate-300">Unlock fun rewards and prizes.</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onComplete}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-4 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 animate-bounce-in delay-500"
                >
                    <span>Let's Go!</span>
                    <ArrowRight size={24} />
                </button>
            </div>
        </div>
    );
};

// Force Vercel Rebuild
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Rocket, Star, Gift, Trash2, Trophy, Settings, Sparkles, Plus,
  Lightbulb, Award, Utensils, Edit2, X, ToggleLeft, ToggleRight,
  Pizza, IceCream, Gamepad2, Palmtree, Clapperboard, Image as ImageIcon,
  BookOpen, Heart, Music, PartyPopper, Pin, HelpCircle, Flame, Loader2
} from 'lucide-react';
import { ConfettiSystem, type ConfettiHandle } from './Confetti';
import { Onboarding } from './Onboarding';
import { Tutorial } from './Tutorial';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, increment, setDoc
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

// Import Google Font: Outfit
if (typeof window !== 'undefined') {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCHrpTf8zozbNHGBR1RkLrEaRyahSgzrvc",
  authDomain: "toddlerrewards.firebaseapp.com",
  projectId: "toddlerrewards",
  storageBucket: "toddlerrewards.firebasestorage.app",
  messagingSenderId: "1002701125718",
  appId: "1:1002701125718:web:40fb2da028e2055d71a3f7"
};

// Initialize Firebase
let firebaseApp: any;
let auth: any;
let db: any;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  }
} catch (e) {
  console.error("Firebase init error:", e);
}

// --- UTILS & AUDIO ---
// --- AUDIO ENGINE ---
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;
const playTone = (freq: number, type: OscillatorType, duration: number) => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};
const SOUNDS = {
  star: () => { if (audioCtx?.state === 'suspended') audioCtx.resume();[523, 659, 783].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.15), i * 50)); },
  success: () => { if (audioCtx?.state === 'suspended') audioCtx.resume();[440, 554, 659].forEach((f, i) => setTimeout(() => playTone(f, 'triangle', 0.3), i * 100)); },
  grand: () => { if (audioCtx?.state === 'suspended') audioCtx.resume();[523, 659, 783, 1046].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.4), i * 150)); },
  pop: () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); playTone(400, 'sine', 0.1); },
  click: () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); playTone(200, 'triangle', 0.05); },
  magic: () => { if (audioCtx?.state === 'suspended') audioCtx.resume();[880, 1100, 1320].forEach((f, i) => setTimeout(() => playTone(f, 'sine', 0.1), i * 100)); },
  spin: () => { if (audioCtx?.state === 'suspended') audioCtx.resume(); playTone(300, 'sawtooth', 0.05); }
};

// --- COMPONENTS ---
const ICON_MAP: any = { star: Star, smile: Gift, heart: Award, zap: Sparkles, moon: Lightbulb, sun: ImageIcon, utensils: Utensils, trophy: Trophy, award: Award, gift: Gift };

const GRADIENTS = [
  'bg-gradient-to-br from-lime-400 to-green-600',
  'bg-gradient-to-br from-cyan-400 to-blue-600',
  'bg-gradient-to-br from-purple-400 to-indigo-600',
  'bg-gradient-to-br from-pink-400 to-rose-600',
  'bg-gradient-to-br from-amber-400 to-orange-600',
];

const getPrizeIcon = (prizeName: string) => {
  if (!prizeName) return Gift;
  const name = prizeName.toLowerCase();
  if (name.includes('pizza')) return Pizza;
  if (name.includes('ice cream')) return IceCream;
  if (name.includes('game') || name.includes('toy')) return Gamepad2;
  if (name.includes('park') || name.includes('zoo')) return Palmtree;
  if (name.includes('movie') || name.includes('cinema')) return Clapperboard;
  return Gift;
};



// --- 3D ICON WRAPPER ---
const PremiumIcon = ({ Icon, size = 24, className = "", colorMain = "text-white", colorShadow = "text-black/20" }: any) => (
  <div className={`relative ${className} group`}>
    <Icon size={size} className={`${colorShadow} absolute top-[2px] left-[0px] opacity-50`} fill="currentColor" strokeWidth={3} />
    <Icon size={size} className={`${colorMain} relative z-10 drop-shadow-md`} fill="currentColor" strokeWidth={2} />
  </div>
);

// --- NEXT PRIZE CARD (Hero) ---
const NextPrizeCard = ({ totalRewards, settings, targetRef, scale = 1 }: any) => {
  // Find the next claimable prize
  const prizesWithProgress = settings.grandPrizes
    .filter((p: any) => p.active)
    .map((p: any) => {
      const currentProgress = Math.max(0, totalRewards - (p.lastClaimedAt || 0));
      const canClaim = currentProgress >= p.goal;
      const progress = Math.min(100, (currentProgress / p.goal) * 100);
      return { ...p, currentProgress, canClaim, progress, pointsNeeded: Math.max(0, p.goal - currentProgress) };
    });

  const featured = settings.featuredPrizeId ? prizesWithProgress.find((p: any) => p.id === settings.featuredPrizeId) : null;

  const nextPrize = featured || prizesWithProgress
    .filter((p: any) => !p.canClaim)
    .sort((a: any, b: any) => {
      if (a.pointsNeeded !== b.pointsNeeded) return a.pointsNeeded - b.pointsNeeded;
      return b.goal - a.goal;
    })[0] || prizesWithProgress[0];

  if (!nextPrize) return null;

  const pointsNeeded = nextPrize.pointsNeeded;
  const progress = nextPrize.progress;

  // Determine background image
  const [randomImage, setRandomImage] = useState('');

  useEffect(() => {
    // Randomize image on mount (page refresh) or when featured prize changes
    setRandomImage(`/prize-${Math.floor(Math.random() * 8) + 1}.jpg`);
  }, [settings.featuredPrizeId]);

  // Determine background image - use random image for hero
  const heroStyle = {
    backgroundImage: `url(${randomImage || '/prize-1.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };

  return (
    <div className="relative w-full h-64 rounded-3xl overflow-hidden shadow-2xl mb-8 group">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
        style={heroStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between">
        {/* Header Badges */}
        <div className="flex items-start justify-between">
          <div className="bg-white/10 backdrop-blur-md text-white/90 font-bold px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest border border-white/10 shadow-sm">
            Next Prize {settings.featuredPrizeId === nextPrize.id && '📌'}
          </div>

          <div className="bg-white text-slate-900 rounded-2xl p-2 min-w-[60px] flex flex-col items-center justify-center shadow-lg transform rotate-3">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Goal</span>
            <span className="text-2xl font-black leading-none">{nextPrize.goal}</span>
          </div>
        </div>

        <div className="mt-auto">
          <h2 className="text-4xl font-black text-white mb-6 drop-shadow-lg tracking-tight text-center uppercase">
            {nextPrize.name}
          </h2>

          {/* Progress Bar */}
          <div className="flex justify-between text-xs font-bold text-white mb-2 px-1">
            <span>{nextPrize.currentProgress} Points</span>
            <span className="opacity-80">{pointsNeeded} more!</span>
          </div>
          <div ref={targetRef} style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }} className="relative h-6 bg-slate-900/50 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10 shadow-inner">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-white to-slate-300 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(255,255,255,0.4)]"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20"></div>
            </div>
            {/* Shine Effect - Vivid Glow Wipe */}
            <div className={`absolute top-0 bottom-0 w-40 bg-gradient-to-r from-transparent via-purple-500 via-pink-500 via-yellow-400 to-transparent skew-x-12 blur-md transition-all duration-[2500ms] ease-in-out ${scale > 1 ? 'translate-x-[600px]' : '-translate-x-[160px]'}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- GIFT BOX SECTION (Carousel) ---
const GiftBoxSection = ({ prizes, totalRewards, onClaimPrize, onFeature, featuredId }: any) => {
  const sortedPrizes = useMemo(() => {
    return [...(prizes || [])]
      .filter(p => p.active)
      .sort((a, b) => {
        const progressA = Math.max(0, totalRewards - (a.lastClaimedAt || 0));
        const progressB = Math.max(0, totalRewards - (b.lastClaimedAt || 0));
        const remainingA = Math.max(0, a.goal - progressA);
        const remainingB = Math.max(0, b.goal - progressB);
        const isReadyA = remainingA === 0;
        const isReadyB = remainingB === 0;

        // 1. Ready to claim first
        if (isReadyA && !isReadyB) return -1;
        if (!isReadyA && isReadyB) return 1;

        // 2. Closest to completion (lowest remaining) first
        return remainingA - remainingB;
      });
  }, [prizes, totalRewards]);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-4 px-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400"><Trophy size={24} /></div>
          <div>
            <h3 className="font-bold text-xl text-white">Grand Prizes</h3>
            <p className="text-sm text-slate-400">Earn points by completing missions to unlock individual prizes.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto py-8 scrollbar-hide -mx-4 px-4 snap-x">
        {sortedPrizes.map((p: any, i: number) => {
          const timesClaimed = p.timesClaimed || 0;
          const currentProgress = Math.max(0, totalRewards - (p.lastClaimedAt || 0));
          const isMet = currentProgress >= p.goal;
          const progress = Math.min(100, (currentProgress / p.goal) * 100);
          const gradient = GRADIENTS[i % GRADIENTS.length];

          return (
            <div
              key={p.id}
              className={`snap-center relative flex-shrink-0 w-40 h-52 group transition-all ${isMet
                ? 'cursor-pointer hover:scale-110'
                : 'hover:scale-105'
                }`}
            >
              {/* Feature Pin Button - Outside overflow hidden */}
              <button
                onClick={(e) => { e.stopPropagation(); onFeature && onFeature(p.id); }}
                className={`absolute z-30 rounded-full shadow-xl transition-all flex items-center justify-center border-white ${featuredId === p.id
                  ? `bg-gradient-to-br ${gradient} text-white -top-2 -right-2 p-2 border-2 scale-110`
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white -top-1 -right-1 p-1.5 border'
                  }`}
                title="Pin to Top"
              >
                <Pin size={featuredId === p.id ? 14 : 12} fill={featuredId === p.id ? "currentColor" : "none"} />
              </button>

              <div
                onClick={() => isMet && onClaimPrize && onClaimPrize(p)}
                className={`w-full h-full rounded-[2rem] ${gradient} p-4 flex flex-col justify-between shadow-lg overflow-hidden ${isMet ? 'animate-pulse shadow-[0_0_30px_rgba(251,191,36,0.8)] border-4 border-yellow-300' : ''}`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes-transparent.png')] opacity-10 mix-blend-overlay"></div>

                <div className="relative z-10 flex justify-between items-start">
                  <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white border border-white/20">
                    {p.goal} Points
                  </span>
                  {isMet ? (
                    <div className="bg-yellow-400 text-slate-900 rounded-full p-1.5 shadow-lg animate-bounce">
                      <Trophy size={12} fill="currentColor" strokeWidth={0} />
                    </div>
                  ) : (
                    <div className="bg-white rounded-full p-1 shadow-sm">
                      <Star size={10} className="text-yellow-400" fill="currentColor" />
                    </div>
                  )}
                </div>

                <div className="relative z-10 flex-1 flex items-center justify-center my-2">
                  {isMet && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="absolute inset-0 bg-yellow-300/30 rounded-2xl animate-pulse"></div>
                    </div>
                  )}
                  <PremiumIcon Icon={getPrizeIcon(p.name)} size={48} colorMain="text-white" colorShadow="text-black/20" />
                </div>

                <div className="relative z-10">
                  <p className="text-white font-bold text-sm leading-tight mb-2 line-clamp-2 drop-shadow-sm">{p.name}</p>
                  <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.5)]" style={{ width: `${progress}% ` }}></div>
                  </div>
                  <p className="text-[10px] text-white/80 mt-1 font-medium">
                    {isMet ? (
                      <span className="text-white font-black text-xs animate-pulse">👆 CLAIM NOW!</span>
                    ) : timesClaimed > 0 ? (
                      `Claimed ${timesClaimed}x · ${Math.max(0, p.goal - currentProgress)} more`
                    ) : (
                      `${Math.max(0, p.goal - currentProgress)} more points`
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        {/* Add a dummy card to show scrolling if empty */}
        {sortedPrizes.length === 0 && (
          <div className="w-40 h-52 rounded-[2rem] bg-slate-800 flex items-center justify-center text-slate-500 text-sm font-bold border border-white/5">
            No Prizes Yet
          </div>
        )}
      </div>
    </div>
  );
};

// --- GOAL LIST ITEM (Star-based, Colorful) ---
const FunStar = ({ filled, size = 32 }: { filled: boolean, size?: number }) => (
  <div className={`relative transition-all duration-500 ${filled ? 'scale-110 opacity-100' : 'scale-90 opacity-30 grayscale'}`} style={{ width: size, height: size }}>
    <div className={`absolute inset-0 bg-yellow-400 blur-md rounded-full transition-opacity duration-500 ${filled ? 'opacity-60' : 'opacity-0'}`}></div>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`drop-shadow-lg relative z-10 ${filled ? 'animate-pulse' : ''}`}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={filled ? "url(#starGradient)" : "#475569"}
        stroke={filled ? "#B45309" : "#64748B"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="starGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
    </svg>
    {filled && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white rounded-full z-20 opacity-90"></div>}
  </div>
);

const GoalListItem = ({ behavior, onUpdate, onClaim }: any) => {
  const Icon = ICON_MAP[behavior.icon] || Star;
  const currentStars = behavior.count || 0;
  const totalStars = behavior.goal;
  const isComplete = currentStars >= totalStars;
  const [localFeedback, setLocalFeedback] = React.useState<{ visible: boolean, message: string } | null>(null);
  const [processing, setProcessing] = React.useState(false);

  const handleAddStar = (e: React.MouseEvent) => {
    if (processing) return;
    setProcessing(true);
    setTimeout(() => setProcessing(false), 500);

    onUpdate(behavior, 1, e);

    const remaining = behavior.goal - (currentStars + 1);
    if (remaining > 0) {
      setLocalFeedback({ visible: true, message: `${remaining} LEFT!` });
      setTimeout(() => setLocalFeedback(null), 2000);
    }
  };

  // Colorful gradients for different behaviors
  const gradients = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-yellow-500 to-orange-500',
    'from-red-500 to-pink-500',
  ];

  const shadowColors = [
    'shadow-[0_6px_0_#be123c]', // Rose-700
    'shadow-[0_6px_0_#4c1d95]', // Violet-900
    'shadow-[0_6px_0_#0e7490]', // Cyan-700
    'shadow-[0_6px_0_#047857]', // Emerald-700
    'shadow-[0_6px_0_#c2410c]', // Orange-700
    'shadow-[0_6px_0_#be185d]', // Pink-700
  ];

  // Use colorIndex if set, otherwise fall back to ID-based (for old goals)
  const gradientIndex = behavior.colorIndex !== undefined
    ? behavior.colorIndex % gradients.length
    : (behavior.id ? (typeof behavior.id === 'string' ? behavior.id.charCodeAt(0) : behavior.id) % gradients.length : 0);
  const gradient = gradients[gradientIndex];
  const shadowColor = shadowColors[gradientIndex];



  return (
    <div className={`relative rounded-3xl p-5 overflow-hidden group transition-all hover:scale-[1.02] ${isComplete ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-slate-900'} border border-white/10 hover:border-white/20 shadow-lg`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] opacity-5"></div>

      {/* Glow effect when complete */}
      {isComplete && (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-orange-400/20 animate-pulse"></div>
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform`}>
            <Icon size={28} className="text-white" strokeWidth={2.5} fill={isComplete ? "currentColor" : "none"} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-black text-lg mb-1 truncate ${isComplete ? 'text-white' : 'text-white'}`}>
              {behavior.name}
            </h3>
            <p className={`text-xs font-bold ${isComplete ? 'text-white/90' : 'text-slate-400'}`}>
              {isComplete ? '🎉 Ready to spin the wheel!' : `${currentStars} / ${totalStars} stars`}
            </p >
          </div >
        </div>

        {/* Star Display - Full Width & Bigger */}
        <div className="relative mb-6 min-h-[60px] flex items-center justify-center">
          {/* Local Popup Overlay */}
          {localFeedback?.visible && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none -mt-12">
              <div className="bg-white text-slate-900 px-6 py-3 rounded-full font-black shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-bounce-in flex items-center gap-2 border-4 border-yellow-400 scale-110 rotate-[-2deg] transition-all">
                <span className="text-3xl animate-spin-slow">⭐</span>
                <span className="text-2xl tracking-black animate-pulse">{localFeedback.message}</span>
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="absolute top-0 left-1/4 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  <div className="absolute bottom-0 right-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping delay-75"></div>
                  <div className="absolute top-1/2 left-0 w-2 h-2 bg-green-500 rounded-full animate-ping delay-150"></div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap justify-center p-2">
            {[...Array(totalStars)].map((_, i) => (
              <div key={i} className="flex-shrink-0 transition-transform hover:scale-110">
                <FunStar filled={i < currentStars} size={48} />
              </div>
            ))}
          </div>
        </div>

        {/* Action Button - Full Width Row */}
        <div className="mt-2">
          {isComplete ? (
            <button
              onClick={() => onClaim(behavior)}
              className="w-full bg-white text-orange-600 px-6 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-transform hover:shadow-xl hover:bg-yellow-50 flex items-center justify-center gap-3 animate-bounce text-xl"
            >
              <Gift size={24} />
              <span>OPEN SURPRISE!</span>
            </button >
          ) : (
            <button
              onClick={handleAddStar}
              disabled={processing}
              className={`w-full group relative bg-gradient-to-r ${gradient} text-white px-5 py-4 rounded-2xl font-black ${shadowColor} active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center gap-3 border-2 border-white/20 overflow-visible ${processing ? 'opacity-80 cursor-wait' : ''}`}
            >
              <Star size={24} fill="currentColor" className="text-yellow-300 group-hover:rotate-12 transition-transform" />
              <span className="text-lg uppercase tracking-wider drop-shadow-sm">Add Star</span>
            </button>
          )}
        </div>
      </div>


    </div >
  );
};

// --- MODAL COMPONENTS ---

const Confetti = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" />;
};

const SurpriseEggModal = ({ onClose, onWin, prizes, settings }: any) => {
  const [stage, setStage] = useState<'idle' | 'cracking' | 'hatched' | 'revealed'>('idle');
  const [crackLevel, setCrackLevel] = useState(0);
  const [selectedPrize, setSelectedPrize] = useState('');
  const [resultPrize, setResultPrize] = useState<string>('');

  // Default prizes
  const defaultPrizes = ['Sticker', 'Treat', 'Story', 'Hug', 'Song'];
  const activePrizes = (settings?.wheelPrizes && settings.wheelPrizes.length > 0) ? settings.wheelPrizes : (prizes && prizes.length > 0 ? prizes : defaultPrizes);

  // Icon mapping (reused)
  const getPrizeIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('sticker')) return Star;
    if (n.includes('treat') || n.includes('cream') || n.includes('pizza')) return Utensils;
    if (n.includes('story') || n.includes('book')) return BookOpen;
    if (n.includes('hug')) return Heart;
    if (n.includes('song') || n.includes('music')) return Music;
    if (n.includes('dance')) return PartyPopper;
    if (n.includes('toy')) return Rocket;
    if (n.includes('game')) return Gamepad2;
    return Gift;
  };

  const handleTap = () => {
    if (stage === 'hatched' || stage === 'revealed') return;

    // Play tap sound
    SOUNDS.click();

    if (stage === 'idle') {
      setStage('cracking');
      setCrackLevel(1);
      return;
    }

    if (stage === 'cracking') {
      if (crackLevel < 3) {
        setCrackLevel(prev => prev + 1);
        // Maybe play a crack sound here if we had one, reusing click for now
      } else {
        // HATCH!
        setStage('hatched');
        SOUNDS.pop(); // Burst sound

        // Select prize
        const selectedIndex = Math.floor(Math.random() * activePrizes.length);
        const prize = activePrizes[selectedIndex];
        setSelectedPrize(prize);
        setResultPrize(prize);

        // Reveal after short delay
        setTimeout(() => {
          setStage('revealed');
          SOUNDS.success(); // Ta-da!
          if (onWin) onWin(prize);
        }, 500);
      }
    }
  };

  const Icon = selectedPrize ? getPrizeIcon(selectedPrize) : Gift;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in overflow-hidden">
      {/* Static semi‑transparent background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-particles"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          >
            <div className="text-xl opacity-50">{['⭐', '✨', '🎉', '🎊', '💫'][i % 5]}</div>
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-lg flex flex-col items-center z-10">
        <button onClick={onClose} className="absolute -top-12 right-0 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all">
          <X size={24} />
        </button>

        {/* Title */}
        <h2 className={`text-4xl font-black mb-8 tracking-tight transition-opacity duration-500 ${stage === 'revealed' ? 'opacity-0' : 'opacity-100'}`}>
          <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 text-transparent bg-clip-text drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">
            {stage === 'idle' ? 'TAP THE EGG!' : 'KEEP TAPPING!'}
          </span>
        </h2>

        {/* EGG CONTAINER */}
        <div className="relative flex flex-col items-center justify-center cursor-pointer" onClick={handleTap}>

          {/* Glow behind egg */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/20 blur-[80px] rounded-full transition-all duration-500 ${stage === 'revealed' ? 'scale-125 opacity-50' : 'scale-100'}`}></div>

          {/* THE EGG IMAGES - Made Bigger */}
          <div
            className={`relative w-[400px] h-[400px] transition-transform duration-100 z-10
              ${stage === 'cracking' ? 'animate-shake-hard' : 'animate-float-particles'}
              ${stage === 'hatched' || stage === 'revealed' ? 'scale-105' : ''}
            `}
          >
            {/* Image switching based on state */}
            <img
              src="/egg-whole.png"
              className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl transition-opacity duration-300 ${crackLevel < 2 && stage !== 'hatched' && stage !== 'revealed' ? 'opacity-100' : 'opacity-0'}`}
              alt="Golden Egg"
            />
            <img
              src="/egg-cracked.png"
              className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl transition-opacity duration-0 ${crackLevel >= 2 && stage !== 'hatched' && stage !== 'revealed' ? 'opacity-100' : 'opacity-0'}`}
              alt="Cracked Egg"
            />
            <img
              src="/egg-hatching.png"
              className={`absolute inset-0 w-full h-full object-contain drop-shadow-2xl transition-opacity duration-0 ${stage === 'hatched' || stage === 'revealed' ? 'opacity-100' : 'opacity-0'}`}
              alt="Hatching Egg"
            />
          </div>

          {/* EXPLOSION EFFECT (when hatched) */}
          {stage === 'hatched' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-[500px] h-[500px] bg-yellow-200 rounded-full animate-hatch-burst opacity-0"></div>
            </div>
          )}

          {/* PRIZE REVEAL - Below the egg, no box */}
          {stage === 'revealed' && (
            <div className="relative z-50 mt-8 flex flex-col items-center animate-float-up-reveal">

              <h3 className="text-yellow-300 font-bold text-2xl uppercase tracking-widest mb-4 drop-shadow-lg">You Found</h3>

              <div className="flex items-center gap-6 mb-8">
                {/* Glowing Icon */}
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse"></div>
                  <Icon size={80} className="text-yellow-100 drop-shadow-[0_0_15px_rgba(253,224,71,0.8)] relative z-10" />
                </div>

                {/* Prize Name */}
                <h1 className="text-6xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] tracking-tight">
                  {resultPrize}
                </h1>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white font-black text-xl py-4 px-12 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] active:scale-95 transition-all border-4 border-white/30"
              >
                COLLECT REWARD!
              </button>
            </div>
          )}

        </div>

        {stage !== 'revealed' && (
          <p className="text-white/50 text-sm mt-8 font-medium animate-pulse">
            {stage === 'idle' ? '( Tap to start )' : '( Tap faster! )'}
          </p>
        )}

      </div>
    </div>
  );
};

// Disabled - prize is shown in wheel result

const GrandCelebrationOverlay = ({ visible, prizeName, onClose, onReset, settings }: any) => {
  const [stage, setStage] = useState<'intro' | 'charging' | 'exploded' | 'revealed'>('intro');
  const [charge, setCharge] = useState(0);
  const chargeRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const audioIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setStage('intro');
      setCharge(0);
      chargeRef.current = 0;
    }
  }, [visible]);

  if (!visible) return null;

  // Find the prize to get its details
  const prize = settings?.grandPrizes?.find((p: any) => p.name === prizeName);
  const timesClaimed = (prize?.timesClaimed || 0) + 1;
  const prizeIcon = getPrizeIcon(prizeName);

  const startCharging = () => {
    if (stage === 'revealed' || stage === 'exploded') return;
    setStage('charging');

    // Start charging loop
    const startTime = Date.now();
    const duration = 2000; // 2 seconds to charge

    // Play charging sound loop
    if (audioCtx?.state === 'suspended') audioCtx.resume();
    let freq = 200;
    audioIntervalRef.current = setInterval(() => {
      freq += 50;
      playTone(freq, 'sawtooth', 0.1);
    }, 100);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);

      chargeRef.current = progress;
      setCharge(progress);

      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // BOOM
        handleExplosion();
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const stopCharging = () => {
    if (stage === 'exploded' || stage === 'revealed') return;

    // Cancel animation
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);

    // Reset if not complete
    if (chargeRef.current < 100) {
      setStage('intro');
      const decay = () => {
        if (chargeRef.current > 0) {
          chargeRef.current = Math.max(0, chargeRef.current - 5);
          setCharge(chargeRef.current);
          requestAnimationFrame(decay);
        }
      };
      decay();
    }
  };

  const handleExplosion = () => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    setStage('exploded');
    SOUNDS.grand(); // Big sound

    // Flash screen
    setTimeout(() => {
      setStage('revealed');
      if (onReset) onReset();
      SOUNDS.success();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onMouseUp={stopCharging}
      onTouchEnd={stopCharging}
    >
      {/* Dynamic Background - Only show particles when NOT revealed */}
      {stage !== 'revealed' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating particles - much smoother, static positions */}
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${10 + (i * 6)}%`,
                top: `${20 + ((i * 43) % 60)}%`,
                animation: `float-smooth ${5 + (i % 3)}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`
              }}
            >
              <div className="text-3xl opacity-20">{['⭐', '✨', '🎉', '🎊', '💫'][i % 5]}</div>
            </div>
          ))}
        </div>
      )}

      {/* Confetti disabled - was causing brown box artifact */}
      {/* <Confetti active={stage === 'revealed'} /> */}

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl p-4 text-center select-none">

        {/* STAGE 1 & 2: CHEST & CHARGING */}
        {(stage === 'intro' || stage === 'charging') && (
          <div
            onMouseDown={startCharging}
            onTouchStart={startCharging}
            className="cursor-pointer group relative flex flex-col items-center"
          >
            {/* Shake Container */}
            <div
              className="relative transition-transform duration-75 origin-center mx-auto"
              style={{
                transform: `translate(${(Math.random() - 0.5) * charge * 0.2}px, ${(Math.random() - 0.5) * charge * 0.2}px) scale(${1 + (charge / 700)})`
              }}
            >
              {/* Glow - Intensifies with charge */}
              <div
                className="absolute inset-0 bg-yellow-500 blur-[120px] transition-all duration-200"
                style={{ opacity: 0.3 + (charge / 200) }}
              ></div>

              {/* Chest Image Replacement */}
              <div className="relative w-64 h-64 md:w-80 md:h-80 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 flex items-center justify-center pointer-events-none select-none">
                <img src="/Chest.png" alt="Treasure Chest" className="w-full h-full object-contain drop-shadow-2xl" />
              </div>
            </div>

            {/* Instructions / Progress - Premium Loading Bar */}
            <div className="mt-12 relative">
              {stage === 'intro' ? (
                <div className="space-y-3">
                  <h2 className="text-white font-black text-4xl animate-bounce drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] tracking-wide">
                    HOLD TO OPEN!
                  </h2>
                  <p className="text-white/50 text-sm tracking-wider">Press and hold the chest</p>
                </div>
              ) : (
                <div className="relative w-80 mx-auto">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-2">Opening...</p>
                  {/* Premium Glassmorphic Progress Bar */}
                  <div className="relative h-4 bg-white/10 backdrop-blur-md rounded-full overflow-hidden border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    {/* Progress fill with vivid gradient */}
                    <div
                      className="h-full bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 transition-all duration-100 ease-linear shadow-[0_0_30px_rgba(251,191,36,0.8)]"
                      style={{ width: `${charge}%` }}
                    >
                      {/* Inner glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent"></div>
                      {/* Animated shine */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/3 animate-shimmer"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STAGE 3: TRANSITION (no visual, just timing) */}
        {stage === 'exploded' && null}

        {/* STAGE 4: REVEAL - No containers, clean design */}
        {stage === 'revealed' && (
          <div className="animate-in zoom-in-50 duration-1000 flex flex-col items-center w-full">

            {/* Celebration Title - Outfit font */}
            <div className="mb-12 animate-in slide-in-from-top duration-1000 delay-200">
              <div className="inline-block relative">
                <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-50 animate-pulse"></div>
                <h1 className="relative text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-orange-500 tracking-tighter leading-none" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  AMAZING!
                </h1>
              </div>
            </div>

            {/* Prize Display - No container */}
            <div className="flex flex-col items-center gap-8 mb-12 animate-in slide-in-from-bottom duration-1000 delay-300">
              {/* Prize Icon/Image - Animated */}
              <div className="relative flex-shrink-0 animate-bounce-slow">
                <div className="relative w-40 h-40 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl animate-wiggle">
                  {prize?.imageUrl ? (
                    <img src={prize.imageUrl} className="w-full h-full object-cover rounded-3xl" alt={prizeName} />
                  ) : (
                    React.createElement(prizeIcon, { className: "text-white", size: 80, fill: "currentColor" })
                  )}
                </div>
                {/* Claim badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-pink-500 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center font-black text-lg border-4 border-black shadow-lg animate-bounce">
                  #{timesClaimed}
                </div>
              </div>

              {/* Prize Info */}
              <div className="text-center">
                <p className="text-yellow-300 text-sm font-bold uppercase tracking-widest mb-3">You Earned</p>
                <h2 className="text-5xl md:text-6xl font-black text-white mb-3 leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                  {prizeName}
                </h2>
                <p className="text-slate-300 text-lg">Keep up the amazing work! 🎉</p>
              </div>
            </div>

            {/* Action Button - Match egg modal style */}
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white font-black text-xl py-4 px-12 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.6)] active:scale-95 transition-all border-4 border-white/30 animate-in slide-in-from-bottom duration-1000 delay-500"
            >
              COLLECT REWARD!
            </button>

          </div>
        )}

      </div>
    </div>
  );
};


const FeedbackPopup = ({ visible, message = 'XP Added!' }: any) => visible ? <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-900 px-6 py-2 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.5)] z-[100] animate-in fade-in zoom-in duration-300 border border-white/20">{message}</div> : null;



// --- MAIN APP ---
export default function App() {
  const [familyId, setFamilyId] = useState<string | null>(localStorage.getItem('family_id'));
  const isAndroid = Capacitor.getPlatform() === 'android';
  // Load initial state from LocalStorage if available
  const [behaviors, setBehaviors] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('toddler_app_behaviors');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });

  const [settings, setSettings] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('toddler_app_settings');
      if (saved) return JSON.parse(saved);
    }
    return {
      grandPrizes: [
        { id: 1, name: 'Ice Cream Treat', goal: 5, active: true, timesClaimed: 0, imageUrl: '/prize-1.jpg' },
        { id: 2, name: 'Pizza Party', goal: 10, active: true, timesClaimed: 0, imageUrl: '/prize-2.jpg' },
        { id: 3, name: 'Movie Night', goal: 20, active: true, timesClaimed: 0, imageUrl: '/prize-3.jpg' },
        { id: 4, name: 'Zoo Trip', goal: 30, active: true, timesClaimed: 0, imageUrl: '/prize-4.jpg' }
      ],
      wheelPrizes: ['Sticker', 'Treat', 'Story', 'Hug', 'Song'],
      spentPoints: 0,
      streak: 0,
      lastVisit: null
    };
  });

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('toddler_app_behaviors', JSON.stringify(behaviors));
  }, [behaviors]);

  useEffect(() => {
    localStorage.setItem('toddler_app_settings', JSON.stringify(settings));
  }, [settings]);

  const [_loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');
  const [customPrompt, setCustomPrompt] = useState('');
  const [toast, setToast] = useState<{ visible: boolean, message: string } | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showPrizeForm, setShowPrizeForm] = useState(false);
  const [barScale, setBarScale] = useState(1);

  // UI State
  const [showWheel, setShowWheel] = useState(false);

  const [feedback, setFeedback] = useState<any>({ visible: false });
  const [showConfetti, setShowConfetti] = useState(false);
  const [showGrandCelebration, setShowGrandCelebration] = useState(false);
  const [grandPrizeName, setGrandPrizeName] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', goal: 5, icon: 'star', colorIndex: 0 });
  const [newGrandPrize, setNewGrandPrize] = useState({ name: '', goal: 10, repeatable: true, imageUrl: '' });
  const [editingGrandPrize, setEditingGrandPrize] = useState<any>(null);
  const [newPrize, setNewPrize] = useState('');
  const [_animateBar, setAnimateBar] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const confettiRef = useRef<ConfettiHandle>(null); // Ref for ConfettiSystem

  // Auth & Data
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    signInAnonymously(auth).catch(console.error);
    const unsubAuth = onAuthStateChanged(auth, u => {
      if (!u) setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Firebase Sync (Optional - only if configured)
  useEffect(() => {
    if (!familyId || !db) {
      // If no Firebase, ensure we have at least some demo data if empty
      if (behaviors.length === 0) {
        const demoTasks = [
          { id: '1', name: 'Clean Your Room', goal: 5, count: 2, icon: 'star', completions: 0, lifetimeStars: 8 },
          { id: '2', name: 'Brush Your Teeth', goal: 3, count: 1, icon: 'smile', completions: 2, lifetimeStars: 12 },
          { id: '3', name: 'Eat Your Vegetables', goal: 4, count: 0, icon: 'utensils', completions: 1, lifetimeStars: 6 },
          { id: '4', name: 'Help with Dishes', goal: 5, count: 4, icon: 'heart', completions: 0, lifetimeStars: 4 },
        ];
        // Only set if we really have nothing (first run)
        const saved = localStorage.getItem('toddler_app_behaviors');
        if (!saved) setBehaviors(demoTasks);
      }
      setLoading(false);
      return;
    }

    const unsubB = onSnapshot(collection(db, 'families', familyId, 'behaviors'), snap => {
      setBehaviors(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
      setLoading(false);
    });
    const unsubS = onSnapshot(doc(db, 'families', familyId, 'config', 'main'), snap => {
      if (snap.exists()) setSettings((prev: any) => ({ ...prev, ...snap.data() }));
    });
    return () => { unsubB(); unsubS(); };
  }, [familyId]);

  const totalRewards = useMemo(() => {
    return behaviors.reduce((acc, b) => acc + (b.lifetimeStars || 0), 0);
  }, [behaviors]);




  // Migration: Fix lastClaimedAt if it exceeds totalRewards (due to unit change)
  useEffect(() => {
    if (!settings.grandPrizes) return;
    const needsFix = settings.grandPrizes.some((p: any) => (p.lastClaimedAt || 0) > totalRewards);
    if (needsFix) {
      const fixedPrizes = settings.grandPrizes.map((p: any) =>
        (p.lastClaimedAt || 0) > totalRewards ? { ...p, lastClaimedAt: totalRewards } : p
      );
      setSettings((prev: any) => ({ ...prev, grandPrizes: fixedPrizes }));
      if (db && familyId) {
        updateDoc(doc(db, 'families', familyId, 'config', 'main'), { grandPrizes: fixedPrizes });
      }
    }
  }, [totalRewards, settings.grandPrizes, db, familyId]);

  // --- STREAK LOGIC ---
  useEffect(() => {
    if (!familyId) return;
    const now = new Date();
    const lastVisit = settings.lastVisit ? new Date(settings.lastVisit) : null;

    if (lastVisit) {
      const isSameDay = now.toDateString() === lastVisit.toDateString();
      if (!isSameDay) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = yesterday.toDateString() === lastVisit.toDateString();

        const newStreak = isYesterday ? (settings.streak || 0) + 1 : 1;
        setSettings((prev: any) => ({ ...prev, streak: newStreak, lastVisit: now.toISOString() }));
        if (db) updateDoc(doc(db, 'families', familyId, 'config', 'main'), { streak: newStreak, lastVisit: now.toISOString() });
      }
    } else {
      setSettings((prev: any) => ({ ...prev, streak: 1, lastVisit: now.toISOString() }));
      if (db) updateDoc(doc(db, 'families', familyId, 'config', 'main'), { streak: 1, lastVisit: now.toISOString() });
    }
  }, [familyId]);

  // --- FLYING STARS ---
  const [flyingStars, setFlyingStars] = useState<any[]>([]);
  const targetRef = useRef<HTMLDivElement>(null);

  const handleStarAnimation = (startX: number, startY: number) => {
    if (!targetRef.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2 - 20;


    setFlyingStars(prev => [...prev, { id: Date.now(), x: startX, y: startY, targetX, targetY }]);
    setTimeout(() => {
      setFlyingStars(prev => prev.slice(1));
      // Trigger bar effect when star lands (2.5s duration)
      setBarScale(1.1);
      setTimeout(() => setBarScale(1), 2500);
    }, 1500);
  };

  const prevTotal = useRef(totalRewards);
  useEffect(() => {
    if (totalRewards > prevTotal.current) { setAnimateBar(true); setTimeout(() => setAnimateBar(false), 1000); }
    prevTotal.current = totalRewards;
  }, [totalRewards]);

  // --- HANDLERS ---
  const handleLogin = (code: string) => { localStorage.setItem('family_id', code); setFamilyId(code); };
  const handleLogout = () => { if (confirm("Sign out?")) { localStorage.removeItem('family_id'); setFamilyId(null); setBehaviors([]); } };

  const handleAIGenerate = async (type: 'goal' | 'grand_prize' | 'egg_prize') => {
    if (_loading) return;
    setLoading(true);
    try {
      let prompt = '';
      if (type === 'goal') {
        const userContext = customPrompt.trim() ? `Focus on this area: "${customPrompt}". ` : '';
        prompt = `${userContext}List 5 age-appropriate chores or behavioral goals for a toddler (ages 2-5). Return a JSON array of objects with keys: "name" (short title, max 4 words), "icon" (one of: star, smile, heart, zap, moon, sun, utensils, trophy, award, gift), "goal" (recommended stars number 3-8). Output ONLY valid JSON.`;
      }
      if (type === 'grand_prize') prompt = `List 5 exciting 'Grand Prizes' for a toddler reward chart (e.g., Pizza Party, Zoo Trip, New Toy). Return a JSON array of objects with keys: "name" (short title), "goal" (points 10-50). Output ONLY valid JSON.`;
      if (type === 'egg_prize') prompt = `List 5 small, instant rewards for a 'Surprise Egg' (e.g., Sticker, Hug, 1 TV Show, Chocolate). Return a JSON array of strings. Output ONLY valid JSON.`;

      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!API_KEY) {
        alert("Missing API Key! Please create a .env file with VITE_GEMINI_API_KEY=your_key");
        setLoading(false);
        return;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;
        const suggestions = JSON.parse(jsonStr);
        setFeedback({ visible: true, message: 'Ideas Generated!', type: type, data: suggestions });
        setToast({ visible: true, message: 'Ideas Generated!' });
        setTimeout(() => setToast(null), 2000);
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (prompt: string, isEditing: boolean) => {
    if (_loading || !prompt.trim()) return;
    setLoading(true);
    try {
      // Using Pollinations.ai for instant, free image generation
      const encodedPrompt = encodeURIComponent(prompt + " 3d render cute cartoon style high quality");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Math.random()}`;

      // Pre-load to ensure it exists
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        if (isEditing) {
          setEditingGrandPrize((prev: any) => ({ ...prev, imageUrl }));
        } else {
          setNewGrandPrize((prev: any) => ({ ...prev, imageUrl }));
        }
        setLoading(false);
      };
      img.onerror = () => {
        alert("Failed to generate image");
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const updateCount = async (behavior: any, delta: number, e?: React.MouseEvent) => {
    if (!familyId) return;
    if (e && delta > 0) {
      if (confettiRef.current) confettiRef.current.burst(e.clientX, e.clientY);
      handleStarAnimation(e.clientX, e.clientY);
    }
    const newCount = Math.max(0, (behavior.count || 0) + delta);
    if (delta > 0 && newCount > behavior.goal) return;

    if (delta > 0 && newCount === behavior.goal) {
      SOUNDS.success();
      setFeedback({ visible: true, message: 'Goal Reached! 🎉' });
      setTimeout(() => setFeedback({ visible: false }), 2000);

      if (!db) {
        setBehaviors(behaviors.map(b => b.id === behavior.id ? { ...b, count: newCount, lifetimeStars: (b.lifetimeStars || 0) + 1 } : b));
      } else {
        await updateDoc(doc(db, 'families', familyId, 'behaviors', behavior.id), { count: newCount, lifetimeStars: increment(1) });
      }
    } else if (delta > 0) {
      SOUNDS.star();
      if (!db) {
        setBehaviors(behaviors.map(b => b.id === behavior.id ? { ...b, count: newCount, lifetimeStars: (b.lifetimeStars || 0) + 1 } : b));
      } else {
        await updateDoc(doc(db, 'families', familyId, 'behaviors', behavior.id), { count: newCount, lifetimeStars: increment(1) });
      }
    } else {
      if (!db) {
        setBehaviors(behaviors.map(b => b.id === behavior.id ? { ...b, count: newCount } : b));
      } else {
        await updateDoc(doc(db, 'families', familyId, 'behaviors', behavior.id), { count: newCount });
      }
    }
  };

  const claimReward = async (behavior: any) => {
    // Reset the behavior count and show prize wheel
    SOUNDS.success();

    // Show the prize wheel
    setShowWheel(true);

    // Reset the behavior count
    if (!db) {
      setBehaviors(behaviors.map(b =>
        b.id === behavior.id
          ? { ...b, count: 0, completions: (b.completions || 0) + 1 }
          : b
      ));
    } else if (familyId) {
      await updateDoc(doc(db, 'families', familyId, 'behaviors', behavior.id), {
        count: 0,
        completions: increment(1)
      });
    }
  };

  const claimGrandPrize = (prize: any) => {
    SOUNDS.grand();
    setGrandPrizeName(prize.name);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000);
    setShowGrandCelebration(true);
  };



  const updateGrandPrize = (prizeId: string, updates: any) => {
    const updated = settings.grandPrizes.map((x: any) => x.id === prizeId ? { ...x, ...updates } : x);
    if (db && familyId) setDoc(doc(db, 'families', familyId, 'config', 'main'), { ...settings, grandPrizes: updated });
    setSettings({ ...settings, grandPrizes: updated });
  };

  const toggleFeature = (prizeId: string) => {
    const newId = settings.featuredPrizeId === prizeId ? null : prizeId;
    const newSettings = { ...settings, featuredPrizeId: newId };
    setSettings(newSettings);
    if (db && familyId) setDoc(doc(db, 'families', familyId, 'config', 'main'), newSettings);
  };

  const saveBehavior = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      // If Firebase is not configured, work in local-only mode
      if (!db || !familyId) {
        console.log('Working in local-only mode (no Firebase)');

        if (editingId) {
          // Update existing behavior in local state
          setBehaviors(behaviors.map(b =>
            b.id === editingId ? { ...b, ...formData } : b
          ));
        } else {
          // Add new behavior to local state
          const newBehavior = {
            id: Date.now().toString(),
            ...formData,
            count: 0,
            completions: 0,
            createdAt: new Date()
          };
          setBehaviors([...behaviors, newBehavior]);
        }

        // setView('dashboard'); // Don't close settings automatically
        setEditingId(null);
        setShowGoalForm(false);
        setFormData({ name: '', goal: 5, icon: 'star', colorIndex: 0 });
        return;
      }

      // Firebase mode
      const ref = collection(db, 'families', familyId, 'behaviors');
      if (editingId) {
        await updateDoc(doc(ref, editingId), { ...formData });
      } else {
        await addDoc(ref, { ...formData, count: 0, completions: 0, createdAt: serverTimestamp() });
      }
      setEditingId(null);
      setShowGoalForm(false);
      setFormData({ name: '', goal: 5, icon: 'star', colorIndex: 0 });
    } catch (error) {
      console.error('Error saving behavior:', error);
      alert('Failed to save goal. Please try again.');
    }
  };

  const deleteBehavior = async (id?: string) => {
    const behaviorId = id || editingId;
    if (!behaviorId || !confirm("Delete this goal?")) return;

    // If Firebase is not configured, work in local-only mode
    if (!db || !familyId) {
      console.log('Deleting in local-only mode');
      setBehaviors(behaviors.filter(b => b.id !== behaviorId));
      if (!id) setView('dashboard'); // Only redirect if called from form
      return;
    }

    // Firebase mode
    await deleteDoc(doc(db, 'families', familyId, 'behaviors', behaviorId));
    if (!id) setView('dashboard'); // Only redirect if called from form
  };

  // const saveSettings = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!familyId) return;
  //   await setDoc(doc(db, 'families', familyId, 'config', 'main'), settings);
  //   setView('dashboard');
  // };

  const addGrandPrize = () => {
    if (newGrandPrize.name && newGrandPrize.goal > 0) {
      // Avoid repeating the same image as the last added prize
      const lastPrize = settings.grandPrizes?.[settings.grandPrizes.length - 1];
      let lastIndex = -1;
      if (lastPrize?.imageUrl) {
        const match = lastPrize.imageUrl.match(/prize-(\d+)\.jpg/);
        if (match) lastIndex = parseInt(match[1]);
      }

      let randomImageIndex;
      // Try to find a different image, but don't loop forever if there's only 1 option (unlikely here with 8)
      let attempts = 0;
      do {
        randomImageIndex = Math.floor(Math.random() * 8) + 1;
        attempts++;
      } while (randomImageIndex === lastIndex && attempts < 10);



      // Use generated image if available, otherwise random
      const imageUrl = newGrandPrize.imageUrl || `/prize-${randomImageIndex}.jpg`;

      const newPrize = {
        id: Date.now().toString(),
        ...newGrandPrize,
        active: true,
        imageUrl: imageUrl,
        lastClaimedAt: totalRewards // Start progress at 0
      };
      setSettings({ ...settings, grandPrizes: [...(settings.grandPrizes || []), newPrize] });
      setNewGrandPrize({ name: '', goal: 10, repeatable: true, imageUrl: '' });
      setShowPrizeForm(false);
    }
  };
  // const removeGrandPrize = (id: string) => {
  //   if(!confirm("Remove?")) return;
  //   setSettings({...settings, grandPrizes: (settings.grandPrizes || []).filter((p:any) => p.id !== id) });
  // };
  // const toggleGrandPrize = (id: string) => {
  //    setSettings({...settings, grandPrizes: (settings.grandPrizes || []).map((p:any) => p.id === id ? {...p, active: !p.active } : p) });
  // };
  const addWheelPrize = () => { if (newPrize.trim()) { setSettings((prev: any) => ({ ...prev, wheelPrizes: [...(prev.wheelPrizes || []), newPrize.trim()] })); setNewPrize(''); } };
  const removeWheelPrize = (idx: number) => { setSettings((prev: any) => ({ ...prev, wheelPrizes: (prev.wheelPrizes || []).filter((_: any, i: number) => i !== idx) })); };

  if (!familyId) return <Onboarding onLogin={handleLogin} />;
  if (showTutorial) return <Tutorial onComplete={() => setShowTutorial(false)} />;

  return (
    <div className="min-h-screen bg-slate-950 font-sans pb-24 select-none overflow-x-hidden text-slate-200 relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>
      <Confetti active={showConfetti} />


      <GrandCelebrationOverlay
        visible={showGrandCelebration}
        prizeName={grandPrizeName}
        settings={settings}
        onClose={() => setShowGrandCelebration(false)}
        onReset={async () => {
          // Find the prize that was just claimed and increment its timesClaimed counter
          const claimedPrize = settings.grandPrizes.find((p: any) => p.name === grandPrizeName);
          if (claimedPrize) {
            const updatedPrizes = settings.grandPrizes.map((p: any) =>
              p.id === claimedPrize.id ? { ...p, lastClaimedAt: totalRewards, active: p.repeatable !== false } : p
            );

            setSettings({ ...settings, grandPrizes: updatedPrizes });

            // Save to Firebase if available
            if (db && familyId) {
              await setDoc(doc(db, 'families', familyId, 'config', 'main'), {
                ...settings,
                grandPrizes: updatedPrizes
              });
            }
          }
        }}
      />
      {/* Prize Wheel / Surprise Egg Modal */}
      {showWheel && (
        <SurpriseEggModal
          prizes={settings.wheelPrizes}
          settings={settings}
          onClose={() => setShowWheel(false)}
          onWin={(prize: string) => {
            // Optional: Add logic if needed when prize is won
            console.log('Won:', prize);

            // setShowWheel(false); // Don't close immediately, let user click 'Collect'
          }}
        />
      )}

      <FeedbackPopup visible={toast?.visible} message={toast?.message} />

      <header className="fixed top-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] flex justify-between items-center z-50 shadow-lg border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogout}>
            <img src="/mascot.png" alt="avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-black text-xl text-white tracking-tight">Hello, {familyId}!</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/50 px-2 py-0.5 rounded-full">
                <Flame size={12} className="text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-[10px] font-bold text-orange-200 uppercase tracking-wider">{settings.streak || 1} Day Streak</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setView(view === 'settings' ? 'dashboard' : 'settings')} className="p-3 rounded-full bg-slate-900/50 border border-white/10 text-white hover:bg-slate-800 transition-colors"><Settings size={20} /></button>
        </div>
      </header>

      <div className={`max-w-5xl mx-auto p-4 relative z-10 ${view === 'dashboard' ? (isAndroid ? 'pt-[540px]' : 'pt-[380px]') : (isAndroid ? 'pt-52' : 'pt-32')}`}>
        {/* Dashboard */}
        {view === 'dashboard' && (
          <div className="p-4 max-w-md mx-auto pb-32">
            <div className={`fixed ${isAndroid ? 'top-[160px]' : 'top-[88px]'} left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl pb-4 px-4 pt-2 shadow-xl border-b border-white/5 mb-4`}>
              <div className="max-w-md mx-auto">
                <NextPrizeCard totalRewards={totalRewards} settings={settings} targetRef={targetRef} onUpdatePrize={updateGrandPrize} scale={barScale} />
              </div>
            </div>
            <GiftBoxSection
              prizes={settings.grandPrizes}
              totalRewards={totalRewards}
              onClaimPrize={claimGrandPrize}
              onFeature={toggleFeature}
              featuredId={settings.featuredPrizeId}
            />

            <div>
              <div className="flex justify-between items-end mb-4 px-2">
                <h3 className="text-white font-bold text-xl tracking-tight">Active Missions</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {behaviors.map(b => (
                  <GoalListItem
                    key={b.id}
                    behavior={b}
                    onUpdate={updateCount}
                    onClaim={claimReward}
                    onDelete={deleteBehavior}
                    onEdit={(b: any) => { setEditingId(b.id); setFormData({ name: b.name, goal: b.goal, icon: b.icon, colorIndex: b.colorIndex }); setView('settings'); }}
                  />
                ))}
              </div>
              {/* Add New Goal Button */}
              <button
                onClick={() => { setEditingId(null); setFormData({ name: '', goal: 5, icon: 'star', colorIndex: 0 }); setView('settings'); }}
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Settings size={20} />
                <span>Manage Goals & Settings</span>
              </button>
            </div>
          </div>
        )}
        {view === 'settings' && (
          <div className="p-4 max-w-md mx-auto space-y-6">
            {/* Settings Header */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-white">Settings</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowTutorial(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2">
                  <HelpCircle size={18} />
                  <span>Help</span>
                </button>
                <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl font-bold transition-colors">
                  Sign Out
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 shadow-lg mb-8">
              <h3 className="font-bold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs"><Star size={16} /> Manage Goals</h3>

              {/* Current Goals List */}
              {!showGoalForm && !editingId && (
                <div className="space-y-3 mb-6">
                  {behaviors.map(b => (
                    <div key={b.id} className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:border-blue-500/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GRADIENTS[b.colorIndex % GRADIENTS.length]} flex items-center justify-center shadow-lg`}>
                          {React.createElement(ICON_MAP[b.icon] || Star, { size: 24, className: 'text-white' })}
                        </div>
                        <div>
                          <p className="font-bold text-white">{b.name}</p>
                          <p className="text-xs text-slate-400">{b.goal} Stars</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingId(b.id); setFormData({ name: b.name, goal: b.goal, icon: b.icon, colorIndex: b.colorIndex }); }} className="p-2 rounded-lg text-blue-400 hover:bg-blue-900/20 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => deleteBehavior(b.id)} className="p-2 rounded-lg text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => { setShowGoalForm(true); setEditingId(null); setFormData({ name: '', goal: 5, icon: 'star', colorIndex: 0 }); }}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    <span>Add New Goal</span>
                  </button>
                </div>
              )}

              {/* Goal Form (New or Edit) */}
              {(showGoalForm || editingId) && (
                <div className="animate-in slide-in-from-bottom duration-300 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-white">{editingId ? 'Edit Goal' : 'New Goal'}</h4>
                    <button onClick={() => { setShowGoalForm(false); setEditingId(null); }} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full"><X size={16} /></button>
                  </div>

                  {/* AI Suggestion Button for Goals */}
                  {!editingId && (
                    <div className="mb-6 space-y-2">
                      <input
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="What do you want to work on? (e.g. Manners)"
                        className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 text-white text-sm focus:border-blue-500 outline-none placeholder:text-slate-600"
                      />
                      <button
                        onClick={() => handleAIGenerate('goal')}
                        className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 p-3 rounded-xl font-bold border border-blue-500/20 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Sparkles size={16} />
                        <span>Suggest Goals</span>
                      </button>
                    </div>
                  )}

                  {/* Suggestions List */}
                  {feedback.type === 'goal' && feedback.visible && (
                    <div className="mb-6 relative bg-slate-900 p-4 rounded-xl border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-blue-400 uppercase">AI Suggestions</span>
                        <button onClick={() => setFeedback({ ...feedback, visible: false })} className="text-slate-400 hover:text-white"><X size={16} /></button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-top">
                        {feedback.data.map((s: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setFormData({ name: s.name, goal: s.goal, icon: s.icon, colorIndex: Math.floor(Math.random() * 5) });
                              setFeedback({ visible: false });
                            }}
                            className="bg-slate-950 p-3 rounded-xl text-left flex items-center gap-3 hover:bg-slate-800 transition-colors border border-white/5"
                          >
                            <div className="p-2 bg-slate-900 rounded-lg text-xl">
                              {s.icon === 'star' ? '⭐' : s.icon === 'heart' ? '❤️' : s.icon === 'utensils' ? '🍽️' : '✨'}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{s.name}</div>
                              <div className="text-slate-400 text-xs">{s.goal} Stars</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Name</label>
                      <input className="w-full p-4 bg-slate-900 rounded-xl border border-white/10 text-lg text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" placeholder="e.g. Clean Room" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Stars Required</label>
                        <span className="text-[10px] text-slate-400 font-medium">Require more stars for easier tasks</span>
                      </div>
                      <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-white/10">
                        <input type="range" min="3" max="10" value={formData.goal} onChange={e => setFormData({ ...formData, goal: parseInt(e.target.value) })} className="flex-1 accent-blue-500" />
                        <span className="font-black text-2xl text-blue-400 w-10 text-center">{formData.goal}</span>
                      </div>
                    </div>

                    {/* Icon Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Icon</label>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.entries(ICON_MAP).map(([key, IconComponent]: any) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setFormData({ ...formData, icon: key })}
                            className={`p-3 rounded-xl border-2 transition-all ${formData.icon === key ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-slate-900 hover:border-blue-400/50'}`}
                          >
                            <IconComponent size={24} className={formData.icon === key ? 'text-blue-400' : 'text-slate-400'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Color</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { index: 0, label: 'Pink', gradient: 'from-pink-500 to-rose-500' },
                          { index: 1, label: 'Purple', gradient: 'from-purple-500 to-indigo-500' },
                          { index: 2, label: 'Blue', gradient: 'from-blue-500 to-cyan-500' },
                          { index: 3, label: 'Green', gradient: 'from-green-500 to-emerald-500' },
                          { index: 4, label: 'Orange', gradient: 'from-yellow-500 to-orange-500' },
                          { index: 5, label: 'Red', gradient: 'from-red-500 to-pink-500' },
                        ].map((color) => (
                          <button
                            key={color.index}
                            type="button"
                            onClick={() => setFormData({ ...formData, colorIndex: color.index })}
                            className={`p-4 rounded-xl bg-gradient-to-br ${color.gradient} transition-all ${formData.colorIndex === color.index ? 'ring-4 ring-blue-400 scale-105' : 'opacity-70 hover:opacity-100'}`}
                          >
                            <span className="text-white font-bold text-xs">{color.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => { setShowGoalForm(false); setEditingId(null); setFormData({ name: '', goal: 5, icon: 'star', colorIndex: 0 }); }}
                        className="flex-1 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      {editingId && <button onClick={() => deleteBehavior()} className="flex-1 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/20 transition-all">Delete</button>}
                      <button onClick={saveBehavior} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all">Save Mission</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 shadow-lg mb-8">
              <h3 className="font-bold text-purple-400 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs"><Gift size={16} /> Grand Prizes</h3>





              <div className="space-y-3 mb-6">
                {(settings.grandPrizes || []).map((p: any) => (
                  <div key={p.id} className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-colors">
                    {editingGrandPrize?.id === p.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingGrandPrize.name}
                          onChange={e => setEditingGrandPrize({ ...editingGrandPrize, name: e.target.value })}
                          className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 text-white text-sm focus:border-purple-500 outline-none"
                          placeholder="Prize Name"
                        />
                        <div className="flex flex-col gap-2">
                          <input
                            type="number"
                            value={editingGrandPrize.goal}
                            onChange={e => setEditingGrandPrize({ ...editingGrandPrize, goal: parseInt(e.target.value) || 0 })}
                            className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 text-white text-sm text-center focus:border-purple-500 outline-none"
                            placeholder="Points"
                          />

                          {/* Image Preview & Gen */}
                          <div className="relative h-32 rounded-xl overflow-hidden bg-slate-900 border border-white/10 group">
                            {editingGrandPrize.imageUrl && <img src={editingGrandPrize.imageUrl} className="w-full h-full object-cover" />}
                            <button
                              onClick={() => handleGenerateImage(editingGrandPrize.name, true)}
                              disabled={_loading}
                              className={`absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-white gap-2 transition-all ${_loading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                              {_loading ? <Loader2 size={24} className="animate-spin text-purple-400" /> : <ImageIcon size={20} />}
                              {_loading ? 'Generating...' : 'Regenerate Image'}
                            </button>
                            {!editingGrandPrize.imageUrl && !_loading && (
                              <button
                                onClick={() => handleGenerateImage(editingGrandPrize.name, true)}
                                className="absolute inset-0 flex items-center justify-center font-bold text-purple-400 gap-2"
                              >
                                <Sparkles size={20} /> Generate Image
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-white/10">
                            <span className="text-xs font-bold text-slate-400 uppercase">Repeatable?</span>
                            <button
                              onClick={() => setEditingGrandPrize({ ...editingGrandPrize, repeatable: !editingGrandPrize.repeatable })}
                              className={`transition-colors ${editingGrandPrize.repeatable !== false ? 'text-green-400' : 'text-slate-600'}`}
                            >
                              {editingGrandPrize.repeatable !== false ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                updateGrandPrize(p.id, { name: editingGrandPrize.name, goal: editingGrandPrize.goal, repeatable: editingGrandPrize.repeatable, imageUrl: editingGrandPrize.imageUrl });
                                setEditingGrandPrize(null);
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingGrandPrize(null)}
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Gift className="text-white" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{p.name}</p>
                          <p className="text-xs text-slate-400">Goal: {p.goal} points{p.timesClaimed > 0 ? ` • Claimed ${p.timesClaimed}x` : ''}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingGrandPrize({ ...p })}
                            className="p-2 rounded-lg text-purple-400 hover:bg-purple-900/20 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              const updated = settings.grandPrizes.map((x: any) => x.id === p.id ? { ...x, active: !x.active } : x);
                              if (db && familyId) setDoc(doc(db, 'families', familyId, 'config', 'main'), { ...settings, grandPrizes: updated });
                              setSettings({ ...settings, grandPrizes: updated });
                            }}
                            className={`p-2 rounded-lg transition-colors ${p.active ? 'text-green-400 bg-green-900/20' : 'text-slate-600 bg-slate-800'}`}
                            title={p.active ? 'Active' : 'Inactive'}
                          >
                            {p.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => {
                              const updated = settings.grandPrizes.filter((x: any) => x.id !== p.id);
                              if (db && familyId) setDoc(doc(db, 'families', familyId, 'config', 'main'), { ...settings, grandPrizes: updated });
                              setSettings({ ...settings, grandPrizes: updated });
                            }}
                            className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {!showPrizeForm && (
                  <button
                    onClick={() => setShowPrizeForm(true)}
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={20} />
                    <span>Add New Prize</span>
                  </button>
                )}

                {showPrizeForm && (
                  <div className="animate-in slide-in-from-bottom duration-300 bg-slate-950/50 p-4 rounded-2xl border border-white/5 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-white">New Grand Prize</h4>
                      <button onClick={() => setShowPrizeForm(false)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full"><X size={16} /></button>
                    </div>

                    <button
                      onClick={() => handleAIGenerate('grand_prize')}
                      className="w-full mb-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 p-3 rounded-xl font-bold border border-purple-500/20 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Sparkles size={16} />
                      <span>Suggest Grand Prizes</span>
                    </button>

                    {feedback.type === 'grand_prize' && feedback.visible && (
                      <div className="mb-6 relative bg-slate-900 p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-purple-400 uppercase">AI Suggestions</span>
                          <button onClick={() => setFeedback({ ...feedback, visible: false })} className="text-slate-400 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-top">
                          {feedback.data.map((s: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => {
                                setNewGrandPrize({ name: s.name, goal: s.goal, repeatable: true, imageUrl: '' });
                                setFeedback({ visible: false });
                              }}
                              className="bg-slate-950 p-3 rounded-xl text-left flex items-center gap-3 hover:bg-slate-800 transition-colors border border-white/5"
                            >
                              <div className="p-2 bg-slate-900 rounded-lg text-xl">🎁</div>
                              <div>
                                <div className="font-bold text-white text-sm">{s.name}</div>
                                <div className="text-slate-400 text-xs">{s.goal} Points</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <input
                        placeholder="Prize Name"
                        className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 text-sm text-white focus:border-purple-500 outline-none"
                        value={newGrandPrize.name}
                        onChange={e => setNewGrandPrize({ ...newGrandPrize, name: e.target.value })}
                      />
                      <input
                        type="number"
                        placeholder="Points Goal"
                        className="w-full bg-slate-900 p-3 rounded-xl border border-white/10 text-sm text-white text-center focus:border-purple-500 outline-none"
                        value={newGrandPrize.goal}
                        onChange={e => setNewGrandPrize({ ...newGrandPrize, goal: parseInt(e.target.value) || 0 })}
                      />

                      {/* Image Preview & Gen */}
                      <div className="relative h-32 rounded-xl overflow-hidden bg-slate-900 border border-white/10 group">
                        {newGrandPrize.imageUrl && <img src={newGrandPrize.imageUrl} className="w-full h-full object-cover" />}
                        <button
                          onClick={() => handleGenerateImage(newGrandPrize.name, false)}
                          disabled={_loading}
                          className={`absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-white gap-2 transition-all ${_loading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          {_loading ? <Loader2 size={24} className="animate-spin text-purple-400" /> : <ImageIcon size={20} />}
                          {_loading ? 'Generating...' : 'Regenerate Image'}
                        </button>
                        {!newGrandPrize.imageUrl && !_loading && (
                          <button
                            onClick={() => handleGenerateImage(newGrandPrize.name, false)}
                            className="absolute inset-0 flex items-center justify-center font-bold text-purple-400 gap-2"
                          >
                            <Sparkles size={20} /> Generate Image
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-white/10">
                        <span className="text-xs font-bold text-slate-400 uppercase">Repeatable?</span>
                        <button
                          onClick={() => setNewGrandPrize({ ...newGrandPrize, repeatable: !newGrandPrize.repeatable })}
                          className={`transition-colors ${newGrandPrize.repeatable !== false ? 'text-green-400' : 'text-slate-600'}`}
                        >
                          {newGrandPrize.repeatable !== false ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                      </div>
                      <button
                        onClick={addGrandPrize}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2"
                      >
                        Add Prize
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl border border-white/10 p-6 shadow-lg">
              <h3 className="font-bold text-pink-400 mb-4 flex items-center gap-2 uppercase tracking-wider text-xs"><Gift size={16} /> Egg Prizes</h3>

              <button
                onClick={() => handleAIGenerate('egg_prize')}
                className="w-full mb-4 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 p-3 rounded-xl font-bold border border-pink-500/20 flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles size={16} />
                <span>Suggest Egg Prizes</span>
              </button>

              {feedback.type === 'egg_prize' && feedback.visible && (
                <div className="mb-6 grid grid-cols-1 gap-2 animate-in slide-in-from-top">
                  {feedback.data.map((s: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => {
                        setNewPrize(s);
                        setFeedback({ visible: false });
                      }}
                      className="bg-slate-950 p-3 rounded-xl text-left flex items-center gap-3 hover:bg-slate-800 transition-colors border border-white/5"
                    >
                      <div className="p-2 bg-slate-900 rounded-lg text-xl">🥚</div>
                      <div className="font-bold text-white text-sm">{s}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <input className="flex-1 p-3 rounded-xl border border-white/10 bg-slate-950 text-white text-sm focus:border-yellow-500 outline-none" placeholder="New Prize" value={newPrize} onChange={e => setNewPrize(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWheelPrize())} />
                <button type="button" onClick={addWheelPrize} className="bg-yellow-500 text-white px-4 rounded-xl font-bold text-lg hover:bg-yellow-600 transition-all active:scale-95">+</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(settings.wheelPrizes || []).map((p: any, i: number) => (
                  <span key={i} className="bg-slate-950 border border-white/10 px-3 py-1.5 rounded-lg text-sm text-slate-700 flex items-center gap-2 shadow-sm">
                    {p} <button type="button" onClick={() => removeWheelPrize(i)} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
                  </span>
                ))}
              </div>
            </div>

            <button onClick={() => setView('dashboard')} className="w-full mt-8 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg border border-white/10">
              Done / Save Settings
            </button>
          </div>
        )}

      </div>
      {/* Flying Stars Overlay */}
      {flyingStars.map(star => (
        <div
          key={star.id}
          className="flying-star"
          style={{
            '--start-x': `${star.x}px`,
            '--start-y': `${star.y}px`,
            '--target-x': `${star.targetX}px`,
            '--target-y': `${star.targetY}px`
          } as React.CSSProperties}
        >
          <Star size={32} fill="#FACC15" className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
        </div>
      ))}

      {/* Global Confetti System */}
      <ConfettiSystem ref={confettiRef} />
      <style>{`
        @keyframes explode { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(20); opacity: 0; } }
        .animate-explode { animation: explode 1s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes starParticleEnhanced { 0% { transform: translate(0,0) scale(0.5) rotate(0deg); opacity: 1; } 100% { transform: translate(calc(cos(var(--angle)) * var(--dist)), calc(sin(var(--angle)) * var(--dist))) scale(0) rotate(360deg); opacity: 0; } }
        .animate-star-particle-enhanced { animation: starParticleEnhanced 1.2s ease-out forwards; }
        @keyframes confettiPop { 
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 
          50% { opacity: 1; }
          100% { transform: translate(calc(cos(var(--angle)) * var(--dist) - 50%), calc(sin(var(--angle)) * var(--dist) - 50%)) scale(1) rotate(720deg); opacity: 0; } 
        }
        .animate-confetti-pop { animation: confettiPop 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 3s infinite; }
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        .animate-confetti-fall { animation: confetti-fall linear forwards; }
        @keyframes float-up { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-100vh); opacity: 0; } }
        .animate-float-up { animation: float-up linear forwards; }
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        @keyframes burst-out { 0% { transform: scale(0) translateY(0); opacity: 0; } 50% { opacity: 1; } 100% { transform: scale(1) translateY(-80px); opacity: 0; } }
        .animate-burst-out { animation: burst-out 1.5s ease-out forwards; }
        @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
        @keyframes float-particles { 0% { transform: translate(0, 0) scale(1); opacity: 0.5; } 50% { transform: translate(calc(random() * 20px), calc(random() * -20px)) scale(1.2); opacity: 1; } 100% { transform: translate(calc(random() * 40px), calc(random() * -40px)) scale(0.8); opacity: 0; } }
        .animate-float-particles { animation: float-particles linear infinite; }
        @keyframes shake-hard { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-15deg); } 75% { transform: rotate(15deg); } }
        .animate-shake-hard { animation: shake-hard 0.3s ease-in-out infinite; }
        @keyframes crack-appear { 0% { stroke-dasharray: 0, 1000; opacity: 0; } 100% { stroke-dasharray: 1000, 0; opacity: 1; } }
        .animate-crack-appear { animation: crack-appear 0.5s ease-out forwards; }
        @keyframes hatch-burst { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(2); opacity: 0; } }
        .animate-hatch-burst { animation: hatch-burst 0.5s ease-out forwards; }
        @keyframes float-up-reveal { 0% { transform: translateY(50px) scale(0); opacity: 0; } 60% { transform: translateY(-20px) scale(1.2); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .animate-float-up-reveal { animation: float-up-reveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes float-smooth { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes particle-burst { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(calc(-50% + var(--burst-x)), calc(-50% + var(--burst-y))) scale(0); opacity: 0; } }
        @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-3deg); } 75% { transform: rotate(3deg); } }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div >
  );
}

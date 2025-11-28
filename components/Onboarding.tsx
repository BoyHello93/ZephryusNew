
import React, { useState } from 'react';
import { Difficulty, User } from '../types';
import { Zap, BookOpen, Code2, Terminal, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  user: User;
  onComplete: (skillLevel: Difficulty) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [selectedLevel, setSelectedLevel] = useState<Difficulty | null>(null);

  const levels: { id: Difficulty; title: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'novice',
      title: 'Novice',
      desc: 'I have never written code before. Guide me step-by-step.',
      icon: <BookOpen size={24} />,
      color: 'from-emerald-400 to-emerald-600'
    },
    {
      id: 'beginner',
      title: 'Beginner',
      desc: 'I know the basics (HTML/CSS) but need help putting it together.',
      icon: <Code2 size={24} />,
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'intermediate',
      title: 'Intermediate',
      desc: 'I can build simple apps but want to learn modern frameworks.',
      icon: <Terminal size={24} />,
      color: 'from-purple-400 to-purple-600'
    },
    {
        id: 'advanced',
        title: 'Advanced',
        desc: 'I am a pro looking to speed up my workflow with AI.',
        icon: <Zap size={24} />,
        color: 'from-orange-400 to-orange-600'
    }
  ];

  return (
    <div className="h-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
       {/* Background */}
       <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pointer-events-none"></div>

       <div className="w-full max-w-2xl relative z-10">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-8 duration-700">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Hi, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">{user.username}</span></h1>
              <p className="text-slate-400 text-lg">To personalize your AI mentor, tell us about your coding experience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levels.map((level, idx) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={`
                        relative group overflow-hidden rounded-2xl p-6 text-left border transition-all duration-300
                        ${selectedLevel === level.id 
                            ? 'bg-slate-800 border-primary-500 ring-2 ring-primary-500/50 shadow-2xl scale-[1.02]' 
                            : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'}
                    `}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                      <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white
                          bg-gradient-to-br ${level.color} shadow-lg
                      `}>
                          {level.icon}
                      </div>
                      
                      <h3 className="text-xl font-bold text-white mb-2">{level.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{level.desc}</p>
                      
                      {selectedLevel === level.id && (
                          <div className="absolute top-4 right-4 bg-primary-500 rounded-full p-1 text-white animate-in zoom-in">
                              <Check size={16} />
                          </div>
                      )}
                  </button>
              ))}
          </div>

          <div className="mt-12 flex justify-end">
              <button
                disabled={!selectedLevel}
                onClick={() => selectedLevel && onComplete(selectedLevel)}
                className="bg-white text-slate-900 hover:bg-slate-200 px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 group"
              >
                  <span>Start Journey</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
       </div>
    </div>
  );
};

export default Onboarding;

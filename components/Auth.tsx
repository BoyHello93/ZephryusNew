import React, { useState } from 'react';
import { Zap, Mail, Lock, ArrowRight, Github, Loader2 } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
        if (isLogin) {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            // Successful login is handled by the onAuthStateChange listener in App.tsx
        } else {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;
            if (data.user) {
                // For immediate feedback
                onLogin({
                    id: data.user.id,
                    email: data.user.email || '',
                    username: data.user.email?.split('@')[0] || 'User',
                    isOnboarded: false
                });
            }
        }
    } catch (err: any) {
        setError(err.message || "Authentication failed");
        setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans p-4">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary-900/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/20 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 transform rotate-6">
                <Zap size={32} className="text-white fill-current" />
            </div>
        </div>

        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {isLogin ? 'Welcome Back' : 'Join Zephyrus AI'}
            </h1>
            <p className="text-slate-400 text-sm">
                {isLogin ? 'Enter your credentials to continue.' : 'Start your coding journey today.'}
            </p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-4 top-3.5 text-slate-500" />
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-slate-600"
                        placeholder="you@example.com"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                <div className="relative">
                    <Lock size={18} className="absolute left-4 top-3.5 text-slate-500" />
                    <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-slate-600"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4"
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                    <>
                        <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight size={18} />
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 text-center text-sm">
            <span className="text-slate-500">{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
            <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary-400 hover:text-primary-300 font-bold transition-colors"
            >
                {isLogin ? 'Sign Up' : 'Log In'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
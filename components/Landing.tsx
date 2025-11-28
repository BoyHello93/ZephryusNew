import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Code, Zap, Layers, Trash2, Settings as SettingsIcon, X, Terminal, Award, BookOpen, Clock, CheckCircle2, GraduationCap, AlignLeft, Palette, Pencil, RefreshCw, ChevronRight, FileCode, Cpu, LogOut } from 'lucide-react';
import { Course, AppSettings, Badge, Theme, DetailLevel } from '../types';
import { getSavedCourses, deleteCourseFromStorage, getSavedBadges } from '../services/storage';
import { generateProjectPreview, refineProjectPreview } from '../services/geminiService';

interface LandingProps {
  onGenerate: (prompt: string, difficulty: number, length: number, visualContext?: { description: string, image: string }) => void;
  onResume: (course: Course) => void;
  onEnterPlayground: () => void;
  isGenerating: boolean; 
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onLogout: () => void;
}

type Phase = 'INPUT' | 'DREAMING' | 'DESIGN' | 'BUILDING';

const Landing: React.FC<LandingProps> = ({ onGenerate, onResume, onEnterPlayground, isGenerating, settings, onUpdateSettings, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'new' | 'saved' | 'badges'>('new');
  const [phase, setPhase] = useState<Phase>('INPUT');
  
  // Input State
  const [prompt, setPrompt] = useState('');
  const [difficultyValue, setDifficultyValue] = useState(20); 
  const [lengthValue, setLengthValue] = useState(50); 
  
  // Design State
  const [previewImage, setPreviewImage] = useState<string>('');
  const [visualDescription, setVisualDescription] = useState<string>('');
  const [designPrompt, setDesignPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Loading State
  const [loadingLog, setLoadingLog] = useState<string[]>([]);
  
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [savedBadges, setSavedBadges] = useState<Badge[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setSavedCourses(getSavedCourses());
    setSavedBadges(getSavedBadges());
  }, [activeTab]);

  // Terminal Log Loading Animation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (phase === 'DREAMING') {
        const logs = [
            "Initializing Zephyr Core...",
            "Parsing user intent...",
            "Analyzing visual requirements...",
            "Dreaming up UI concepts...",
            "Rendering visual preview..."
        ];
        let i = 0;
        setLoadingLog([]);
        interval = setInterval(() => {
            if (i < logs.length) {
                setLoadingLog(prev => [...prev, logs[i]]);
                i++;
            }
        }, 800);
    } else if (isGenerating || phase === 'BUILDING') {
        setPhase('BUILDING');
        const logs = [
            "Locking visual design spec...",
            "Drafting curriculum modules...",
            "Synthesizing lesson plans...",
            "Generating boilerplate code...",
            "Injecting solution logic...",
            "Polishing learner steps...",
            "Finalizing course bundle..."
        ];
        let i = 0;
        setLoadingLog([]);
        interval = setInterval(() => {
            if (i < logs.length) {
                setLoadingLog(prev => [...prev, logs[i]]);
                i++;
            }
        }, 800);
    } 
    return () => clearInterval(interval);
  }, [phase, isGenerating]);

  // Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      ctx.strokeStyle = '#ef4444'; 
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
  };
  
  const draw = (e: React.MouseEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      ctx.lineTo(x, y);
      ctx.stroke();
  };
  
  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setPhase('DREAMING');
    try {
        const { image, description } = await generateProjectPreview(prompt);
        setPreviewImage(image);
        setVisualDescription(description);
        setPhase('DESIGN');
    } catch (e) {
        console.error("Design failed, skipping to build", e);
        onGenerate(prompt, difficultyValue, lengthValue);
    }
  };

  const handleRefineDesign = async () => {
      if (!designPrompt.trim() && !canvasRef.current) return;
      setIsRefining(true);
      try {
          // If generated code is HTML, we can't easily draw on it and re-submit it as image to the model in this specific flow 
          // without rendering it to canvas first. 
          // For now, we just pass the prompt.
          // Note: In a real browser env, we'd use html2canvas here.
          
          // Fallback logic for text-only refinement if image capture isn't available
          const result = await refineProjectPreview(previewImage || "", designPrompt || "Make highlighted changes");
          setPreviewImage(result.image); // This updates the code string
          setVisualDescription(result.description);
          setDesignPrompt("");
          clearCanvas();
      } catch (e) {
          console.error(e);
      } finally {
          setIsRefining(false);
      }
  };

  const handleStartCourse = () => {
      setPhase('BUILDING');
      onGenerate(prompt, difficultyValue, lengthValue, { description: visualDescription, image: previewImage });
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSavedCourses(deleteCourseFromStorage(id));
  }

  const getDifficultyLabel = (val: number) => {
     if (val < 20) return { label: 'Novice', desc: 'Hand-holding, copy & paste' };
     if (val < 40) return { label: 'Beginner', desc: 'Guided tasks, simple concepts' };
     if (val < 60) return { label: 'Intermediate', desc: 'Independent problem solving' };
     if (val < 80) return { label: 'Advanced', desc: 'Complex logic & patterns' };
     return { label: 'Expert', desc: 'Abstract, high-performance, minimal help' };
  }

  const getLengthLabel = (val: number) => {
      if (val < 33) return { label: 'Crash Course', desc: 'Quick start (3-4 lessons)' };
      if (val < 66) return { label: 'Standard', desc: 'Balanced depth (6-8 lessons)' };
      return { label: 'Deep Dive', desc: 'Comprehensive (10-15 lessons)' };
  }

  return (
    <div className="h-full bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">
      <div className="fixed top-0 left-0 w-full h-96 bg-primary-900/20 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-full h-96 bg-secondary-900/20 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="p-4 md:px-12 flex justify-between items-center relative z-20 shrink-0 bg-slate-950/50 backdrop-blur-sm border-b border-slate-800/50">
        <div className="flex items-center gap-3 font-bold text-lg md:text-xl tracking-tight">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-tr from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Zap size={20} className="text-white fill-current" />
          </div>
          <span className="font-mono bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ZEPHYRUS_AI</span>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
          <SettingsIcon size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="flex flex-col items-center px-4 text-center max-w-5xl mx-auto w-full pb-24 pt-8">
          
          {phase === 'INPUT' && (
              <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 mb-8 flex gap-1 animate-in slide-in-from-top-4 sticky top-0 z-30 shadow-2xl backdrop-blur-md">
                  <button onClick={() => setActiveTab('new')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'new' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>New Course</button>
                  <button onClick={() => setActiveTab('saved')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'saved' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>My Courses {savedCourses.length > 0 && `(${savedCourses.length})`}</button>
                  <button onClick={() => setActiveTab('badges')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'badges' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Badges</button>
              </div>
          )}

          {activeTab === 'new' && (
            <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in duration-300">
              
              {phase === 'INPUT' && (
                  <>
                    <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl">
                        What will you <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-purple-400 to-secondary-400">create</span>?
                    </h1>
                    
                    <form onSubmit={handleInitialSubmit} className="w-full max-w-2xl relative group z-20 mb-12">
                         {/* Glowing Border Container */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-1000"></div>
                        
                        <div className="relative flex items-center bg-slate-950 rounded-xl p-2 border border-slate-800 shadow-2xl">
                             <div className="pl-4 text-slate-500 font-mono text-lg">{">"}</div>
                             <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Type a project idea..."
                                className="w-full bg-transparent border-none text-white placeholder-slate-600 px-4 py-4 focus:outline-none text-xl font-medium font-mono"
                                autoFocus
                            />
                            <button type="submit" disabled={!prompt.trim()} className="bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                <ArrowRight size={24} />
                            </button>
                        </div>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-12">
                        {/* Difficulty Slider - UPDATED UI */}
                        <div className="group">
                             <div className="flex justify-between mb-2">
                                 <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Difficulty</label>
                                 <span className="text-xs font-mono text-primary-400">{getDifficultyLabel(difficultyValue).label}</span>
                             </div>
                             {/* Improved visibility: Lighter track background */}
                             <div className="relative h-14 bg-slate-700 border border-slate-600 rounded-xl flex items-center px-4 overflow-hidden group-hover:border-slate-500 transition-colors shadow-inner">
                                  {/* Vibrant Active Track */}
                                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-600 to-purple-500 transition-all duration-300 opacity-90" style={{ width: `${difficultyValue}%` }}></div>
                                  <input type="range" min="0" max="100" value={difficultyValue} onChange={(e) => setDifficultyValue(parseInt(e.target.value))} className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10" />
                                  <div className="relative z-0 w-full flex justify-between pointer-events-none">
                                      <div className={`w-2 h-2 rounded-full ${difficultyValue > 0 ? 'bg-white' : 'bg-slate-400'}`}></div>
                                      <div className={`w-2 h-2 rounded-full ${difficultyValue > 33 ? 'bg-white' : 'bg-slate-400'}`}></div>
                                      <div className={`w-2 h-2 rounded-full ${difficultyValue > 66 ? 'bg-white' : 'bg-slate-400'}`}></div>
                                      <div className={`w-2 h-2 rounded-full ${difficultyValue > 99 ? 'bg-white' : 'bg-slate-400'}`}></div>
                                  </div>
                             </div>
                             <p className="text-[10px] text-slate-400 mt-2 text-right">{getDifficultyLabel(difficultyValue).desc}</p>
                        </div>

                        {/* Length Slider - UPDATED UI */}
                        <div className="group">
                             <div className="flex justify-between mb-2">
                                 <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Course Length</label>
                                 <span className="text-xs font-mono text-primary-400">{getLengthLabel(lengthValue).label}</span>
                             </div>
                             {/* Improved visibility: Lighter track background */}
                             <div className="relative h-14 bg-slate-700 border border-slate-600 rounded-xl flex items-center px-4 overflow-hidden group-hover:border-slate-500 transition-colors shadow-inner">
                                  {/* Vibrant Active Track */}
                                  <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-600 to-purple-500 transition-all duration-300 opacity-90" style={{ width: `${lengthValue}%` }}></div>
                                  <input type="range" min="0" max="100" value={lengthValue} onChange={(e) => setLengthValue(parseInt(e.target.value))} className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10" />
                                  <div className="relative z-0 w-full flex justify-between pointer-events-none">
                                      <div className={`w-2 h-2 rounded-full ${lengthValue > 0 ? 'bg-white' : 'bg-slate-400'}`}></div>
                                      <div className={`w-2 h-2 rounded-full ${lengthValue > 50 ? 'bg-white' : 'bg-slate-400'}`}></div>
                                      <div className={`w-2 h-2 rounded-full ${lengthValue > 99 ? 'bg-white' : 'bg-slate-400'}`}></div>
                                  </div>
                             </div>
                             <p className="text-[10px] text-slate-400 mt-2 text-right">{getLengthLabel(lengthValue).desc}</p>
                        </div>
                    </div>

                    <div className="mt-8">
                         <button onClick={onEnterPlayground} className="bg-slate-800 hover:bg-slate-700 text-white text-base font-bold flex items-center gap-3 transition-all px-10 py-5 rounded-2xl shadow-xl border border-slate-600 hover:scale-105 hover:border-white/50">
                             <Code size={20} className="text-emerald-400" /> Enter Free Playground
                         </button>
                    </div>
                  </>
              )}

              {(phase === 'DREAMING' || phase === 'BUILDING') && (
                  <div className="w-full max-w-lg bg-black border border-slate-800 p-6 rounded-xl font-mono text-left shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-scan" />
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                          <Terminal size={16} className="text-primary-400" />
                          <span className="text-xs text-slate-400">zephyr_core.exe</span>
                      </div>
                      <div className="space-y-2 text-sm">
                          {loadingLog.map((log, i) => (
                              <div key={i} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                  <span className="text-green-500">➜</span>
                                  <span className="text-slate-300">{log}</span>
                                  {i === loadingLog.length - 1 && <span className="inline-block w-2 h-4 bg-primary-500 animate-pulse" />}
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {phase === 'DESIGN' && (
                  <div className="w-full max-w-5xl animate-in slide-in-from-bottom-8">
                      <div className="flex items-center justify-between mb-6">
                          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                              <Palette className="text-primary-400" /> Design Studio
                          </h2>
                          <button onClick={handleStartCourse} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all hover:scale-105">
                              Start Building This <ChevronRight size={18} />
                          </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative group shadow-2xl h-[500px]">
                              {/* Preview Iframe - Using the generated code */}
                              <iframe 
                                title="Design Preview"
                                srcDoc={previewImage}
                                className="w-full h-full border-none pointer-events-none"
                              />
                              <canvas 
                                ref={canvasRef}
                                className="absolute inset-0 z-10 cursor-crosshair w-full h-full"
                                width={800} 
                                height={600}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                              />
                              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-xs text-white px-3 py-1 rounded-full pointer-events-none z-20">
                                  Draw to circle areas to change
                              </div>
                              <button onClick={clearCanvas} className="absolute top-4 right-4 bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white z-20" title="Clear Drawing">
                                  <Trash2 size={16} />
                              </button>
                          </div>

                          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col">
                              <h3 className="font-bold text-white mb-4">Refine Design</h3>
                              <p className="text-sm text-slate-400 mb-4">Circle an area on the image and describe what to change.</p>
                              
                              <textarea
                                value={designPrompt}
                                onChange={(e) => setDesignPrompt(e.target.value)}
                                placeholder="E.g., Make this button red, Change background to dark blue..."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary-500 resize-none h-32 mb-4"
                              />
                              
                              <button 
                                onClick={handleRefineDesign}
                                disabled={isRefining || (!designPrompt && !isDrawing)}
                                className="mt-auto w-full bg-primary-600 hover:bg-primary-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                              >
                                  {isRefining ? <RefreshCw size={18} className="animate-spin" /> : <Pencil size={18} />}
                                  Update Design
                              </button>
                          </div>
                      </div>
                  </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
             <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
               {savedCourses.length === 0 ? (
                 <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                     <Layers size={48} className="mb-4 opacity-50" />
                     <p>No courses started yet.</p>
                 </div>
               ) : (
                 savedCourses.map(course => (
                   <div key={course.id} onClick={() => onResume(course)} className="bg-slate-900/40 backdrop-blur-sm border border-slate-700 rounded-xl p-0 hover:border-primary-500/50 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-full shadow-lg hover:shadow-primary-500/10 hover:-translate-y-1">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-primary-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                     
                     <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                             <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-primary-400 border border-slate-700"><FileCode size={20} /></div>
                             <button onClick={(e) => handleDelete(e, course.id)} className="p-2 hover:bg-red-500/10 hover:text-red-400 text-slate-600 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 leading-tight group-hover:text-primary-300 transition-colors">{course.title}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4">{course.description}</p>
                        
                        <div className="mt-auto">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>Progress</span>
                                <span>{Math.round((course.modules.reduce((acc, m) => acc + m.lessons.filter(l => l.completed).length, 0) / Math.max(1, course.modules.reduce((acc, m) => acc + m.lessons.length, 0))) * 100)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary-500 to-purple-500" style={{ width: `${Math.round((course.modules.reduce((acc, m) => acc + m.lessons.filter(l => l.completed).length, 0) / Math.max(1, course.modules.reduce((acc, m) => acc + m.lessons.length, 0))) * 100)}%` }}></div>
                            </div>
                        </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          )}
          
          {activeTab === 'badges' && (
              <div className="w-full max-w-4xl animate-in fade-in duration-300">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {savedBadges.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-20">
                            <Award size={48} className="mb-4 opacity-50" />
                            <p>No badges earned yet. Use the Playground!</p>
                        </div>
                      ) : (
                          savedBadges.map(badge => (
                              <div key={badge.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-center hover:border-yellow-500/50 transition-colors">
                                  <div className="text-4xl mb-2 filter drop-shadow-md">{badge.icon}</div>
                                  <div className="font-bold text-slate-200 text-sm">{badge.name}</div>
                                  <div className="text-[10px] text-slate-500 mt-1">{badge.description}</div>
                              </div>
                          ))
                      )}
                   </div>
              </div>
          )}

        </div>
      </main>
      
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><SettingsIcon size={20} className="text-primary-400" /> App Settings</h2>
             <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3">
                  <Palette size={20} className="text-pink-400" />
                  <div><h3 className="font-bold text-slate-200 text-sm">Theme</h3></div>
                </div>
                <div className="flex gap-2">
                    {(['zephyr', 'sunset', 'ocean', 'forest', 'crimson'] as Theme[]).map(t => (
                        <button key={t} onClick={() => onUpdateSettings({ ...settings, theme: t })} className={`w-6 h-6 rounded-full border-2 ${settings.theme === t ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'} transition-all`} style={{ backgroundColor: t === 'zephyr' ? '#6366f1' : t === 'sunset' ? '#f43f5e' : t === 'ocean' ? '#06b6d4' : t === 'forest' ? '#22c55e' : '#ef4444' }} />
                    ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3"><GraduationCap size={20} className="text-yellow-400" /><div><h3 className="font-bold text-slate-200 text-sm">Learner Mode</h3></div></div>
                <button onClick={() => onUpdateSettings({ ...settings, learnerMode: !settings.learnerMode })} className={`relative w-12 h-6 rounded-full transition-colors ${settings.learnerMode ? 'bg-primary-500' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.learnerMode ? 'translate-x-6' : 'translate-x-0'}`} /></button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3"><Code size={20} className="text-emerald-400" /><div><h3 className="font-bold text-slate-200 text-sm">Insertion Hints</h3></div></div>
                <button onClick={() => onUpdateSettings({ ...settings, showInsertionHints: !settings.showInsertionHints })} className={`relative w-12 h-6 rounded-full transition-colors ${settings.showInsertionHints ? 'bg-primary-500' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showInsertionHints ? 'translate-x-6' : 'translate-x-0'}`} /></button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3"><ChevronRight size={20} className="text-blue-400" /><div><h3 className="font-bold text-slate-200 text-sm">Allow Skip Ahead</h3></div></div>
                <button onClick={() => onUpdateSettings({ ...settings, allowSkipping: !settings.allowSkipping })} className={`relative w-12 h-6 rounded-full transition-colors ${settings.allowSkipping ? 'bg-primary-500' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.allowSkipping ? 'translate-x-6' : 'translate-x-0'}`} /></button>
              </div>

              {/* Logout Button */}
              <button onClick={onLogout} className="w-full mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                  <LogOut size={18} /> Log Out
              </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lesson, AppSettings, LearnerStep } from '../types';
import { ChevronLeft, Play, CheckCircle, RotateCcw, Code2, Monitor, BookOpen, AlertCircle, ArrowRight, Lightbulb, Copy, Check, GraduationCap, Wand2, Sparkles, X, MapPin, ArrowLeft } from 'lucide-react';
import { checkCode, generateLearnerSteps, applyAiEdit } from '../services/geminiService';
import ChatBot from './ChatBot';

interface LessonWorkspaceProps {
  lesson: Lesson;
  onBack: () => void;
  onComplete: (lessonId: string, code: string) => void;
  settings: AppSettings;
}

type MobileTab = 'guide' | 'code' | 'preview';
const LINE_HEIGHT = 24;

// CodeBlock Component
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-md group">
      <div className="flex justify-between items-center px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <span className="text-[10px] font-mono text-slate-400 uppercase">{language || 'code'}</span>
        <button onClick={handleCopy} className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs font-medium ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'}`}>
          {copied ? <Check size={12} /> : <Copy size={12} />}<span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-sm font-mono text-slate-300 overflow-x-auto whitespace-pre custom-scrollbar"><code>{code.trim()}</code></pre>
    </div>
  );
};

const LessonWorkspace: React.FC<LessonWorkspaceProps> = ({ lesson, onBack, onComplete, settings }) => {
  const [code, setCode] = useState(lesson.userCode || lesson.initialCode);
  const [mobileTab, setMobileTab] = useState<MobileTab>('guide'); 
  const [isRunning, setIsRunning] = useState(false);
  const [checkResult, setCheckResult] = useState<{ passed: boolean; feedback: string } | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Learner Mode State
  const [learnerSteps, setLearnerSteps] = useState<LearnerStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [learnerModeActive, setLearnerModeActive] = useState(settings.learnerMode);
  const [learnerFeedback, setLearnerFeedback] = useState<string>("");
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [highlightLine, setHighlightLine] = useState<number | null>(null);

  // AI Edit State
  const [selection, setSelection] = useState({ start: 0, end: 0, text: "" });
  const [showEditInput, setShowEditInput] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let initialCode = lesson.userCode || lesson.initialCode;
    const INSERTION_MARKER = '<!-- Write code here -->';
    if (settings.showInsertionHints && !initialCode.includes(INSERTION_MARKER) && !lesson.userCode) {
         if (initialCode.includes('<body>')) initialCode = initialCode.replace(/<body>/i, `<body>\n  ${INSERTION_MARKER}`);
         else if (initialCode.trim() === '') initialCode = INSERTION_MARKER;
         else initialCode = initialCode + `\n\n${INSERTION_MARKER}`;
    }
    setCode(initialCode);
    setCheckResult(null);
    setMobileTab('guide');
    setLearnerModeActive(settings.learnerMode);
    
    if (settings.learnerMode && lesson.solutionCode) {
        initializeLearnerMode();
    }
  }, [lesson, settings.showInsertionHints, settings.learnerMode]);

  const initializeLearnerMode = async () => {
    setIsLoadingSteps(true);
    let steps = lesson.steps && lesson.steps.length > 0 ? lesson.steps : await generateLearnerSteps(lesson.solutionCode);
    
    // FILTER: STRICTLY Remove comment-only steps or empty steps
    steps = steps.filter(s => {
        const trimmed = s.code.trim();
        if (trimmed.length === 0) return false;
        // Detect HTML comments
        if (trimmed.startsWith('<!--') || trimmed.endsWith('-->')) return false;
        // Detect JS/CSS comments
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return false;
        return true;
    });

    setLearnerSteps(steps);
    setCurrentStepIndex(0);
    setLearnerFeedback("");
    setIsLoadingSteps(false);
  };

  // Helper to find the line number where the user should type
  const getInsertionLineIndex = useCallback(() => {
    if (!learnerSteps[currentStepIndex]) return null;
    const step = learnerSteps[currentStepIndex];
    if (!code) return 0;
    if (step.context) {
        const idx = code.indexOf(step.context.trim());
        if (idx !== -1) {
             const upToContext = code.slice(0, idx + step.context.length);
             return upToContext.split('\n').length;
        }
    }
    const markerIdx = code.indexOf('<!-- Write code here -->');
    if (markerIdx !== -1) return code.slice(0, markerIdx).split('\n').length - 1;
    return code.split('\n').length;
  }, [code, learnerSteps, currentStepIndex]);

  useEffect(() => {
    if (learnerModeActive) {
        const line = getInsertionLineIndex();
        setHighlightLine(line);
        if (line !== null && scrollContainerRef.current) {
            const top = (line * LINE_HEIGHT) + 24;
            const containerHeight = scrollContainerRef.current.clientHeight;
            scrollContainerRef.current.scrollTo({ top: Math.max(0, top - (containerHeight / 2)), behavior: 'smooth' });
        }
    } else {
        setHighlightLine(null);
    }
  }, [currentStepIndex, learnerModeActive]); 

  // Real-time validation
  useEffect(() => {
    if (!learnerModeActive || currentStepIndex >= learnerSteps.length) return;
    const currentTarget = learnerSteps[currentStepIndex];
    if (!currentTarget) return;
    const normalizedCode = code.replace(/\s+/g, '');
    const normalizedTarget = currentTarget.code.replace(/\s+/g, '');

    if (normalizedCode.includes(normalizedTarget)) {
         setCurrentStepIndex(prev => prev + 1);
         setLearnerFeedback("Excellent! Next step unlocked.");
         setTimeout(() => setLearnerFeedback(""), 2000);
         if (currentStepIndex + 1 >= learnerSteps.length) {
             setCheckResult({ passed: true, feedback: "You completed all steps in Learner Mode!" });
             onComplete(lesson.id, code);
             if (window.innerWidth < 768) setMobileTab('preview');
         }
    }
  }, [code, learnerModeActive, currentStepIndex, learnerSteps, lesson.id, onComplete]);


  const handleRun = useCallback(() => {
    setIframeKey(prev => prev + 1);
    if (window.innerWidth < 768) setMobileTab('preview');
  }, []);

  const handleMainAction = async () => {
    if (checkResult?.passed) { onComplete(lesson.id, code); return; }
    setIsRunning(true);
    setCheckResult(null);
    const result = await checkCode(code, lesson.instructions, `Task: ${lesson.title}`);
    setCheckResult(result);
    setIsRunning(false);
    if (result.passed && window.innerWidth < 768) setMobileTab('preview');
  };

  const handleSelect = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (textarea.selectionStart !== textarea.selectionEnd) {
          setSelection({ start: textarea.selectionStart, end: textarea.selectionEnd, text: code.substring(textarea.selectionStart, textarea.selectionEnd) });
      } else {
          setSelection({ start: 0, end: 0, text: "" });
      }
  };

  const handleAiEdit = async () => {
      if (!editPrompt.trim()) return;
      setIsEditing(true);
      try {
          const result = await applyAiEdit(code, selection.text, editPrompt);
          setCode(result.newCode);
          setEditPrompt("");
          setShowEditInput(false);
          setSelection({ start: 0, end: 0, text: "" });
          setLearnerFeedback(result.explanation || "Updated code!");
          setTimeout(() => setLearnerFeedback(""), 3000);
      } catch (error) { console.error(error); } finally { setIsEditing(false); }
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (settings.autoIndent || settings.learnerMode) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = value.substring(lineStart, start);
            const match = currentLine.match(/^(\s*)/);
            let indentation = match ? match[1] : '';
            if (currentLine.trim().endsWith('{') || currentLine.trim().endsWith('(') || currentLine.trim().endsWith('[') || /<[^\/][^>]*>$/.test(currentLine.trim())) {
                indentation += '  ';
            }
            const newValue = value.substring(0, start) + '\n' + indentation + value.substring(end);
            setCode(newValue);
            setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start + 1 + indentation.length; }, 0);
        }
    }
  };

  const handleLocateInsertion = () => {
      const line = getInsertionLineIndex();
      if (line !== null && scrollContainerRef.current) {
          const top = (line * LINE_HEIGHT) + 24;
          const containerHeight = scrollContainerRef.current.clientHeight;
          scrollContainerRef.current.scrollTo({ top: Math.max(0, top - (containerHeight / 2)), behavior: 'smooth' });
          textareaRef.current?.focus();
      }
  };

  const handleCopyStep = (text: string) => {
      navigator.clipboard.writeText(text);
      setLearnerFeedback("Copied to clipboard!");
      setTimeout(() => setLearnerFeedback(""), 2000);
  };

  const renderInstructions = (text: string) => {
    const regex = /```(\w*)\n?([\s\S]*?)```/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            elements.push(<div key={`text-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none text-slate-300 text-sm">{text.slice(lastIndex, match.index)}</div>);
        }
        elements.push(<CodeBlock key={`code-${match.index}`} language={match[1]} code={match[2]} />);
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        elements.push(<div key={`text-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none text-slate-300 text-sm">{text.slice(lastIndex)}</div>);
    }
    return elements;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Top Bar - Glassmorphism UI Update */}
      <header className="absolute top-0 left-0 w-full h-16 bg-slate-900/60 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-40 transition-all hover:bg-slate-900/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"><ChevronLeft size={20} /></button>
          <div className="flex flex-col min-w-0">
             <h2 className="font-bold text-sm md:text-base truncate text-slate-100 font-mono tracking-tight">{lesson.title}</h2>
             <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${checkResult?.passed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-primary-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}></span>
                <span className="text-[10px] text-slate-400 truncate uppercase tracking-wider font-semibold">{checkResult?.passed ? 'Completed' : 'Active Session'}</span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => setCode(lesson.initialCode)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors hidden sm:block" title="Reset Code"><RotateCcw size={18} /></button>
          <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block"></div>
          <button onClick={handleRun} className="flex items-center gap-2 px-3 py-1.5 md:px-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors font-semibold text-xs md:text-sm border border-white/5"><Play size={14} className="fill-current" /><span>Run</span></button>
          {!learnerModeActive && (
            <button onClick={handleMainAction} disabled={isRunning} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all font-semibold text-xs md:text-sm shadow-lg ${checkResult?.passed ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/30' : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-900/30'}`}>
                {isRunning ? <span className="animate-pulse">Checking...</span> : checkResult?.passed ? <><span>Next Lesson</span><ArrowRight size={16} /></> : <><CheckCircle size={16} /><span>Submit</span></>}
            </button>
          )}
          {learnerModeActive && (<div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-yellow-200 text-xs font-bold"><GraduationCap size={14} /><span className="hidden sm:inline">Learner Mode</span></div>)}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative bg-slate-950 pt-16">
        
        {/* GUIDE PANEL */}
        <div className={`flex flex-col bg-slate-900/50 backdrop-blur-sm border-r border-slate-800 transition-all duration-300 ${mobileTab === 'guide' ? 'absolute inset-0 z-10 w-full flex' : 'hidden'} md:flex md:relative md:w-1/4 md:min-w-[350px] md:inset-auto md:z-0`}>
          <div className="flex items-center gap-2 p-4 border-b border-slate-800 bg-slate-900/80"><BookOpen size={18} className="text-primary-400" /><span className="font-bold text-sm text-slate-200">Guide</span></div>
          <div className="flex-1 overflow-y-auto p-5 pb-24 md:pb-6 custom-scrollbar space-y-6">
            {settings.showTips && <div className="bg-gradient-to-br from-indigo-900/20 to-slate-800/50 border border-indigo-500/20 rounded-xl p-4"><h3 className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Lightbulb size={14} /> Core Concept</h3><div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{lesson.concept}</div></div>}
            
            {/* LEARNER MODE HUD */}
            {learnerModeActive && (
                  <div className="relative">
                      {isLoadingSteps ? (
                           <div className="p-8 text-center text-slate-500 text-sm animate-pulse"><Sparkles className="mx-auto mb-2 opacity-50" />Preparing your guided steps...</div>
                      ) : currentStepIndex < learnerSteps.length ? (
                          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-yellow-500/30 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-left-2 transition-all">
                               <div className="bg-yellow-500/10 px-4 py-2 border-b border-yellow-500/10 flex justify-between items-center">
                                   <h4 className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Step {currentStepIndex + 1} of {learnerSteps.length}</h4>
                                   <div className="w-20 h-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${((currentStepIndex) / learnerSteps.length) * 100}%` }}></div></div>
                               </div>
                               <div className="p-5">
                                    <div className="flex gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0"><div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div></div>
                                        <div><p className="text-slate-200 text-sm font-medium leading-relaxed mb-3">{learnerSteps[currentStepIndex].explanation}</p></div>
                                    </div>
                                    <div className="bg-black/40 rounded-lg p-3 border border-slate-700/50 relative group">
                                         <div className="flex justify-between items-center mb-1"><span className="text-[10px] text-slate-500 uppercase tracking-wider">Type this code:</span><button onClick={() => handleCopyStep(learnerSteps[currentStepIndex].code)} className="text-slate-500 hover:text-white transition-colors"><Copy size={12} /></button></div>
                                         <code className="text-emerald-400 font-mono text-sm block whitespace-pre-wrap break-all">{learnerSteps[currentStepIndex].code}</code>
                                         <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={handleLocateInsertion} className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-yellow-400"><MapPin size={10} /> Locate</button></div>
                                    </div>
                               </div>
                          </div>
                      ) : (
                          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center animate-in zoom-in">
                              <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" /><h4 className="text-emerald-400 font-bold">Lesson Complete!</h4>
                          </div>
                      )}
                  </div>
            )}
            {!learnerModeActive && <div className="prose prose-invert prose-sm max-w-none text-slate-300">{renderInstructions(lesson.instructions)}</div>}
          </div>
        </div>

        {/* CODE EDITOR */}
        <div className={`flex-1 flex flex-col bg-[#1e1e2e] relative group overflow-hidden ${mobileTab === 'code' ? 'absolute inset-0 z-10 w-full flex' : 'hidden'} md:flex md:relative md:inset-auto md:z-0`}>
            {showEditInput && (
                <div className="absolute top-4 left-4 right-4 z-30 animate-in slide-in-from-top-2">
                    <div className="bg-slate-800 border border-purple-500/30 p-3 rounded-xl shadow-2xl flex flex-col gap-2">
                         <div className="flex items-center justify-between"><h4 className="text-xs font-bold text-purple-300 flex items-center gap-1"><Sparkles size={12} /> Edit</h4><button onClick={() => setShowEditInput(false)} className="text-slate-500 hover:text-white"><X size={14} /></button></div>
                         <div className="flex gap-2"><input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="E.g. Fix the error..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()} /><button onClick={handleAiEdit} disabled={isEditing || !editPrompt} className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg disabled:opacity-50 transition-colors">{isEditing ? <Wand2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}</button></div>
                    </div>
                </div>
            )}
            {selection.text && !showEditInput && <button onClick={() => setShowEditInput(true)} className="absolute bottom-4 right-4 z-30 bg-purple-600 hover:bg-purple-500 text-white rounded-full p-3 shadow-xl hover:scale-110 transition-all flex items-center gap-2"><Wand2 size={18} /><span className="font-bold text-xs pr-1">Edit</span></button>}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={scrollContainerRef}>
                <div className="relative min-h-full">
                    {learnerModeActive && highlightLine !== null && (
                         <div className="absolute left-0 w-full pointer-events-none transition-all duration-300 ease-out z-0 border-l-[3px] border-yellow-500" style={{ height: `${LINE_HEIGHT}px`, top: `${24 + (highlightLine * LINE_HEIGHT)}px`, background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.05) 50%, transparent 100%)' }}>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-yellow-400 font-bold text-xs animate-pulse"><span>Type Here</span><ArrowLeft size={16} /></div>
                         </div>
                    )}
                    <textarea ref={textareaRef} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={handleKeyDown} onSelect={handleSelect} className="w-full h-full min-h-[calc(100vh-200px)] bg-transparent text-slate-300 p-6 font-mono text-sm resize-none focus:outline-none overflow-hidden relative z-10 leading-[24px]" spellCheck={false} placeholder="<!-- Code goes here -->" style={{ lineHeight: `${LINE_HEIGHT}px` }} />
                </div>
            </div>
            {learnerFeedback && <div className="absolute top-4 right-4 bg-emerald-900/90 text-emerald-200 px-4 py-2 rounded-lg text-sm border border-emerald-500/30 animate-in fade-in slide-in-from-top-4 z-40 shadow-xl flex items-center gap-2"><Sparkles size={14} />{learnerFeedback}</div>}
        </div>

        {/* PREVIEW PANEL */}
        <div className={`flex-col bg-white border-l border-slate-800 transition-all duration-300 ${mobileTab === 'preview' ? 'absolute inset-0 z-10 w-full flex' : 'hidden'} md:flex md:w-1/3 md:inset-auto md:z-0`}>
           <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 text-xs text-slate-500 select-none shrink-0"><Monitor size={14} /><span className="font-semibold text-slate-600">Browser Output</span>{checkResult && <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${checkResult.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{checkResult.passed ? 'PASSED' : 'NEEDS WORK'}</span>}</div>
           <div className="flex-1 relative bg-white">
                <iframe key={iframeKey} title="Preview" srcDoc={code} className="w-full h-full border-none" sandbox="allow-scripts" />
                {checkResult && !checkResult.passed && !isRunning && <div className="absolute bottom-0 left-0 w-full bg-red-50/95 border-t border-red-200 p-4 animate-in slide-in-from-bottom-2 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"><div className="flex items-start gap-3"><AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} /><div><h4 className="font-bold text-red-800 text-sm mb-1">Feedback</h4><p className="text-red-700 text-xs leading-relaxed">{checkResult.feedback}</p></div></div></div>}
           </div>
        </div>
      </div>
      
      {/* Mobile Tab Bar */}
      <div className="md:hidden h-14 bg-slate-900 border-t border-slate-800 grid grid-cols-3 shrink-0 relative z-30">
          <button onClick={() => setMobileTab('guide')} className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'guide' ? 'text-primary-400 bg-slate-800' : 'text-slate-500'}`}><BookOpen size={18} /><span className="text-[10px] font-medium">Guide</span></button>
          <button onClick={() => setMobileTab('code')} className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'code' ? 'text-primary-400 bg-slate-800' : 'text-slate-500'}`}><Code2 size={18} /><span className="text-[10px] font-medium">Code</span></button>
          <button onClick={() => setMobileTab('preview')} className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'preview' ? 'text-primary-400 bg-slate-800' : 'text-slate-500'}`}><Monitor size={18} /><span className="text-[10px] font-medium">Preview</span></button>
      </div>
      <ChatBot currentLesson={lesson} />
    </div>
  );
};

export default LessonWorkspace;
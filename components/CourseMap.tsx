

import React, { useRef, useEffect, useState } from 'react';
import { Course, Lesson } from '../types';
import { Check, Lock, Star, ChevronLeft, Map, Play, Award, Zap, Target, ImageIcon, ArrowUp } from 'lucide-react';

interface CourseMapProps {
  course: Course;
  onSelectLesson: (lesson: Lesson) => void;
  onBack: () => void;
}

const CourseMap: React.FC<CourseMapProps> = ({ course, onSelectLesson, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHeight, setSvgHeight] = useState(1000);

  useEffect(() => {
    // Dynamically calculate the height needed for the map based on number of modules/lessons
    // Estimate: Header space + (Modules * Lessons * spacing)
    const estimatedHeight = 500 + (course.modules.length * 150) + (course.modules.reduce((acc, m) => acc + m.lessons.length, 0) * 160);
    setSvgHeight(Math.max(window.innerHeight, estimatedHeight));
  }, [course]);

  // Find the next uncompleted lesson to jump to
  const getNextLesson = () => {
    for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
            if (!lesson.completed) return lesson;
        }
    }
    return null;
  };
  
  const nextLesson = getNextLesson();

  const handleResume = () => {
      if (nextLesson) onSelectLesson(nextLesson);
  };

  // Generate SVG path coordinates
  const getPathCoords = () => {
    const coords: { x: number; y: number }[] = [];
    let currentY = 320; // Start lower to accommodate the new Preview card
    const spacing = 160; 

    course.modules.forEach((mod) => {
      currentY += 100; // Space for module header
      mod.lessons.forEach((_, lIndex) => {
        // Smooth sine wave pattern
        const cycle = lIndex % 4;
        let xOffset = 0;
        if (cycle === 0) xOffset = 0;
        if (cycle === 1) xOffset = -40;
        if (cycle === 2) xOffset = 0;
        if (cycle === 3) xOffset = 40;
        
        coords.push({ x: 50 + xOffset, y: currentY }); 
        currentY += spacing;
      });
      currentY += 60; 
    });
    return coords;
  };

  const pathCoords = getPathCoords();
  
  const pathString = pathCoords.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x}% ${point.y}`;
    const prev = pathCoords[i - 1];
    const cp1x = prev.x;
    const cp1y = prev.y + 80;
    const cp2x = point.x;
    const cp2y = point.y - 80;
    return `${acc} C ${cp1x}% ${cp1y}, ${cp2x}% ${cp2y}, ${point.x}% ${point.y}`;
  }, "");

  let absoluteLessonIndex = 0;

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-900/20 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all transform hover:scale-105"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white truncate max-w-[200px] md:max-w-lg tracking-tight">{course.title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <Map size={12} />
                <span className="truncate max-w-[200px]">{course.description}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
            <Zap size={16} className="text-yellow-400 fill-yellow-400" />
            <span className="font-bold text-sm text-yellow-100">Daily Streak: 1</span>
          </div>
        </div>
      </header>

      {/* Map Container - Allows scrolling */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth bg-transparent custom-scrollbar" ref={containerRef}>
        
        {/* SVG Path Layer */}
        <div className="absolute top-0 left-0 w-full pointer-events-none z-0">
           <svg width="100%" height={svgHeight} style={{overflow: 'visible'}}>
             {/* Outer Glow */}
             <path 
                d={pathString} 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="16" 
                strokeLinecap="round"
                className="opacity-10 blur-xl"
             />
             {/* Main Path */}
             <path 
                d={pathString} 
                fill="none" 
                stroke="#334155" 
                strokeWidth="12" 
                strokeLinecap="round"
                strokeDasharray="20 20"
                className="opacity-60"
             />
           </svg>
        </div>

        <div className="max-w-2xl mx-auto w-full pb-32 pt-12 relative z-10 px-4">
          
          {/* Project Preview Card */}
          <div className="mb-12 bg-gradient-to-br from-slate-900 to-indigo-950/50 border border-slate-700 rounded-2xl shadow-2xl relative overflow-hidden group min-h-[200px]">
            {/* Generated Image Background */}
            {course.previewImage ? (
                <div className="absolute inset-0 z-0">
                    <img 
                        src={course.previewImage} 
                        alt="Project Preview" 
                        className="w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-all duration-700 blur-[2px] group-hover:blur-0 scale-105 group-hover:scale-100" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/30" />
                </div>
            ) : (
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target size={120} />
                </div>
            )}
            
            <div className="relative z-10 p-6 flex flex-col h-full justify-end">
                <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-xs mb-3">
                    {course.previewImage ? <ImageIcon size={16} /> : <Target size={16} />}
                    Project Goal
                </div>
                <h2 className="text-2xl font-bold text-white mb-2 shadow-black drop-shadow-md">What you'll build</h2>
                <p className="text-slate-200 leading-relaxed text-sm md:text-base drop-shadow-md">
                    {course.finalOutcomeDescription || "A professional-grade application utilizing modern web standards."}
                </p>
            </div>
          </div>

          {course.modules.map((module, mIndex) => {
            return (
              <div key={module.id} className="relative mb-20">
                
                {/* Module Section Header */}
                <div className="flex justify-center mb-10 sticky top-4 z-20">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-1 pr-6 shadow-xl flex items-center gap-4 max-w-md animate-in slide-in-from-bottom-4 duration-700">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shrink-0 text-white font-bold text-2xl shadow-lg transform rotate-3">
                            {mIndex + 1}
                        </div>
                        <div className="text-left">
                            <h2 className="text-lg font-bold text-white leading-tight">{module.title}</h2>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{module.description}</p>
                        </div>
                    </div>
                </div>

                {/* Lessons Grid */}
                <div className="flex flex-col gap-8 relative">
                  {module.lessons.map((lesson, lIndex) => {
                    const myIndex = absoluteLessonIndex++;
                    const isCompleted = lesson.completed;
                    
                    // Logic: Unlock if it's the first lesson OR previous lesson is completed
                    const isFirstLesson = myIndex === 0;
                    const prevLessonCompleted = myIndex > 0 && course.modules.flatMap(m => m.lessons)[myIndex - 1].completed;
                    // Allow access if completed or if it's the next available one
                    const isLocked = !isFirstLesson && !prevLessonCompleted && !isCompleted;
                    
                    const isCurrent = !isLocked && !isCompleted;

                    let btnClass = "";
                    let icon = null;

                    if (isCompleted) {
                        btnClass = "bg-emerald-500 border-b-4 border-emerald-700 text-white shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)]";
                        icon = <Check size={36} strokeWidth={4} />;
                    } else if (isLocked) {
                        btnClass = "bg-slate-800 border-b-4 border-slate-700 text-slate-500 grayscale opacity-80";
                        icon = <Lock size={24} />;
                    } else {
                        // Current Active
                        btnClass = "bg-gradient-to-b from-primary-400 to-primary-600 border-b-4 border-primary-800 text-white shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)] transform hover:scale-110 active:scale-95 active:border-b-0 active:translate-y-1 ring-4 ring-primary-500/20";
                        icon = <Play size={32} fill="currentColor" className="ml-1" />;
                    }

                    // Zigzag layout classes
                    const cycle = lIndex % 4;
                    let alignClass = "justify-center";
                    if (cycle === 1) alignClass = "justify-start md:pl-32";
                    if (cycle === 3) alignClass = "justify-end md:pr-32";

                    return (
                      <div key={lesson.id} className={`flex w-full ${alignClass} mb-8 relative group perspective-500`}>
                        <div className="relative">
                            {/* Connection dot on the line */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-slate-950 rounded-full -z-10"></div>
                            
                            {isCurrent && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-primary-500/30 rounded-full animate-[ping_3s_infinite]"></div>
                            )}

                            <button
                            onClick={() => !isLocked && onSelectLesson(lesson)}
                            disabled={isLocked}
                            className={`
                                w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-300 relative z-10
                                ${btnClass}
                            `}
                            >
                            {icon}
                            
                            {/* Pulse effect for current lesson */}
                            {isCurrent && (
                                <>
                                <span className="absolute -inset-1 rounded-[2.2rem] border-2 border-white/30 animate-ping pointer-events-none"></span>
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-primary-600 px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce whitespace-nowrap">
                                    Start Here
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
                                </div>
                                </>
                            )}
                            {/* Label for completed/resumable lessons */}
                            {isCompleted && (
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                    Review
                                </div>
                            )}
                            </button>
                        </div>

                        {/* Hover Info Card */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[160%] w-56 bg-white text-slate-900 p-4 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-30 scale-90 group-hover:scale-100 origin-bottom">
                            <h4 className="font-bold text-base leading-tight mb-1 text-slate-800">{lesson.title}</h4>
                            <p className="text-xs text-slate-500 leading-tight border-t border-slate-100 pt-2 mt-2">{lesson.concept}</p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-white rotate-45"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          <div className="flex justify-center mt-20 mb-10">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col items-center text-center gap-4 max-w-sm w-full">
                <div className="w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mb-2">
                    <Award size={48} className="text-yellow-400 drop-shadow-lg" />
                </div>
                <div>
                    <span className="font-bold text-2xl text-white block">Certificate of Completion</span>
                    <span className="text-sm text-slate-400 mt-2 block">Finish all lessons to claim your reward.</span>
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Resume Button (FAB) */}
      {nextLesson && (
          <button 
             onClick={handleResume}
             className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-full font-bold shadow-2xl shadow-primary-900/50 flex items-center gap-2 animate-in slide-in-from-bottom-4 hover:scale-105 transition-all"
          >
              <Play size={20} fill="currentColor" />
              <span>Resume Journey</span>
          </button>
      )}
    </div>
  );
};

export default CourseMap;

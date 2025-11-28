
import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import CourseMap from './components/CourseMap';
import LessonWorkspace from './components/LessonWorkspace';
import Playground from './components/Playground';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import { generateCourse } from './services/geminiService';
import { saveCourseToStorage, saveSettingsToStorage, getSettingsFromStorage, saveBadgeToStorage } from './services/storage';
import { Course, Lesson, ViewState, AppSettings, Theme, User } from './types';
import { supabase } from './services/supabaseClient';

const THEME_COLORS: Record<Theme, Record<string, string>> = {
    zephyr: {
        '50': '238 242 255',
        '100': '224 231 255',
        '200': '199 210 254',
        '300': '165 180 252',
        '400': '129 140 248',
        '500': '99 102 241',
        '600': '79 70 229',
        '700': '67 56 202',
        '800': '55 48 163',
        '900': '49 46 129',
    },
    sunset: {
        '50': '255 241 242',
        '100': '255 228 230',
        '200': '254 205 211',
        '300': '253 164 175',
        '400': '251 113 133',
        '500': '244 63 94',
        '600': '225 29 72',
        '700': '190 18 60',
        '800': '159 18 57',
        '900': '136 19 55',
    },
    ocean: {
        '50': '236 254 255',
        '100': '207 250 254',
        '200': '165 243 252',
        '300': '103 232 249',
        '400': '34 211 238',
        '500': '6 182 212',
        '600': '8 145 178',
        '700': '14 116 144',
        '800': '21 94 117',
        '900': '22 78 99',
    },
    forest: {
        '50': '236 253 245',
        '100': '209 250 229',
        '200': '167 243 208',
        '300': '110 231 183',
        '400': '52 211 153',
        '500': '16 185 129',
        '600': '5 150 105',
        '700': '4 120 87',
        '800': '6 95 70',
        '900': '6 78 59',
    },
    crimson: {
        '50': '254 242 242',
        '100': '254 226 226',
        '200': '254 202 202',
        '300': '252 165 165',
        '400': '248 113 113',
        '500': '239 68 68',
        '600': '220 38 38',
        '700': '185 28 28',
        '800': '153 27 27',
        '900': '127 29 29',
    }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('auth');
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ 
    showTips: true, 
    showInsertionHints: true, 
    autoIndent: true,
    theme: 'zephyr',
    learnerMode: false,
    detailLevel: 'balanced',
    allowSkipping: false
  });

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.email?.split('@')[0] || 'User',
            isOnboarded: false
        });
        setView('landing');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
         setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.email?.split('@')[0] || 'User',
            isOnboarded: false
        });
        setView('landing');
      } else {
        setUser(null);
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setSettings(getSettingsFromStorage());
  }, []);

  useEffect(() => {
    const colors = THEME_COLORS[settings.theme];
    const root = document.documentElement;
    Object.keys(colors).forEach(key => {
        root.style.setProperty(`--color-primary-${key}`, colors[key]);
    });
  }, [settings.theme]);

  const handleGenerate = async (prompt: string, difficulty: number, length: number, visualContext?: { description: string, image: string }) => {
    setIsGenerating(true);
    try {
      const newCourse = await generateCourse(
          prompt, 
          difficulty, 
          length, 
          visualContext?.description, 
          visualContext?.image, 
          settings.detailLevel
      );
      setCourse(newCourse);
      saveCourseToStorage(newCourse);
      setView('map');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResume = (c: Course) => {
    setCourse(c);
    setView('map');
  };

  const handleBackToMap = () => {
    setView('map');
    setCurrentLesson(null);
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setView('workspace');
  };

  const handleCompleteLesson = (lessonId: string, userCode: string) => {
    if (!course) return;
    const updatedModules = course.modules.map(m => ({
        ...m,
        lessons: m.lessons.map(l => {
            if (l.id === lessonId) {
                return { ...l, completed: true, userCode };
            }
            return l;
        })
    }));
    const updatedCourse = { ...course, modules: updatedModules };
    setCourse(updatedCourse);
    saveCourseToStorage(updatedCourse);
    setView('map');
    setCurrentLesson(null);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettingsToStorage(newSettings);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(null);
      setView('auth');
  };

  if (view === 'auth') return <Auth onLogin={(u) => { setUser(u); setView('landing'); }} />;
  if (view === 'onboarding' && user) return <Onboarding user={user} onComplete={() => { setView('landing'); }} />;

  return (
      <div className={`theme-${settings.theme} h-screen w-full bg-slate-950 text-white font-sans selection:bg-primary-500/30`}>
         {view === 'landing' && (
             <Landing 
                onGenerate={handleGenerate}
                onResume={handleResume}
                onEnterPlayground={() => setView('playground')}
                isGenerating={isGenerating}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onLogout={handleLogout}
             />
         )}
         {view === 'map' && course && (
             <CourseMap 
                course={course}
                onSelectLesson={handleSelectLesson}
                onBack={() => setView('landing')}
             />
         )}
         {view === 'workspace' && currentLesson && (
             <LessonWorkspace 
                lesson={currentLesson}
                onBack={handleBackToMap}
                onComplete={handleCompleteLesson}
                settings={settings}
             />
         )}
         {view === 'playground' && (
             <Playground 
                onBack={() => setView('landing')}
                onAwardBadge={(badge) => saveBadgeToStorage(badge)}
             />
         )}
      </div>
  );
};

export default App;


import { Course, AppSettings, Badge } from '../types';

const STORAGE_KEY = 'codespark_courses_v1';
const SETTINGS_KEY = 'codespark_settings_v1';
const BADGES_KEY = 'codespark_badges_v1';

export const saveCourseToStorage = (course: Course): void => {
  try {
    const existingData = localStorage.getItem(STORAGE_KEY);
    let courses: Course[] = existingData ? JSON.parse(existingData) : [];
    
    // Check if course exists, update it, otherwise add it
    const index = courses.findIndex(c => c.id === course.id);
    if (index >= 0) {
      courses[index] = { ...course, lastAccessed: Date.now() };
    } else {
      courses.push({ ...course, lastAccessed: Date.now(), createdAt: Date.now() });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  } catch (e) {
    console.error("Failed to save course", e);
  }
};

export const getSavedCourses = (): Course[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data).sort((a: Course, b: Course) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  } catch (e) {
    console.error("Failed to load courses", e);
    return [];
  }
};

export const deleteCourseFromStorage = (courseId: string): Course[] => {
    try {
        const existingData = localStorage.getItem(STORAGE_KEY);
        if (!existingData) return [];
        let courses: Course[] = JSON.parse(existingData);
        courses = courses.filter(c => c.id !== courseId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
        return courses;
    } catch (e) {
        console.error("Failed to delete course", e);
        return [];
    }
}

export const saveSettingsToStorage = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
};

export const getSettingsFromStorage = (): AppSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    const defaults: AppSettings = { 
        showTips: true, 
        showInsertionHints: true, 
        autoIndent: true,
        theme: 'zephyr',
        learnerMode: false,
        detailLevel: 'balanced',
        allowSkipping: false
    };

    if (!data) return defaults;
    
    const parsed = JSON.parse(data);
    return {
        ...defaults,
        ...parsed
    };
  } catch (e) {
    return { 
        showTips: true, 
        showInsertionHints: true, 
        autoIndent: true,
        theme: 'zephyr',
        learnerMode: false,
        detailLevel: 'balanced',
        allowSkipping: false
    };
  }
};

export const saveBadgeToStorage = (badge: Badge): Badge[] => {
  try {
    const existingData = localStorage.getItem(BADGES_KEY);
    let badges: Badge[] = existingData ? JSON.parse(existingData) : [];
    badges.push(badge);
    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
    return badges;
  } catch (e) {
    console.error("Failed to save badge", e);
    return [];
  }
};

export const getSavedBadges = (): Badge[] => {
  try {
    const data = localStorage.getItem(BADGES_KEY);
    if (!data) return [];
    return JSON.parse(data).sort((a: Badge, b: Badge) => b.awardedAt - a.awardedAt);
  } catch (e) {
    return [];
  }
};

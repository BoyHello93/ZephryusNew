import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Course, Lesson, Badge, DetailLevel, LearnerStep } from '../types';

// Use the specific key provided by the user for deployment
const apiKey = 'AIzaSyA_LqWE1FipYQSOFwSw0t1eNxbNUh8219U';
const ai = new GoogleGenAI({ apiKey: apiKey });

const courseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    finalOutcomeDescription: { type: Type.STRING, description: "A vivid description of the final project." },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          lessons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                concept: { type: Type.STRING },
                instructions: { type: Type.STRING },
                initialCode: { type: Type.STRING },
                solutionCode: { type: Type.STRING },
              },
              required: ['id', 'title', 'description', 'concept', 'instructions', 'initialCode', 'solutionCode']
            }
          }
        },
        required: ['id', 'title', 'description', 'lessons']
      }
    }
  },
  required: ['title', 'description', 'finalOutcomeDescription', 'modules']
};

export const generateProjectPreview = async (prompt: string): Promise<{ image: string, description: string }> => {
    try {
        // Generate Description First
        const textResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Describe the UI/UX of a modern web application for: "${prompt}".
            Be specific about colors, layout, and atmosphere. Keep it under 50 words.`,
        });
        const description = textResponse.text || "A modern application interface.";

        // Generate Image
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: `High fidelity UI design mockup, modern web app, screenshot: ${description}` }]
            }
        });

        let image = "";
        for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                image = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
        
        return { image, description };
    } catch (e) {
        console.error("Preview generation failed", e);
        throw e;
    }
};

export const refineProjectPreview = async (currentImageBase64: string, modificationPrompt: string): Promise<{ image: string, description: string }> => {
    try {
        // Strip prefix if present
        const base64Data = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { 
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Data
                        } 
                    },
                    { text: `Redesign this UI screenshot based on the feedback: ${modificationPrompt}. Make it look high quality.` }
                ]
            }
        });

        let image = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                image = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
        
        return { image, description: `Updated design: ${modificationPrompt}` };
    } catch (e) {
        console.error("Refine preview failed", e);
        throw e;
    }
};

export const generateCourse = async (userPrompt: string, difficultyLevel: number, lengthLevel: number, visualDescription?: string, previewImage?: string, detailLevel: DetailLevel = 'balanced'): Promise<Course> => {
  try {
    let difficultyDesc = "";
    if (difficultyLevel < 30) difficultyDesc = "Novice (Absolute Beginner) - COMPLETE HAND HOLDING";
    else if (difficultyLevel < 50) difficultyDesc = "Beginner (Guided)";
    else if (difficultyLevel < 70) difficultyDesc = "Intermediate (Independent)";
    else difficultyDesc = "Advanced/Expert";

    const isComplexTopic = /neural|network|ai|machine learning|3d|three\.js|model|chart|graph|map/i.test(userPrompt);
    const libraryInjection = isComplexTopic 
        ? `IMPORTANT: This topic requires external libraries. You MUST include the necessary CDN script tags (e.g., <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>) in the 'initialCode' of the very first lesson.`
        : "";

    const detailPrompt = detailLevel === 'verbose' 
        ? "INSTRUCTIONS STYLE: Extremely detailed, explain every single attribute and tag. Use analogies."
        : detailLevel === 'concise'
        ? "INSTRUCTIONS STYLE: Brief, direct, bullet points. Focus purely on code tasks."
        : "INSTRUCTIONS STYLE: Balanced mix of concept and action.";

    const difficultyPrompt = `
      DIFFICULTY LEVEL: ${difficultyLevel}/100. (${difficultyDesc}).
      ${detailPrompt}
      
      CRITICAL INSTRUCTION RULES:
      1. **ALWAYS** use Markdown code blocks.
      2. If Level 0-50 (Novice/Beginner): 
         - PROVIDE THE EXACT CODE SOLUTION.
         - Tell the user explicitly: "Copy the code below..."
      3. If Level 51-100: Explain logic, provide signatures.
    `;

    let lessonCount = "3-5";
    if (lengthLevel < 33) lessonCount = "3-5 lessons";
    else if (lengthLevel < 66) lessonCount = "6-9 lessons";
    else lessonCount = "10-15 lessons";

    const visualContext = visualDescription 
        ? `VISUAL FIDELITY REQUIRED: The final code MUST produce an app that looks EXACTLY like this description: "${visualDescription}". Use the colors, layouts, and style described.` 
        : "";

    // 1. Generate Course Structure
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: `Create a comprehensive, interactive coding course for: "${userPrompt}". 
      
      TECHNICAL CONSTRAINTS:
      - HTML/CSS/JS (vanilla).
      ${libraryInjection}
      ${visualContext}
      
      LENGTH: ${lessonCount}.
      ${difficultyPrompt}

      STRUCTURE RULES:
      - Module 1, Lesson 1: 'initialCode' must be a valid HTML boilerplate (containing <html>, <head>, <body>).
      - 'instructions': USE MARKDOWN code blocks.
      - 'solutionCode': Hidden solution for hinting.
      
      Ensure 'finalOutcomeDescription' describes the visual design target provided.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: courseSchema,
        systemInstruction: "You are Zephyr, an expert technical curriculum designer. You create engaging, hands-on coding courses."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text) as Course;

    const processedCourse: Course = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      previewImage: previewImage, // Use the one passed from the Design Phase
      visualDescription: visualDescription,
      modules: data.modules.map((m, i) => ({
        ...m,
        id: m.id || `mod-${i}`,
        lessons: m.lessons.map((l, j) => ({
          ...l,
          id: l.id || `les-${i}-${j}`,
          completed: false,
          initialCode: (i === 0 && j === 0 && (!l.initialCode || l.initialCode.length > 50)) ? "" : l.initialCode
        }))
      }))
    };
    
    return processedCourse;
  } catch (error) {
    console.error("Course generation failed:", error);
    throw error;
  }
};

export const checkCode = async (currentCode: string, instructions: string, goal: string): Promise<{ passed: boolean; feedback: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: `Evaluate user code against goal: "${goal}" and instructions: "${instructions}".
      User Code:
      \`\`\`html
      ${currentCode}
      \`\`\`
      Return JSON: { "passed": boolean, "feedback": "Short constructive feedback." }`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { passed: { type: Type.BOOLEAN }, feedback: { type: Type.STRING } } } }
    });
    return JSON.parse(response.text || '{"passed":false,"feedback":"Error"}');
  } catch (error) {
    return { passed: false, feedback: "Error checking code." };
  }
};

export const chatWithMentor = async (history: {role: string, parts: {text: string}[]}[], newMessage: string, context: string) => {
    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        history: history,
        config: { systemInstruction: `You are Zephyr. Context: ${context}. Keep answers concise.`, tools: [{ googleSearch: {} }] }
    });
    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I couldn't generate a response.";
};

export const evaluateBadge = async (code: string): Promise<Badge | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze code: \n${code}\n Return JSON: { "awarded": boolean, "name": "Badge Name", "description": "Why", "icon": "Lucide Icon Name" }`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { awarded: { type: Type.BOOLEAN }, name: { type: Type.STRING }, description: { type: Type.STRING }, icon: { type: Type.STRING } } } }
        });
        const data = JSON.parse(response.text || "{}");
        if (data.awarded) return { id: crypto.randomUUID(), name: data.name, description: data.description, icon: data.icon, awardedAt: Date.now() };
        return null;
    } catch (e) { return null; }
}

export const generateLearnerSteps = async (code: string): Promise<LearnerStep[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Break down this solution code into SMALL, SINGLE-LINE typing steps for a student.
            
            FULL CODE: 
            ${code}

            RULES:
            1. Return JSON array of steps.
            2. "code": MUST be EXACTLY ONE line of code.
            3. "code": DO NOT include comments like "<!-- Write code here -->" or "// Code here". 
            4. "code": STRICTLY preserve indentation.
            5. "explanation": "Type [concept] to [reason]". Be specific. 
            6. "context": The line immediately preceding this new line.
            
            Remove any steps that are purely comments.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            code: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            context: { type: Type.STRING }
                        },
                        required: ['code', 'explanation']
                    }
                }
            }
        });
        
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return code.split('\n').filter(l => l.trim().length > 0).map(l => ({
            code: l,
            explanation: "Type this line."
        }));
    }
}

export const applyAiEdit = async (currentCode: string, selection: string, userInstruction: string): Promise<{ newCode: string, explanation: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context: ${currentCode}\nSelection: ${selection}\nInstruction: ${userInstruction}\nReturn JSON {newCode, explanation}`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { newCode: { type: Type.STRING }, explanation: { type: Type.STRING } } } }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { throw new Error("Failed to edit code"); }
}
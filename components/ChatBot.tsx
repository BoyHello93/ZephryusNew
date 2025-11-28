import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { chatWithMentor } from '../services/geminiService';
import { ChatMessage, Lesson } from '../types';

interface ChatBotProps {
  currentLesson?: Lesson;
}

const ChatBot: React.FC<ChatBotProps> = ({ currentLesson }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hi! I\'m Zephyr, your AI mentor. Stuck on a concept? Ask me anything!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const context = currentLesson 
        ? `Lesson: ${currentLesson.title}. Task: ${currentLesson.instructions}. Code Concept: ${currentLesson.concept}` 
        : "General Coding Help";

      const responseText = await chatWithMentor(history, userMsg.text, context);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: "I'm having trouble connecting right now. Please try again.",
        isError: true 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105 z-50 flex items-center gap-2"
      >
        <MessageCircle size={24} />
        <span className="font-semibold hidden md:inline">Ask Zephyr</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="bg-primary-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Bot size={20} />
          <h3 className="font-semibold">Zephyr AI</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-primary-500 p-1 rounded">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
              } ${msg.isError ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary-500" />
              <span className="text-xs text-slate-500">Zephyr is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-200">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="w-full bg-slate-100 border-none rounded-full py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-[10px] text-center text-slate-400 mt-2">
          AI can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
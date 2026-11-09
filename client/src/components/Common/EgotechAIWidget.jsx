import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  RotateCcw,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export default function EgotechAIWidget() {
  const { user, companyBranding } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user?.name ? user.name.split(' ')[0] : 'there'}! 👋 I am **Egotech AI**, your real-time HR & Statutory compliance assistant. I can explain your payslip deductions, check your leave quota, calculate gratuity under the 1972 Act, or walk you through the Labour Codes 50% rule. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState([
    'Why is TDS deducted from my payslip?',
    'What is the Labour Code 50% rule?',
    'Check my leave balance',
    'Calculate my gratuity eligibility',
    'Who is the POSH Presiding Officer?',
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (questionText) => {
    const textToSend = questionText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askAi(userMsg.content);
      const assistantMsg = {
        role: 'assistant',
        content: res.answer,
        category: res.category,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (res.suggestedActions && res.suggestedActions.length > 0) {
        setSuggestedActions(res.suggestedActions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue connecting to the Egotech AI engine. Please ensure backend services are active.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Conversation reset. Feel free to ask any query regarding salary, TDS, leaves, or statutory labor codes!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white rounded-full shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
          title="Open Egotech AI HR & Tax Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">Egotech AI</span>
        </button>
      )}

      {/* Floating Assistant Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 sm:w-[420px] h-[580px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-wide">Egotech AI Assistant</h3>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    Labour Code Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">Statutory Tax & HR Policy Advisor</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Restart conversation"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close Assistant"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-none'
                  }`}
                >
                  {m.content}
                  <div
                    className={`mt-1.5 text-[10px] text-right ${
                      m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs italic">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 p-2.5 rounded-2xl flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-slate-500 ml-1">Analyzing statutory rules...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto no-scrollbar flex gap-1.5">
            {suggestedActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleSend(action)}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-full border border-slate-200/80 transition-colors cursor-pointer shrink-0"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about TDS, Labour Codes, Gratuity, Leaves..."
              className="flex-1 py-2 px-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

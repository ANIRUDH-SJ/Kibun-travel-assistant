//v5
'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import MapView from '@/components/MapView';
import { Mic, Send, Globe, Loader2, StopCircle, Plus, Sparkles, Plane } from 'lucide-react';

//Components of loading page

const SuggestionChip = ({ text, onClick }: { text: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm whitespace-nowrap"
  >
    {text}
  </button>
);

//Main page

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, addMessage, language, setLanguage, setMapLocation } = useStore();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();

  //Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const processMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg = { role: 'user' as const, content: text };
    addMessage(userMsg);
    setInput(''); 
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, history: messages, language }),
      });
      const data = await res.json();

      let fullReply = data.reply;
      let displayContent = fullReply;

      //this is to have a structured response and not render any json on the response
      const parts = fullReply.split('___MAP_DATA___');
      
      if (parts.length > 1) {
        // Part 0 is the clean text, Part 1 is the JSON
        displayContent = parts[0].trim();
        const jsonString = parts[1].trim();
        
        try {
          const jsonData = JSON.parse(jsonString);
          if (jsonData.locations && jsonData.locations.length > 0) {
            setMapLocation(jsonData.locations[0]);
          }
        } catch (e) {
          console.error("Failed to parse map data JSON");
        }
      } else {
        // Fallback regex for safety in case LLM returns unseparated value
        const jsonMatch = fullReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
           try {
             const jsonData = JSON.parse(jsonMatch[0]);
             if (jsonData.locations) {
                setMapLocation(jsonData.locations[0]);
                displayContent = fullReply.replace(jsonMatch[0], '').trim();
             }
           } catch(e) {}
        }
      }

      addMessage({ role: 'assistant', content: displayContent });
    } catch (error) {
      addMessage({ role: 'assistant', content: "Sorry, I encountered an error." });
    } finally {
      setLoading(false);
    }
  };

  const handleAudioClick = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      
      setLoading(true);
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const data = await res.json();
        const transcribedText = data.text || "";
        setInput(transcribedText); 
        if (transcribedText.trim()) await processMessage(transcribedText);
      } catch (e) {
        setLoading(false); 
      }
    } else {
      startRecording();
    }
  };

  const handleNewChat = () => {
    window.location.reload();
  };

  //render

  const isLanding = messages.length === 0;

  return (
    <main className="flex h-screen bg-gradient-to-b from-blue-50 via-white to-white font-sans text-gray-900 overflow-hidden">
      
      {/*Top 2 buttons on right i.e lang toggle and new chat*/}
      <div className="fixed top-6 right-6 flex items-center gap-3 z-50">
        
        <div className="bg-white rounded-full p-1 shadow-sm border border-gray-200 flex items-center">
          <button 
            onClick={() => setLanguage('jp')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              language === 'jp' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            日本語
          </button>
          <button 
            onClick={() => setLanguage('en')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              language === 'en' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            English
          </button>
        </div>

        <button 
          onClick={handleNewChat}
          className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-full shadow-sm text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          {language === 'en' ? 'New Chat' : '新しいチャット'}
        </button>
      </div>

      {/*conditional layout rendering*/}

      {isLanding ? (
        //hero section
        <div className="w-full h-full flex flex-col items-center justify-center p-4 max-w-4xl mx-auto animate-in fade-in duration-700 pb-20">
          
          {/* Logo*/}
          <div className="mb-8 bg-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-600/20 rotate-3 hover:rotate-6 transition-transform">
             <Sparkles className="w-12 h-12 text-white" />
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight text-center">
            Kibun <span className="font-light text-gray-400">気分</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl text-gray-500 mb-16 max-w-2xl text-center leading-relaxed">
            {language === 'en' 
              ? 'Dress for the weather, explore by mood.' 
              : '気分に合わせて、天気に合った服装で出かけよう。'}
          </p>

          {/*Input Bar */}
          <div className="w-full max-w-2xl relative z-10 mb-10">
            <div className="bg-white p-2.5 rounded-full shadow-[0_8px_40px_rgb(0,0,0,0.08)] border border-gray-100 flex items-center transition-all hover:shadow-[0_12px_50px_rgb(0,0,0,0.12)] focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-50">
              <input 
                className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-xl text-gray-800 placeholder-gray-400"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'en' ? "Ask about the weather..." : "天気について聞いてください..."}
                onKeyDown={(e) => e.key === 'Enter' && processMessage(input)}
                disabled={loading}
                autoFocus
              />
              <div className="flex items-center gap-2 pr-2">
                <button 
                  onClick={handleAudioClick}
                  className={`p-4 rounded-full transition-all ${isRecording ? 'bg-red-50 text-red-500 scale-110' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                >
                  {isRecording ? <StopCircle className="animate-pulse w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button 
                  onClick={() => processMessage(input)}
                  disabled={!input.trim() || loading}
                  className="p-4 bg-gray-900 rounded-full text-white hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="flex flex-wrap justify-center gap-3 px-4">
            <SuggestionChip 
              text={language === 'en' ? "What to wear for climbing Mount Fuji?" : "富士登山には何を着ればいい？"} 
              onClick={() => processMessage(language === 'en' ? "What should I wear for climbing Mount Fuji?" : "富士登山には何を着ればいいですか？")}
            />
            <SuggestionChip 
              text={language === 'en' ? "Planning a trip to Osaka" : "大阪旅行の計画"} 
              onClick={() => processMessage(language === 'en' ? "Plan a trip to Osaka for me." : "大阪への旅行を計画して。")}
            />
            <SuggestionChip 
              text={language === 'en' ? "Sightseeing in Kyoto outfit?" : "京都観光の服装は？"} 
              onClick={() => processMessage(language === 'en' ? "What to wear for sightseeing in Kyoto?" : "京都観光には何を着ればいいですか？")}
            />
          </div>

        </div>
      ) : (
        //CHAT VIEW (Split Screen)
        <div className="flex w-full h-full gap-4 p-2 md:p-4">
          {/* Left: Chat Panel */}
          <div className="w-full md:w-1/3 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
            
            {/* Chat Header */}
            <div className="flex items-center p-4 border-b border-gray-100 bg-white">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                <Sparkles className="text-white w-4 h-4" onClick={handleNewChat} />
              </div>
              <h1 className="font-bold text-lg text-gray-900" onClick={handleNewChat}>
                Kibun <span className="font-normal opacity-60 ml-1 text-sm">気分</span>
              </h1>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`
                      max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm
                      ${m.role === 'user' 
                        ? 'bg-gray-900 text-white rounded-br-sm' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}
                    `}
                  >
                    {m.content.split('\n').map((line, idx) => (
                      <span key={idx}>{line}<br /></span>
                    ))}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-500">{language === 'en' ? 'Thinking...' : '考え中...'}</span>
                  </div>
                </div>
              )}
            </div>

            {/*Input Area */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex gap-2 items-center bg-gray-100 p-2 rounded-full border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <button 
                  onClick={handleAudioClick}
                  disabled={loading}
                  className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-400 hover:text-gray-600'}`}
                >
                  {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
                </button>
                <input 
                  className="flex-1 bg-transparent border-none outline-none px-2 text-sm text-gray-900"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={language === 'en' ? "Ask something..." : "何か聞いてください..."}
                  onKeyDown={(e) => e.key === 'Enter' && processMessage(input)}
                  disabled={isRecording || loading}
                />
                <button 
                  onClick={() => processMessage(input)} 
                  disabled={!input.trim() || loading}
                  className="p-2 bg-gray-900 text-white rounded-full hover:bg-black transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/*Map Panel */}
          <div className="hidden md:block w-2/3 h-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 relative animate-in fade-in duration-700 bg-white">
            <MapView />
          </div>
        </div>
      )}
    </main>
  );
}

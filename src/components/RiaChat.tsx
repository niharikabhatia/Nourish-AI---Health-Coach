import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, UserProfile, NutritionMetrics } from "../types";
import { Sparkles, Send, ShieldAlert } from "lucide-react";

interface ChatProps {
  profile: UserProfile;
  metrics: NutritionMetrics;
}

const suggestedPrompts = [
  "How can I fix the average 6-8% protein gap with a vegeterian Indian diet?",
  "Suggest simple low-glycemic complexes and diabetic-friendly snacks.",
  "How does NSO 2025's 48% cereal calorie baseline compare to healthy guidelines?"
];

export default function RiaChat({ profile, metrics }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Namaste! I am Swastika, your AI Nutrition, Fitness, and Healthy Lifestyle Coach.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      summary: "Welcome to Swastika!",
      explanation: "Using verified Indian wellness evidence, we correct standard macronutrient imbalances while maintaining regional habits.",
      recommendations: [
        "Customize your physical profile inside the tab panel.",
        "Query me about specific items like dhal, sattu, millets, high-protein snacks, or diabetic adjustments."
      ],
      sources: ["NSO NSS Report No. 594", "Sharma et al. (2020) EAT-Lancet comparison"]
    }
  ]);

  // Dynamically personalize the welcome message whenever the user profile or metrics update
  useEffect(() => {
    setMessages(prev => prev.map(m => {
      if (m.id === "welcome") {
        const medicalStr = profile.medicalConditions.filter(c => c !== "None").join(", ");
        const medicalPart = medicalStr ? `\n• Medical History: ${medicalStr}` : "";
        const allergiesPart = profile.allergies && !profile.allergies.toLowerCase().includes("none") 
          ? `\n• Allergens / Food Aversions: ${profile.allergies}` 
          : "";
        
        return {
          ...m,
          text: `Namaste! I am Swastika, your health AI coach. I have carefully personalized my recommendations for your profile:

• Demographic Status: ${profile.age} years old • ${profile.gender}
• Dimensions & Level: ${profile.height} cm • ${profile.weight} kg (Activity: ${profile.activityLevel})
• Primary Lifestyle Goal: ${profile.goal}
• Dietary Habit & Style: ${profile.dietaryPreference}${medicalPart}${allergiesPart}

📊 Personalized RDA Targets:
• Body Mass Index (BMI): ${metrics.bmi.toFixed(1)} (${metrics.bmiCategory})
• Target Energy: ${metrics.recommendedCalories} kcal / day
• Dedicated RDA Protein: ${metrics.proteinGrams} g / day (to correct standard micro-nutrient deficits)
• Cereal Cap Restriction: ${metrics.cerealLimitGrams} g / day (max 40% energy from starches)
• Hydration Guideline: ${metrics.waterLiters} L of water daily

How can I help you customize your meals, fitness routine, or healthy choices today? Ask me anything!`
        };
      }
      return m;
    }));
  }, [profile, metrics]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const feedEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          profile: profile,
          history: messages.map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: "assistant",
        text: data.summary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        summary: data.summary,
        explanation: data.explanation,
        recommendations: data.recommendations,
        sources: data.sources,
        confidence: data.confidence || "High",
        isEmergencyRedirect: data.isEmergencyRedirect
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat dispatch failure: ", error);
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: "assistant",
        text: "I met with a technical exception querying my server databases. Please ensure your backend is compiled or retry in a moment.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: "Low"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] min-h-[700px] md:h-[850px] lg:h-[950px] bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Prime chat panel */}
      <div className="flex-1 flex flex-col h-full bg-white">
        {/* Header bar describing Swastika */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden border-2 border-teal-500 shadow-md shadow-teal-500/10 bg-teal-50/50 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=200"
                alt="Swastika AI Avatar"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-white"></span>
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 font-sans tracking-tight">Swastika</h2>
              <span className="text-[10px] text-teal-600 font-medium select-none uppercase tracking-wider block mt-0.5">Your AI Nutrition & Lifestyle Coach</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 border border-teal-100 px-2.5 py-1 rounded-full bg-teal-50">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span className="text-[10px] font-bold text-teal-700 font-mono">Grounded RAG Mode</span>
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start max-w-xl space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-teal-50/50 flex items-center justify-center">
                      <img
                        src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=200"
                        alt="Avatar"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  )}
                  <div className="space-y-1 w-full">
                    <div
                      className={`px-5 py-4 rounded-2xl text-[13px] leading-relaxed select-all w-full ${
                        isUser
                          ? "bg-teal-600 text-white rounded-tr-none font-medium text-right shadow-sm"
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-none text-left shadow-sm space-y-3.5"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-line font-medium">{m.text}</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Main Response summary */}
                          <div className="text-[13px] text-slate-800 font-sans leading-relaxed whitespace-pre-line">
                            {m.text}
                          </div>

                          {/* Interactive Grounded Details inside message bubble */}
                          {(m.explanation || (m.recommendations && m.recommendations.length > 0) || (m.sources && m.sources.length > 0)) && (
                            <div className="border-t border-slate-100 pt-3.5 mt-3.5 space-y-3.5">
                              {/* RAG Confidence Label & Verified Badging */}
                              <div className="flex items-center justify-between">
                                <span className="text-[9.5px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">
                                  Verified Evidence Grounding
                                </span>
                                {m.confidence && (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                                    m.confidence === "High"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : m.confidence === "Medium"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}>
                                    Confidence: {m.confidence}
                                  </span>
                                )}
                              </div>

                              {/* Structured Scientific Explanation */}
                              {m.explanation && (
                                <div className="bg-slate-50/80 border border-slate-100 p-3 rounded-xl text-slate-700 text-[11.5px] leading-relaxed font-sans shadow-2xs">
                                  <h4 className="text-[9.5px] font-extrabold text-teal-800 uppercase tracking-widest mb-1 pointer-events-none">
                                    🔬 Scientific Basis &amp; Reasoning
                                  </h4>
                                  <p className="whitespace-pre-line text-slate-600">{m.explanation}</p>
                                </div>
                              )}

                              {/* Practical Guidelines List */}
                              {m.recommendations && m.recommendations.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-[9.5px] font-extrabold text-teal-800 uppercase tracking-widest pointer-events-none">
                                    📋 Corrective Guidelines &amp; Actions
                                  </h4>
                                  <ul className="grid grid-cols-1 gap-1.5 pl-1">
                                    {m.recommendations.map((rec, rIdx) => (
                                      <li key={rIdx} className="flex items-start space-x-2 text-slate-700 text-[11.5px] leading-relaxed font-medium font-sans">
                                        <span className="text-teal-600 shrink-0 font-bold select-none">✓</span>
                                        <span className="text-slate-650">{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Document references */}
                              {m.sources && m.sources.length > 0 && (
                                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider mr-1 pointer-events-none">Sources:</span>
                                  {m.sources.map((src, sIdx) => (
                                    <span key={sIdx} className="inline-flex items-center text-[10px] bg-teal-50 text-teal-850 font-bold px-2 py-0.5 rounded-lg border border-teal-100 max-w-[190px] truncate shadow-3xs font-sans">
                                      {src}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Redirect clinical flag */}
                      {m.isEmergencyRedirect && (
                        <div className="mt-2.5 flex items-center space-x-2 border border-red-200 bg-red-50 text-red-700 text-[11px] px-3 py-1.5 rounded-xl font-semibold">
                          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                          <span>Emergency response code triggered.</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono block text-right mt-0.5">{m.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center space-x-3 text-xs text-slate-500 font-mono pl-11">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="animate-pulse">Swastika is scanning nutritional papers, matching calories, and validating facts...</span>
            </div>
          )}

          <div ref={feedEndRef} />
        </div>

        {/* Suggestion prompt chips */}
        {messages.length <= 1 && (
          <div className="px-6 py-2 flex flex-wrap gap-2 bg-slate-50/20">
            {suggestedPrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(p)}
                className="text-[11px] font-sans font-medium bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 transition-colors px-3 py-1.5 rounded-xl text-teal-700 shadow-sm"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Text Input Drawer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="p-4 border-t border-slate-200 bg-slate-50/80 flex gap-3"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Swastika: 'Give me a Southern Indian breakfast' or 'Is white poha low Carb?'..."
            className="flex-1 bg-white border border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-400/50 transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-40 select-none text-white p-2.5 rounded-xl transition-all shadow-md shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

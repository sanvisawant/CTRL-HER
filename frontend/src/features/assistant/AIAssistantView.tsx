import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  api,
  type LearningAssistantResponse,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { DakshaLogo } from "../../components/common/DakshaLogo";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  FileText,
  HelpCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  data?: LearningAssistantResponse;
  isError?: boolean;
  retryQuery?: string;
}

export const AIAssistantView: React.FC = () => {
  const { t } = useTranslation();

  const SAMPLE_PROMPTS = [
    "Explain Stratified Random Sampling and multiplier estimation in NSSO surveys.",
    "What is Non-Sampling Error and how can field investigators minimize it?",
    "How is the Consumer Price Index (CPI) calculated and rebased in MoSPI?",
    "What are the data validation checks required in the Periodic Labour Force Survey (PLFS)?",
  ];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: t(
        "ai_assistant.welcome_msg",
        "Namaskar Officer! I am DakshaAI, your MoSPI in-service knowledge copilot. Every answer is grounded directly in official ministry survey manuals, sampling handbooks, and statistical guidelines with transparent provenance citations. How may I assist your work today?"
      ),
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.askLearningAssistant(q);
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        data: response,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.warn("AI Assistant request failed:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "Unable to retrieve an answer from the grounded knowledge index at this time. The statistical indexing service may be temporarily reconnecting.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
        retryQuery: q,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner (Compact & Dignified) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-blue-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-800/50 border border-blue-400/30 text-blue-200 text-[11px] font-semibold">
            <Bot className="w-3.5 h-3.5 text-blue-300" />
            <span>{t("ai_assistant.badge", "P3 Grounded Assistant & RAG Engine")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {t("ai_assistant.title", "DakshaAI — MoSPI Knowledge Copilot")}
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            {t("ai_assistant.subtitle", "Every answer is strictly grounded in official survey manuals, sampling guides, and circulars with verifiable source citations.")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-blue-950/70 border border-blue-700/50 px-3 py-1.5 rounded-lg text-xs text-blue-200 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-emerald-300">Grounded Guard Active</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 3 Cols: Message Feed */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="h-[580px] flex flex-col justify-between shadow-xs">
            <CardHeader className="py-2.5 px-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-xs">
                    <DakshaLogo size={20} theme="dark" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-blue-950">In-Service Consultation Session</CardTitle>
                    <CardDescription className="text-[10px]">
                      Dense 384-dimensional Sentence-Transformers + FAISS semantic retrieval
                    </CardDescription>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live RAG
                </span>
              </div>
            </CardHeader>

            {/* Messages Body */}
            <CardBody className="p-4 flex-1 overflow-y-auto space-y-3.5 bg-slate-50/40">
              {messages.map((m) => {
                const isUser = m.sender === "user";
                const isInsufficientContext =
                  !isUser &&
                  (m.data?.confidence === "LOW" ||
                    m.text.toLowerCase().includes("insufficient context") ||
                    m.text.toLowerCase().includes("not found"));

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed transition-all ${
                        isUser
                          ? "bg-blue-900 text-white rounded-br-xs shadow-xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {/* Assistant Header inside bubble */}
                      {!isUser && (
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <DakshaLogo size={16} />
                            <span className="font-extrabold text-[11px] text-blue-950">DakshaAI</span>
                          </div>
                          {m.data?.confidence && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.data.confidence === "HIGH"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : m.data.confidence === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {m.data.confidence} Confidence
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Content */}
                      {m.isError ? (
                        <div className="space-y-2">
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-900">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-semibold text-xs text-rose-900">Knowledge Copilot Unavailable</p>
                              <p className="text-[11px] text-rose-800 leading-snug">{m.text}</p>
                            </div>
                          </div>
                          {m.retryQuery && (
                            <button
                              type="button"
                              onClick={() => sendMessage(m.retryQuery!)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry Question
                            </button>
                          )}
                        </div>
                      ) : isInsufficientContext ? (
                        <div className="space-y-2">
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <p className="text-xs">
                              {m.text}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 italic">
                            Tip: Inquiries must correspond to indexed MoSPI manuals (e.g. Sampling multipliers, NSS field schedules, CPI rebasing indices).
                          </p>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.text}</p>
                      )}

                      {/* Grounded Provenance Citations */}
                      {m.data?.sources && m.data.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block">
                            Document Provenance & Verified Citations:
                          </span>
                          <div className="grid grid-cols-1 gap-1.5">
                            {m.data.sources.map((src, idx) => (
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-700 hover:bg-blue-50/50 hover:border-blue-200 transition-colors"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                                  <span className="font-semibold truncate">{src.document}</span>
                                </div>
                                {src.location && (
                                  <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                    {src.location}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                );
              })}

              {/* Multi-stage thinking animation */}
              {loading && (
                <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-xs shadow-xs w-fit animate-fade-in">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-900 animate-spin" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Analyzing query against MoSPI vector index</span>
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-900 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-900 animate-pulse delay-150" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-900 animate-pulse delay-300" />
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Cross-referencing statistical manuals and computing similarity scores...
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardBody>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("ai_assistant.input_placeholder", "Ask a question about MoSPI sampling manuals, PLFS methodology, CPI rebasing, or survey guidelines...")}
                  disabled={loading}
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-slate-900"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading || !input.trim()}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  {t("ai_assistant.send_btn", "Send Query")}
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Prompts & Knowledge Guidelines */}
        <div className="space-y-3.5">
          <Card className="shadow-xs">
            <CardHeader className="py-2.5 px-3.5 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("ai_assistant.suggested_prompts", "Common Officer Queries:")}
              </CardTitle>
            </CardHeader>
            <CardBody className="p-3 space-y-2">
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 hover:border-blue-900 hover:bg-blue-50/50 transition-all leading-snug flex items-start gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-900 shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </CardBody>
          </Card>

          <div className="p-3.5 bg-blue-950 border border-blue-800 rounded-xl text-white space-y-2 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className="font-bold text-xs">Official Boundary Standard</h4>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              DakshaAI adheres strictly to verified MoSPI training documents. Answers are derived verbatim or via dense semantic synthesis without creative hallucination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantView;


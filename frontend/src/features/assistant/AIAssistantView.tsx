import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  api,
  type LearningAssistantResponse,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
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
  const location = useLocation();

  const SAMPLE_PROMPTS = [
    { text: "Explain Stratified Random Sampling and multiplier estimation in NSSO surveys.", color: "border-indigo-200 bg-indigo-50/40 text-indigo-900 hover:bg-indigo-50 hover:border-indigo-400" },
    { text: "What is Non-Sampling Error and how can field investigators minimize it?", color: "border-emerald-200 bg-emerald-50/40 text-emerald-900 hover:bg-emerald-50 hover:border-emerald-400" },
    { text: "How is the Consumer Price Index (CPI) calculated and rebased in MoSPI?", color: "border-amber-200 bg-amber-50/40 text-amber-900 hover:bg-amber-50 hover:border-amber-400" },
    { text: "What are the data validation checks required in the Periodic Labour Force Survey (PLFS)?", color: "border-violet-200 bg-violet-50/40 text-violet-900 hover:bg-violet-50 hover:border-violet-400" },
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
  const queryTriggered = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // If redirected with a query state (e.g. from LearningView "Ask Copilot")
  useEffect(() => {
    const passedQuery = (location.state as any)?.query;
    if (passedQuery && !queryTriggered.current) {
      queryTriggered.current = true;
      sendMessage(passedQuery);
    }
  }, [location.state]);

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
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Light Spacious LMS Hero */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-violet-600 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" />
              AI Assistant
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {t("ai_assistant.title", "DakshaAI — MoSPI Knowledge Copilot")}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed mt-1">
              {t(
                "ai_assistant.subtitle",
                "Every answer is strictly grounded in official survey manuals, sampling guides, and circulars with verifiable source citations."
              )}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs text-emerald-800 shrink-0 self-start md:self-auto shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-bold">Grounded Guard Active</span>
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
                      className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed transition-all ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-br-xs shadow-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {/* Assistant Header inside bubble */}
                      {!isUser && (
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <DakshaLogo size={18} />
                            <span className="font-extrabold text-xs text-indigo-950">DakshaAI Copilot</span>
                          </div>
                          {m.data?.confidence && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-900">
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry Question
                            </button>
                          )}
                        </div>
                      ) : isInsufficientContext ? (
                        <div className="space-y-2">
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <p className="text-xs font-medium">
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
                          <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">
                            Document Provenance & Verified Citations:
                          </span>
                          <div className="grid grid-cols-1 gap-1.5">
                            {m.data.sources.map((src, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-[11px] text-slate-700 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span className="font-semibold truncate">{src.document}</span>
                                </div>
                                {src.location && (
                                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
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
                <div className="flex items-center gap-3 bg-white border border-slate-200/80 p-3.5 rounded-2xl rounded-tl-xs shadow-xs w-fit animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Analyzing query against MoSPI vector index</span>
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse delay-150" />
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse delay-300" />
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
            <div className="p-3.5 bg-white border-t border-slate-100 rounded-b-2xl">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("ai_assistant.input_placeholder", "Ask a question about MoSPI sampling manuals, PLFS methodology, CPI rebasing, or survey guidelines...")}
                    disabled={loading}
                    className="w-full pl-3.5 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                  />
                  <Sparkles className="w-4 h-4 text-violet-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>{t("ai_assistant.send_btn", "Send")}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Prompts & Knowledge Guidelines */}
        <div className="space-y-3.5">
          <Card className="shadow-xs rounded-2xl border-slate-200/80">
            <CardHeader className="py-3 px-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("ai_assistant.suggested_prompts", "Common Officer Queries:")}
              </CardTitle>
            </CardHeader>
            <CardBody className="p-3.5 space-y-2.5">
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(prompt.text)}
                  disabled={loading}
                  className={`w-full text-left p-3 rounded-xl border text-[11px] font-medium leading-snug flex items-start gap-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xs cursor-pointer ${prompt.color}`}
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-80" />
                  <span>{prompt.text}</span>
                </button>
              ))}
            </CardBody>
          </Card>

          <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 border border-indigo-100 rounded-2xl text-slate-800 space-y-2 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              </div>
              <h4 className="font-bold text-xs text-slate-900">Official Boundary Standard</h4>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              DakshaAI adheres strictly to verified MoSPI training documents. Answers are derived verbatim or via dense semantic synthesis without creative hallucination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantView;


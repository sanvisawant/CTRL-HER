import React, { useState } from "react";
import {
  api,
  type LearningAssistantResponse,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  FileText,
  HelpCircle,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  data?: LearningAssistantResponse;
}

const SAMPLE_PROMPTS = [
  "Explain Stratified Random Sampling and multiplier estimation in NSSO surveys.",
  "What is Non-Sampling Error and how can field investigators minimize it?",
  "How is the Consumer Price Index (CPI) calculated and rebased in MoSPI?",
  "What are the data validation checks required in the Periodic Labour Force Survey (PLFS)?",
];

export const AIAssistantView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Namaskar Officer! I am your MoSPI In-Service Learning Assistant, grounded strictly in official ministry survey manuals, sampling handbooks, and statistical methodologies. How may I assist your professional capacity building today?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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
        text: "I could not retrieve an answer from the grounded vector index at this time. Please verify that the backend FAISS index is loaded.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/40 border border-blue-400/30 text-blue-200 text-xs font-semibold">
            <Bot className="w-3.5 h-3.5" />
            <span>P3 Grounded RAG AI Assistant</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            MoSPI Institutional Knowledge Assistant
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            Strictly grounded answers with transparent citations and document provenance derived from the MoSPI knowledge base.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-700/40 px-3 py-1.5 rounded-xl text-xs text-blue-200">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Hallucination Guard Active</span>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 Cols: Message Feed */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="h-[560px] flex flex-col justify-between">
            <CardHeader className="py-3 px-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm">In-Service Consultation Session</CardTitle>
                  <CardDescription className="text-[11px]">
                    Grounded with Sentence-Transformers + FAISS semantic vector retrieval
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {/* Messages Body */}
            <CardBody className="p-5 flex-1 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.map((m) => {
                const isUser = m.sender === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                        isUser
                          ? "bg-blue-900 text-white rounded-br-none"
                          : "bg-white border border-slate-200 text-slate-900 rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>

                      {/* AI Citations & Confidence */}
                      {m.data && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Grounded RAG
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m.data.confidence === "HIGH"
                                  ? "bg-teal-100 text-teal-800"
                                  : m.data.confidence === "MEDIUM"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              Confidence: {m.data.confidence}
                            </span>
                          </div>

                          {m.data.sources && m.data.sources.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-600 block">Sources & Citations:</span>
                              {m.data.sources.map((src, idx) => (
                                <div
                                  key={idx}
                                  className="p-1.5 rounded bg-slate-50 border border-slate-200 flex items-center gap-2 text-[10px] text-slate-700"
                                >
                                  <FileText className="w-3 h-3 text-blue-900 shrink-0" />
                                  <span className="font-medium truncate">{src.document}</span>
                                  {src.location && (
                                    <span className="text-slate-400 shrink-0">({src.location})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 w-fit">
                  <Sparkles className="w-4 h-4 text-blue-900 animate-spin" />
                  <span>Searching MoSPI FAISS vector index & formulating grounded response...</span>
                </div>
              )}
            </CardBody>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a technical or methodology question regarding MoSPI operations..."
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all text-slate-900"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !input.trim()}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Ask
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Prompts & Knowledge Guidelines */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recommended Queries
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 pt-0 space-y-2">
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 hover:border-blue-900 hover:bg-blue-50/50 transition-all leading-snug flex items-start gap-2"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-blue-900 shrink-0 mt-0.5" />
                  <span>{prompt}</span>
                </button>
              ))}
            </CardBody>
          </Card>

          <div className="p-4 bg-blue-900 rounded-xl text-white space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold">Institutional AI Boundary</h4>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              This model does not extrapolate beyond the official ministry manuals provided in the training corpus. If an inquiry exceeds the indexed domain, it will indicate insufficient context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantView;

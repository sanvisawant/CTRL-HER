import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  api,
  type DocumentItem,
  type SearchResultItem,
} from "../../services/api";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import {
  BookOpen,
  Search,
  FileText,
  Bot,
  Target,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  FolderArchive,
  Layers,
} from "lucide-react";

export const LearningView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchDocuments();
      setDocuments(res.documents || []);
    } catch (err: unknown) {
      console.warn("Error fetching documents:", err);
      setError("Unable to load repository documents from P3 learning backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.semanticSearch(searchQuery.trim(), 5);
      setSearchResults(res.results || []);
    } catch (err: unknown) {
      console.warn("Semantic search failed:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner (Compact & Dignified) */}
      <div className="bg-gradient-to-r from-blue-900 via-teal-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-teal-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-800/50 border border-teal-400/30 text-teal-200 text-[11px] font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-teal-300" />
            <span>P3 Grounded Learning Subsystem</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            MoSPI Knowledge Repository & Official Guidelines
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            Official survey concepts, definitions, NSS manual references, and index vector embeddings for verified in-service learning.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/ai-assistant">
            <Button variant="secondary" size="sm" leftIcon={<Bot className="w-3.5 h-3.5" />}>
              Open AI Assistant
            </Button>
          </Link>
          <Link to="/assessment">
            <Button variant="saffron" size="sm" leftIcon={<Target className="w-3.5 h-3.5" />}>
              Practice Quiz
            </Button>
          </Link>
        </div>
      </div>

      {/* Semantic Search Bar */}
      <Card>
        <CardBody className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all MoSPI manuals (e.g., 'Stratified sampling multipliers', 'CPI inflation index', 'Non-sampling error')..."
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={searching}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="w-full sm:w-auto shrink-0"
              >
                {searching ? "Searching FAISS..." : "Vector Search"}
              </Button>
              {searchResults !== null && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={clearSearch}
                  className="shrink-0"
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Search Results Display */}
      {searchResults !== null && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">
                Semantic Search Results for: &ldquo;{searchQuery}&rdquo;
              </CardTitle>
              <CardDescription>
                Found {searchResults.length} relevant vector passages across indexed official documentation.
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No matching passages found. Try a different statistical keyword.
              </p>
            ) : (
              searchResults.map((res, i) => (
                <div
                  key={res.chunk_id || i}
                  className="p-4 rounded-xl border border-teal-100 bg-teal-50/40 hover:bg-teal-50/70 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-teal-800 font-semibold mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Source: {res.source || "Official MoSPI Manual"}
                    </span>
                    <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded text-[10px]">
                      Relevance: {(res.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    &ldquo;{res.text}&rdquo;
                  </p>
                  {res.location && (
                    <span className="text-[10px] text-slate-500 mt-2 block">
                      Location: {res.location}
                    </span>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <p className="font-bold">Notice</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Official Indexed Documents List */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-sm">Official Ingested Publications & Manuals</CardTitle>
            <CardDescription>
              Material embedded in the local FAISS vector index ready for RAG grounding and diagnostic question generation.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-900" />
              <p className="text-xs font-medium">Loading document library from P3 storage...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FolderArchive className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-semibold">No documents currently registered in the learning repository.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  className="p-4 border border-slate-200 rounded-xl bg-white hover:border-blue-900/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-900 uppercase">
                        {doc.file_type || "PDF"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        <CheckCircle2 className="w-3 h-3" /> {doc.status || "INDEXED"}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {doc.filename}
                    </h4>
                    {doc.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" /> {doc.chunks || 0} Chunks
                      </span>
                      <span>{doc.file_size_formatted || "2.4 MB"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to="/ai-assistant">
                        <Button variant="secondary" size="sm">
                          Study
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default LearningView;

import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  api,
  type DocumentItem,
  type SearchResultItem,
} from "../../services/api";
import { Button } from "../../components/common/Button";
import {
  BookOpen,
  Search,
  FileText,
  Bot,
  Target,
  Sparkles,
  RefreshCw,
  FolderArchive,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from "lucide-react";
import { ErrorState } from "../../components/common/ErrorState";
import { EmptyState } from "../../components/common/EmptyState";
import { CardSkeleton } from "../../components/common/SkeletonLoader";

export const LearningView: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);

  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgressStep, setUploadProgressStep] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchDocuments();
      setDocuments(res.documents || []);
    } catch (err: unknown) {
      console.warn("Error fetching documents:", err);
      setError(t("learning.error_loading", "Unable to load repository documents from P3 learning backend."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSearch = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!queryToSearch) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.semanticSearch(queryToSearch, 5);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const validExtensions = [".pdf", ".pptx", ".docx"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      setUploadError(
        t("learning.unsupported_file", "Unsupported file format. Please choose a PDF, PPTX, or DOCX document.")
      );
      setSelectedFile(null);
      return;
    }

    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSizeBytes) {
      setUploadError(
        t("learning.oversized_file", "File size exceeds 50MB maximum limit.")
      );
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setUploadError(t("learning.empty_file", "File is empty (0 bytes)."));
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadPipeline = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Step 1: Upload and extract/chunk
      setUploadProgressStep("1/3: Uploading & extracting document content...");
      const uploadRes = await api.uploadDocument(selectedFile);
      const docId = uploadRes.data?.document_id;

      if (!docId) {
        throw new Error(uploadRes.message || "Upload failed. No document ID generated.");
      }

      // Step 2: Generate Vector Embeddings
      setUploadProgressStep("2/3: Computing vector embeddings for contextual passages...");
      await api.embedDocument(docId);

      // Step 3: Index into FAISS Vector Store
      setUploadProgressStep("3/3: Indexing vectors into FAISS database & registering metadata...");
      await api.indexDocument(docId);

      setUploadSuccess(
        t("learning.upload_complete", `"${selectedFile.name}" successfully indexed into MoSPI Vector Knowledge Base!`)
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh repository
      await loadDocuments();
    } catch (err: unknown) {
      console.error("Document upload/indexing failed:", err);
      setUploadError(
        err instanceof Error
          ? err.message
          : t("learning.upload_failed", "Failed to process and index document. Please retry.")
      );
    } finally {
      setIsUploading(false);
      setUploadProgressStep(null);
    }
  };

  const getFileTypeBadge = (fileType?: string) => {
    const type = (fileType || "PDF").toUpperCase();
    if (type.includes("PDF")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (type.includes("DOC")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (type.includes("PPT")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Light, Spacious LMS Hero Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Knowledge Repository</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Knowledge Repository & Guidelines
            </h1>
            <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-teal-200/60 inline-flex items-center gap-1.5 shadow-2xs">
              <BookOpen className="w-3.5 h-3.5 text-teal-600" />
              FAISS Vector Indexed
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Official survey concepts, definitions, NSS manual references, and vector embeddings for verified in-service learning.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/ai-assistant">
            <button
              type="button"
              className="bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-2xs flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-violet-600" />
              <span>Ask DakshaAI</span>
            </button>
          </Link>
          <Link to="/assessment">
            <button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-indigo-200" />
              <span>Practice Quiz</span>
            </button>
          </Link>
        </div>
      </div>

      {/* High-Impact Document Upload Zone */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Upload MoSPI Circular or Survey Manual
              </h2>
              <p className="text-xs text-slate-500">
                Instantly process, chunk, and index official documents into FAISS vector database for AI-grounded learning.
              </p>
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
        {uploadSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        {/* Large Drag-and-Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              validateAndSetFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-8 sm:p-10 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.pptx,.docx"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
              {selectedFile ? selectedFile.name : "Drag and drop your document here, or click to browse"}
            </p>
            <p className="text-xs text-slate-500">
              Supports <span className="font-semibold text-rose-600">PDF</span>, <span className="font-semibold text-blue-600">DOCX</span>, or <span className="font-semibold text-amber-600">PPTX</span> up to 50MB
            </p>
          </div>

          {selectedFile && !isUploading && (
            <div className="mt-2 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-xs font-semibold text-indigo-900 shadow-2xs">
              <span>Selected: {selectedFile.name}</span>
              <span className="text-slate-400">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          )}
        </div>

        {/* Upload Action Row */}
        {selectedFile && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Clear
            </button>
            <Button
              variant="primary"
              size="md"
              onClick={handleUploadPipeline}
              disabled={isUploading}
              isLoading={isUploading}
              leftIcon={<UploadCloud className="w-4 h-4" />}
              className="rounded-xl shadow-md"
            >
              {isUploading ? "Processing & Indexing..." : "Process & Index into FAISS"}
            </Button>
          </div>
        )}

        {uploadProgressStep && (
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3 text-xs text-indigo-900 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
            <span className="font-medium">{uploadProgressStep}</span>
          </div>
        )}
      </div>

      {/* Semantic Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3.5">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search statistical concepts (e.g., 'sampling', 'Consumer Price Index methodology')..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="submit"
              disabled={searching}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{searching ? "Searching..." : "Vector Search"}</span>
            </button>
            {searchResults !== null && (
              <button
                type="button"
                onClick={clearSearch}
                className="px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-400 mr-1">Popular topics:</span>
          {["Sampling Design", "CPI Indexing", "Non-Sampling Error", "PLFS Indicators", "GDP Estimation"].map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => {
                setSearchQuery(kw);
                handleSearch(undefined, kw);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-medium text-xs transition-colors cursor-pointer border border-slate-200/80"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Display */}
      {searchResults !== null && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Vector Search Results for &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-xs text-slate-500">
              Found {searchResults.length} relevant vector passages across indexed official documentation.
            </p>
          </div>

          <div className="space-y-3">
            {searchResults.length === 0 ? (
              <EmptyState
                icon={<Search className="w-6 h-6 text-slate-400" />}
                title={t("learning.no_matches_title", "No Matching Passages Found")}
                description={t(
                  "learning.no_matches_desc",
                  `No vector passages in the indexed documentation matched "${searchQuery}". Searchable learning materials must be uploaded and indexed successfully into FAISS. Try broader keywords such as "sampling", "CPI methodology", or "PLFS".`
                )}
                actionText={t("learning.clear_query_action", "Clear Search Query")}
                onAction={clearSearch}
              />
            ) : (
              searchResults.map((res, i) => (
                <div
                  key={res.chunk_id || i}
                  className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-indigo-900 font-semibold mb-2">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{res.source || "Official MoSPI Manual"}</span>
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {(res.score * 100).toFixed(1)}% Match
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    &ldquo;{res.text}&rdquo;
                  </p>
                  {res.location && (
                    <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                      Location: {res.location}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && !loading && (
        <ErrorState
          compact={documents.length > 0}
          title="Repository Notice"
          message={error}
          onRetry={loadDocuments}
        />
      )}

      {/* Official Ingested Publications & Manuals Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Official Ingested Publications & Manuals
            </h2>
            <p className="text-xs text-slate-500">
              Material embedded in the local FAISS vector index ready for RAG grounding and diagnostic question generation.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDocuments}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <CardSkeleton key={n} lines={3} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<FolderArchive className="w-6 h-6 text-slate-400" />}
            title="No Ingested Documents"
            description="No official MoSPI manuals or guidelines are currently registered in P3 storage. Use the dropzone above to add learning materials."
            actionText="Refresh Repository"
            onAction={loadDocuments}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                className="p-5 border border-slate-200/90 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md border ${getFileTypeBadge(doc.file_type)}`}>
                      {doc.file_type || "PDF"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {doc.file_size_formatted || "—"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                    {doc.filename}
                  </h3>

                  {doc.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {doc.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> FAISS Indexed
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {doc.chunks || doc.text_blocks || 0} chunks
                    </span>
                  </div>

                  {/* Prominent Ask Copilot Quick Button */}
                  <Link
                    to="/ai-assistant"
                    state={{ query: `Explain the key concepts and sampling methodology from "${doc.filename}"` }}
                  >
                    <button
                      type="button"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200/60 flex items-center gap-1.5 transition-all duration-150 hover:-translate-y-0.5 cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      <span>Ask Copilot</span>
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningView;


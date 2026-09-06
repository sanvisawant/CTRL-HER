import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  RefreshCw,
  FolderArchive,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
  Layers,
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
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-teal-950 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 border border-teal-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-800/50 border border-teal-400/30 text-teal-200 text-[11px] font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-teal-300" />
            <span>{t("learning.badge", "P3 Grounded Learning Subsystem")}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            {t("learning.title", "MoSPI Knowledge Repository & Official Guidelines")}
          </h1>
          <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
            {t("learning.subtitle", "Official survey concepts, definitions, NSS manual references, and index vector embeddings for verified in-service learning.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outlineInvert"
            size="sm"
            onClick={() => setShowUploadModal(!showUploadModal)}
            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
          >
            {showUploadModal ? t("learning.hide_upload", "Close Upload") : t("learning.upload_btn", "Upload Document")}
          </Button>
          <Link to="/ai-assistant">
            <Button variant="secondary" size="sm" leftIcon={<Bot className="w-3.5 h-3.5" />}>
              {t("learning.ask_ai_btn", "Open AI Assistant")}
            </Button>
          </Link>
          <Link to="/assessment">
            <Button variant="saffron" size="sm" leftIcon={<Target className="w-3.5 h-3.5" />}>
              {t("learning.practice_quiz_btn", "Practice Quiz")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Upload Document Panel */}
      {showUploadModal && (
        <Card variant="accent" className="border-teal-500/40 bg-teal-50/20">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-teal-700" />
                <div>
                  <CardTitle className="text-sm">{t("learning.upload_card_title", "Upload Official MoSPI Document / Manual")}</CardTitle>
                  <CardDescription>
                    {t("learning.upload_card_desc", "Supported formats: PDF, PPTX, DOCX (Max 50MB). Uploaded documents are automatically chunked, embedded, and indexed into FAISS.")}
                  </CardDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {uploadError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx,.docx"
                onChange={handleFileChange}
                disabled={isUploading}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer border border-slate-200 rounded-lg p-1 bg-white"
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleUploadPipeline}
                disabled={!selectedFile || isUploading}
                isLoading={isUploading}
                leftIcon={<UploadCloud className="w-4 h-4" />}
                className="w-full sm:w-auto shrink-0"
              >
                {isUploading ? t("learning.processing_btn", "Processing...") : t("learning.start_upload_btn", "Process & Index Document")}
              </Button>
            </div>

            {uploadProgressStep && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-900 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-700 shrink-0" />
                <span>{uploadProgressStep}</span>
              </div>
            )}

            {selectedFile && !isUploading && (
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="font-semibold text-slate-800">{selectedFile.name}</span>
                <span>({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Semantic Search Bar */}
      <Card>
        <CardBody className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("learning.search_placeholder", "Search statistical concepts (e.g., 'sampling', 'Consumer Price Index methodology')...")}
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
                {searching ? t("learning.searching_btn", "Searching FAISS...") : t("learning.search_btn", "Vector Search")}
              </Button>
              {searchResults !== null && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={clearSearch}
                  className="shrink-0"
                >
                  {t("learning.clear_btn", "Clear")}
                </Button>
              )}
            </div>
          </form>

          {/* Quick search suggestion tags */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-medium">{t("learning.suggestions_label", "Try searching:")}</span>
            {["sampling", "Consumer Price Index methodology", "Stratified sampling", "PLFS indicators", "GDP compilation"].map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => {
                  setSearchQuery(kw);
                  handleSearch(undefined, kw);
                }}
                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 transition-colors cursor-pointer border border-slate-200"
              >
                {kw}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Search Results Display */}
      {searchResults !== null && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-sm">
                {t("learning.search_results_title", "Semantic Search Results for:")} &ldquo;{searchQuery}&rdquo;
              </CardTitle>
              <CardDescription>
                {t("learning.search_results_sub", `Found ${searchResults.length} relevant vector passages across indexed official documentation.`)}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
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
                  className="p-4 rounded-xl border border-teal-100 bg-teal-50/40 hover:bg-teal-50/70 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-teal-800 font-semibold mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> {t("learning.source_label", "Source:")} {res.source || "Official MoSPI Manual"}
                    </span>
                    <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded text-[10px]">
                      {t("learning.relevance_label", "Relevance:")} {(res.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    &ldquo;{res.text}&rdquo;
                  </p>
                  {res.location && (
                    <span className="text-[10px] text-slate-500 mt-2 block">
                      {t("learning.location_label", "Location:")} {res.location}
                    </span>
                  )}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* Error Notice */}
      {error && !loading && (
        <ErrorState
          compact={documents.length > 0}
          title={t("learning.repo_notice_title", "Repository Service Notice")}
          message={error}
          onRetry={loadDocuments}
        />
      )}

      {/* Official Indexed Documents List */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-sm">{t("learning.publications_title", "Official Ingested Publications & Manuals")}</CardTitle>
            <CardDescription>
              {t("learning.publications_sub", "Material embedded in the local FAISS vector index ready for RAG grounding and diagnostic question generation.")}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            {t("learning.refresh_btn", "Refresh")}
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <CardSkeleton key={n} lines={3} />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={<FolderArchive className="w-6 h-6 text-slate-400" />}
              title={t("learning.no_docs_title", "No Ingested Documents")}
              description={t("learning.no_docs_desc", "No official MoSPI manuals or guidelines are currently registered in P3 storage. Use 'Upload Document' to add learning materials.")}
              actionText={t("learning.refresh_repo_action", "Refresh Repository")}
              onAction={loadDocuments}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  className="p-4 border border-slate-200 rounded-xl bg-white hover:border-blue-900/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-50 text-teal-800 border border-teal-200">
                        {doc.file_type || "PDF"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {doc.file_size_formatted || "—"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {doc.filename}
                    </h4>
                    {doc.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {doc.chunks || doc.text_blocks || 0} chunks indexed
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> FAISS Indexed
                    </span>
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

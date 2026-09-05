import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from config import settings
from models.document import (
    DocumentUploadResponse,
    DocumentMetadata,
    DocumentListResponse,
    ExtractedBlock,
    DocumentPreviewResponse,
    DocumentChunk,
    DocumentChunksResponse,
    DocumentStatusResponse,
    EmbedResponse,
    IndexResponse
)
from services.document_processor import process_document
from services.content_cleaner import clean_extracted_blocks
from services.chunker import chunk_document

router = APIRouter(prefix="/documents", tags=["Documents"])

# In-memory document metadata database
_documents_db: Dict[str, DocumentMetadata] = {}

# Pre-populate sample documents for India's Official Statistical System
_sample_documents = [
    DocumentMetadata(
        document_id="doc_nss_78th",
        filename="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
        file_type="pdf",
        file_size_bytes=3450000,
        file_size_formatted="3.4 MB",
        uploaded_at="2026-08-28T10:15:00",
        status="CHUNKED",
        pages=12,
        text_blocks=24,
        chunks=3,
        description="National Sample Survey guidelines on household characteristics, education, and migration indicators."
    ),
    DocumentMetadata(
        document_id="doc_cpi_manual",
        filename="Consumer_Price_Index_Compilation_Manual.docx",
        file_type="docx",
        file_size_bytes=1820000,
        file_size_formatted="1.8 MB",
        uploaded_at="2026-08-30T14:30:00",
        status="CHUNKED",
        pages=8,
        text_blocks=16,
        chunks=2,
        description="Methodological guidelines for price collection, weight revision, and Laspeyres price index calculation."
    ),
    DocumentMetadata(
        document_id="doc_sdg_indicators",
        filename="National_Indicator_Framework_SDG_India.pptx",
        file_type="pptx",
        file_size_bytes=5200000,
        file_size_formatted="5.2 MB",
        uploaded_at="2026-09-01T09:00:00",
        status="CHUNKED",
        pages=15,
        text_blocks=30,
        chunks=2,
        description="MoSPI official presentation on tracking 169 Sustainable Development Goal targets."
    )
]

# Sample extracted blocks for default prototype materials
_sample_extracted_blocks: Dict[str, List[ExtractedBlock]] = {
    "doc_nss_78th": [
        ExtractedBlock(
            document_id="doc_nss_78th",
            source="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            location="Page 1",
            text="NATIONAL SAMPLE SURVEY OFFICE (NSSO)\n78th Round Instruction Manual for Field Staff\nMultiple Indicator Survey: Objectives, Scope and Key Statistical Concepts."
        ),
        ExtractedBlock(
            document_id="doc_nss_78th",
            source="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            location="Page 2",
            text="Section I: Sampling Design & Stratification\nA multi-stage stratified sampling design was used. The first stage units (FSU) were census villages in rural areas and Urban Frame Survey (UFS) blocks in urban areas."
        ),
        ExtractedBlock(
            document_id="doc_nss_78th",
            source="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            location="Page 3",
            text="Section II: Estimation Procedure\nLet y_hij be the value of characteristic y for the j-th sample household in the i-th FSU of the h-th stratum. Formula for multiplier calculation W_h = N_h / n_h."
        )
    ],
    "doc_cpi_manual": [
        ExtractedBlock(
            document_id="doc_cpi_manual",
            source="Consumer_Price_Index_Compilation_Manual.docx",
            location="Chapter 1: Price Collection Methodology (Para 1)",
            text="Consumer Price Index (CPI) measures changes over time in the general level of prices of goods and services that a reference population acquires, uses or pays for consumption."
        ),
        ExtractedBlock(
            document_id="doc_cpi_manual",
            source="Consumer_Price_Index_Compilation_Manual.docx",
            location="Chapter 2: Index Formula (Para 2)",
            text="The Modified Laspeyres Index Formula is defined as: I_t = [ Sum( (p_it / p_i0) * w_i0 ) / Sum( w_i0 ) ] * 100, where p_it is current price, p_i0 is base price, and w_i0 is base item weight."
        )
    ],
    "doc_sdg_indicators": [
        ExtractedBlock(
            document_id="doc_sdg_indicators",
            source="National_Indicator_Framework_SDG_India.pptx",
            location="Slide 1",
            text="Ministry of Statistics & Programme Implementation (MoSPI)\nNational Indicator Framework for Sustainable Development Goals (SDGs)"
        ),
        ExtractedBlock(
            document_id="doc_sdg_indicators",
            source="National_Indicator_Framework_SDG_India.pptx",
            location="Slide 2",
            text="Goal 8: Decent Work & Economic Growth\nIndicator 8.1.1: Annual growth rate of real GDP per capita.\nIndicator 8.5.2: Unemployment rate by sex and age group based on PLFS data."
        )
    ]
}

# Sample chunks pre-populated for prototype default materials
_sample_chunks: Dict[str, List[DocumentChunk]] = {
    "doc_nss_78th": [
        DocumentChunk(
            chunk_id="doc_nss_78th_chunk_001",
            document_id="doc_nss_78th",
            chunk_index=1,
            text="NATIONAL SAMPLE SURVEY OFFICE (NSSO)\n78th Round Instruction Manual for Field Staff\nMultiple Indicator Survey: Objectives, Scope and Key Statistical Concepts.",
            source="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            location="Page 1",
            locations=["Page 1"],
            word_count=21
        ),
        DocumentChunk(
            chunk_id="doc_nss_78th_chunk_002",
            document_id="doc_nss_78th",
            chunk_index=2,
            text="Section I: Sampling Design & Stratification\nA multi-stage stratified sampling design was used. The first stage units (FSU) were census villages in rural areas and Urban Frame Survey (UFS) blocks in urban areas.",
            source="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            location="Page 2",
            locations=["Page 2"],
            word_count=28
        ),
        DocumentChunk(
            chunk_id="doc_nss_78th_chunk_003",
            document_id="doc_nss_78th",
            chunk_index=3,
            text="Section II: Estimation Procedure\nLet y_hij be the value of characteristic y for the j-th sample household in the i-th FSU of the h-th stratum. Formula for multiplier calculation W_h = N_h / n_h.",
            source="NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            location="Page 3",
            locations=["Page 3"],
            word_count=28
        )
    ],
    "doc_cpi_manual": [
        DocumentChunk(
            chunk_id="doc_cpi_manual_chunk_001",
            document_id="doc_cpi_manual",
            chunk_index=1,
            text="Consumer Price Index (CPI) measures changes over time in the general level of prices of goods and services that a reference population acquires, uses or pays for consumption.",
            source="Consumer_Price_Index_Compilation_Manual.docx",
            location="Chapter 1: Price Collection Methodology (Para 1)",
            locations=["Chapter 1: Price Collection Methodology (Para 1)"],
            word_count=26
        ),
        DocumentChunk(
            chunk_id="doc_cpi_manual_chunk_002",
            document_id="doc_cpi_manual",
            chunk_index=2,
            text="The Modified Laspeyres Index Formula is defined as: I_t = [ Sum( (p_it / p_i0) * w_i0 ) / Sum( w_i0 ) ] * 100, where p_it is current price, p_i0 is base price, and w_i0 is base item weight.",
            source="Consumer_Price_Index_Compilation_Manual.docx",
            location="Chapter 2: Index Formula (Para 2)",
            locations=["Chapter 2: Index Formula (Para 2)"],
            word_count=35
        )
    ],
    "doc_sdg_indicators": [
        DocumentChunk(
            chunk_id="doc_sdg_indicators_chunk_001",
            document_id="doc_sdg_indicators",
            chunk_index=1,
            text="Ministry of Statistics & Programme Implementation (MoSPI)\nNational Indicator Framework for Sustainable Development Goals (SDGs)",
            source="National_Indicator_Framework_SDG_India.pptx",
            location="Slide 1",
            locations=["Slide 1"],
            word_count=13
        ),
        DocumentChunk(
            chunk_id="doc_sdg_indicators_chunk_002",
            document_id="doc_sdg_indicators",
            chunk_index=2,
            text="Goal 8: Decent Work & Economic Growth\nIndicator 8.1.1: Annual growth rate of real GDP per capita.\nIndicator 8.5.2: Unemployment rate by sex and age group based on PLFS data.",
            source="National_Indicator_Framework_SDG_India.pptx",
            location="Slide 2",
            locations=["Slide 2"],
            word_count=27
        )
    ]
}

for doc in _sample_documents:
    _documents_db[doc.document_id] = doc


def format_file_size(size_in_bytes: int) -> str:
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes / 1024:.1f} KB"
    else:
        return f"{size_in_bytes / (1024 * 1024):.1f} MB"


def _save_extracted_json(document_id: str, blocks: List[ExtractedBlock]):
    json_path = settings.EXTRACTED_DIR / f"{document_id}.json"
    data = [block.model_dump() for block in blocks]
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _load_extracted_json(document_id: str) -> List[ExtractedBlock]:
    json_path = settings.EXTRACTED_DIR / f"{document_id}.json"
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            return [ExtractedBlock(**item) for item in raw]
    if document_id in _sample_extracted_blocks:
        return _sample_extracted_blocks[document_id]
    return []


def _save_chunks_json(document_id: str, chunks: List[DocumentChunk]):
    json_path = settings.CHUNKS_DIR / f"{document_id}.json"
    data = {
        "document_id": document_id,
        "chunk_count": len(chunks),
        "chunks": [chunk.model_dump() for chunk in chunks]
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _load_chunks_json(document_id: str) -> List[DocumentChunk]:
    json_path = settings.CHUNKS_DIR / f"{document_id}.json"
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            return [DocumentChunk(**item) for item in raw.get("chunks", [])]
    if document_id in _sample_chunks:
        return _sample_chunks[document_id]
    return []


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)):
    """
    Complete Phase 2 Pipeline:
    Upload ➔ Validate ➔ Save ➔ Extract ➔ Clean ➔ Chunk ➔ Store
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        allowed_str = ", ".join(sorted(list(settings.ALLOWED_EXTENSIONS)))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {allowed_str}"
        )

    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    clean_filename = f"{doc_id}_{file.filename}"
    save_path = settings.UPLOAD_DIR / clean_filename

    # 1. Save File
    try:
        with open(save_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file to disk: {str(e)}"
        )

    # 2. Extract Text Content
    raw_blocks: List[ExtractedBlock] = []
    cleaned_blocks: List[ExtractedBlock] = []
    chunks: List[DocumentChunk] = []
    proc_status = "CHUNKED"
    pages_count = 0

    try:
        raw_blocks = process_document(
            file_path=save_path,
            file_type=file_ext,
            document_id=doc_id,
            filename=file.filename
        )
        
        if not raw_blocks:
            proc_status = "FAILED"
            msg = f"Document '{file.filename}' contained no readable text."
        else:
            # Calculate pages/slides count
            locations = {b.location for b in raw_blocks if b.location}
            pages_count = len(locations)
            
            # 3. Conservative Clean
            cleaned_blocks = clean_extracted_blocks(raw_blocks)
            _save_extracted_json(doc_id, cleaned_blocks)

            # 4. Structure-Aware Chunking
            chunks = chunk_document(
                blocks=cleaned_blocks,
                document_id=doc_id,
                filename=file.filename
            )
            _save_chunks_json(doc_id, chunks)

            msg = f"Document '{file.filename}' successfully processed and divided into {len(chunks)} chunks."

    except Exception as e:
        proc_status = "FAILED"
        msg = f"Document processing failed: {str(e)}"

    metadata = DocumentMetadata(
        document_id=doc_id,
        filename=file.filename,
        file_type=file_ext.lstrip('.'),
        file_size_bytes=file_size,
        file_size_formatted=format_file_size(file_size),
        uploaded_at=datetime.utcnow().isoformat(),
        status=proc_status,
        pages=pages_count,
        text_blocks=len(cleaned_blocks),
        chunks=len(chunks),
        description=f"Material cleaned & divided into {len(chunks)} contextual chunks ready for vector indexation."
    )

    _documents_db[doc_id] = metadata

    return DocumentUploadResponse(
        success=(proc_status == "CHUNKED"),
        message=msg,
        data=metadata
    )


@router.get("", response_model=DocumentListResponse)
def list_documents():
    docs = list(_documents_db.values())
    return DocumentListResponse(
        total=len(docs),
        documents=docs
    )


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
def get_document_status(document_id: str):
    """Retrieve current processing status and metrics for a document."""
    if document_id not in _documents_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )
        
    doc = _documents_db[document_id]
    progress_map = {
        "uploaded": 15,
        "TEXT_EXTRACTED": 40,
        "CHUNKED": 60,
        "EMBEDDING": 72,
        "EMBEDDED": 82,
        "INDEXING": 92,
        "INDEXED": 100,
        "FAILED": 0
    }

    # Read embedding count from saved file if present
    emb_count = 0
    emb_dim = 0
    emb_path = settings.EMBEDDINGS_DIR / f"{document_id}.json"
    if emb_path.exists():
        try:
            with open(emb_path, "r", encoding="utf-8") as f:
                emb_data = json.load(f)
            emb_count = len(emb_data.get("embeddings", []))
            emb_dim = emb_data.get("dimension", 0)
        except Exception:
            pass

    return DocumentStatusResponse(
        document_id=doc.document_id,
        status=doc.status,
        progress=progress_map.get(doc.status, 0),
        pages=doc.pages,
        text_blocks=doc.text_blocks,
        chunks=doc.chunks,
        embeddings=emb_count,
        embedding_dimension=emb_dim
    )


@router.get("/{document_id}/preview", response_model=DocumentPreviewResponse)
def preview_document(document_id: str):
    if document_id not in _documents_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )

    doc_meta = _documents_db[document_id]
    blocks = _load_extracted_json(document_id)

    return DocumentPreviewResponse(
        document_id=doc_meta.document_id,
        filename=doc_meta.filename,
        file_type=doc_meta.file_type,
        pages=doc_meta.pages,
        text_blocks=len(blocks),
        content=blocks
    )


@router.get("/{document_id}/chunks", response_model=DocumentChunksResponse)
def get_document_chunks(document_id: str):
    """Retrieve all generated contextual chunks for a document."""
    if document_id not in _documents_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )

    doc_meta = _documents_db[document_id]
    chunks = _load_chunks_json(document_id)

    return DocumentChunksResponse(
        document_id=doc_meta.document_id,
        filename=doc_meta.filename,
        chunk_count=len(chunks),
        chunks=chunks
    )


@router.post("/{document_id}/embed", response_model=EmbedResponse)
def embed_document(document_id: str):
    """
    Generate and store embeddings for all chunks of a document.
    Skips generation if an up-to-date embedding file already exists.
    """
    if document_id not in _documents_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )

    doc = _documents_db[document_id]
    chunks = _load_chunks_json(document_id)

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document '{document_id}' has no chunks. Run the upload pipeline first."
        )

    from services.embedding_service import get_embedding_service
    emb_service = get_embedding_service()
    emb_path = settings.EMBEDDINGS_DIR / f"{document_id}.json"

    # Skip re-embedding if an up-to-date file already exists
    if emb_path.exists():
        try:
            with open(emb_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            if (
                existing.get("document_id") == document_id
                and existing.get("embedding_model") == settings.EMBEDDING_MODEL
                and existing.get("dimension") == settings.EMBEDDING_DIMENSION
                and len(existing.get("embeddings", [])) == len(chunks)
            ):
                return EmbedResponse(
                    document_id=document_id,
                    status="EMBEDDED",
                    chunks_embedded=len(existing["embeddings"]),
                    embedding_dimension=existing["dimension"],
                    embedding_model=existing["embedding_model"],
                    skipped=True
                )
        except Exception:
            pass  # File is malformed — regenerate

    # Update in-memory status to EMBEDDING while we generate
    _documents_db[document_id] = doc.model_copy(update={"status": "EMBEDDING"})

    try:
        texts = [c.text for c in chunks]
        vectors = emb_service.embed_texts(texts)
        dim = emb_service.dimension

        embeddings_payload = [
            {
                "chunk_id": chunk.chunk_id,
                "chunk_index": chunk.chunk_index,
                "vector": vector,
                "text": chunk.text,
                "source": chunk.source,
                "location": chunk.location,
                "locations": chunk.locations,
                "word_count": chunk.word_count
            }
            for chunk, vector in zip(chunks, vectors)
        ]

        output = {
            "document_id": document_id,
            "embedding_model": settings.EMBEDDING_MODEL,
            "dimension": dim,
            "embeddings": embeddings_payload
        }

        with open(emb_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False)

        _documents_db[document_id] = doc.model_copy(update={
            "status": "EMBEDDED",
            "embeddings": len(vectors)
        })

        return EmbedResponse(
            document_id=document_id,
            status="EMBEDDED",
            chunks_embedded=len(vectors),
            embedding_dimension=dim,
            embedding_model=settings.EMBEDDING_MODEL
        )

    except Exception as e:
        _documents_db[document_id] = doc.model_copy(update={"status": "FAILED"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {str(e)}"
        )


@router.post("/{document_id}/index", response_model=IndexResponse)
def index_document(document_id: str):
    """
    Add a document's embeddings into the shared FAISS vector index.
    Idempotent: repeated calls return ALREADY_INDEXED without duplicating vectors.
    """
    if document_id not in _documents_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )

    emb_path = settings.EMBEDDINGS_DIR / f"{document_id}.json"
    if not emb_path.exists():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No embeddings found for '{document_id}'. Run /embed first."
        )

    from services.vector_store import get_vector_store
    vs = get_vector_store()

    # Idempotency check — no duplicates
    if vs.document_exists(document_id):
        return IndexResponse(
            document_id=document_id,
            status="ALREADY_INDEXED",
            chunks_indexed=0,
            total_vectors=vs.total_vectors,
            embedding_dimension=settings.EMBEDDING_DIMENSION,
            skipped=True
        )

    doc = _documents_db[document_id]
    _documents_db[document_id] = doc.model_copy(update={"status": "INDEXING"})

    try:
        with open(emb_path, "r", encoding="utf-8") as f:
            emb_data = json.load(f)

        embeddings = emb_data.get("embeddings", [])
        if not embeddings:
            raise ValueError("Embedding file contains no vectors.")

        # Attach embedding model to metadata on first index
        vs._ensure_loaded()
        if not vs._metadata.get("embedding_model"):
            vs._metadata["embedding_model"] = emb_data.get(
                "embedding_model", settings.EMBEDDING_MODEL
            )

        added = vs.add_document_embeddings(document_id, embeddings)
        vs.save()

        _documents_db[document_id] = doc.model_copy(update={"status": "INDEXED"})

        return IndexResponse(
            document_id=document_id,
            status="INDEXED",
            chunks_indexed=added,
            total_vectors=vs.total_vectors,
            embedding_dimension=settings.EMBEDDING_DIMENSION
        )

    except ValueError as e:
        _documents_db[document_id] = doc.model_copy(update={"status": "FAILED"})
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        _documents_db[document_id] = doc.model_copy(update={"status": "FAILED"})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing failed: {str(e)}"
        )

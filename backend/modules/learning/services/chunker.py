import re
from typing import List, Set, Optional
from models.document import ExtractedBlock, DocumentChunk
from config import settings

def _count_words(text: str) -> int:
    """Approximate token/word count by whitespace splitting."""
    return len(re.findall(r'\S+', text))


def _split_text_into_sentences(text: str) -> List[str]:
    """Split text into sentence units respecting standard statistical abbreviations."""
    # Split on sentence ending punctuation followed by space or newline
    sentence_pattern = r'(?<=[.!?])\s+'
    raw_sentences = re.split(sentence_pattern, text)
    sentences = [s.strip() for s in raw_sentences if s.strip()]
    return sentences if sentences else [text]


def chunk_document(
    blocks: List[ExtractedBlock],
    document_id: str,
    filename: str,
    chunk_size: Optional[int] = None,
    overlap: Optional[int] = None
) -> List[DocumentChunk]:
    """
    Structure-aware, boundary-respecting text chunker.
    Groups extracted blocks into chunks targeting ~chunk_size words with ~overlap words overlap.
    """
    target_size = chunk_size if chunk_size is not None else settings.CHUNK_SIZE
    overlap_size = overlap if overlap is not None else settings.CHUNK_OVERLAP

    if not blocks:
        return []

    # 1. Break extracted blocks into elementary units (Paragraph / Sentence level) with metadata
    class Units:
        def __init__(self, text: str, location: Optional[str]):
            self.text = text
            self.location = location
            self.word_count = _count_words(text)

    elementary_units: List[Units] = []
    
    for block in blocks:
        # Split block text by double newlines (paragraphs)
        paragraphs = [p.strip() for p in block.text.split('\n\n') if p.strip()]
        if not paragraphs:
            paragraphs = [block.text.strip()]

        for para in paragraphs:
            para_words = _count_words(para)
            # If paragraph fits comfortably, keep as single unit
            if para_words <= target_size:
                elementary_units.append(Units(para, block.location))
            else:
                # If paragraph is too large, split into sentences
                sentences = _split_text_into_sentences(para)
                for sentence in sentences:
                    elementary_units.append(Units(sentence, block.location))

    # 2. Build sliding window chunks
    chunks: List[DocumentChunk] = []
    current_units: List[Units] = []
    current_word_count = 0
    chunk_idx = 1

    for unit in elementary_units:
        # If adding unit keeps us within or near target size, append
        if current_word_count + unit.word_count <= target_size or not current_units:
            current_units.append(unit)
            current_word_count += unit.word_count
        else:
            # Emit current chunk
            chunk_text = "\n\n".join(u.text for u in current_units)
            locs = list(dict.fromkeys(u.location for u in current_units if u.location))
            primary_loc = locs[0] if locs else None

            chunk_id = f"{document_id}_chunk_{chunk_idx:03d}"
            chunks.append(
                DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    chunk_index=chunk_idx,
                    text=chunk_text,
                    source=filename,
                    location=primary_loc,
                    locations=locs,
                    word_count=current_word_count
                )
            )
            chunk_idx += 1

            # Prepare next window with overlap
            overlap_units: List[Units] = []
            overlap_words = 0
            for u in reversed(current_units):
                if overlap_words + u.word_count <= overlap_size:
                    overlap_units.insert(0, u)
                    overlap_words += u.word_count
                else:
                    break

            current_units = overlap_units + [unit]
            current_word_count = sum(u.word_count for u in current_units)

    # Emit final remaining chunk
    if current_units:
        chunk_text = "\n\n".join(u.text for u in current_units)
        locs = list(dict.fromkeys(u.location for u in current_units if u.location))
        primary_loc = locs[0] if locs else None

        chunk_id = f"{document_id}_chunk_{chunk_idx:03d}"
        chunks.append(
            DocumentChunk(
                chunk_id=chunk_id,
                document_id=document_id,
                chunk_index=chunk_idx,
                text=chunk_text,
                source=filename,
                location=primary_loc,
                locations=locs,
                word_count=current_word_count
            )
        )

    return chunks

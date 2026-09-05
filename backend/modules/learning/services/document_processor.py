import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
from models.document import ExtractedBlock

logger = logging.getLogger(__name__)

def _clean_text(text: str) -> str:
    """
    Basic text cleaning:
    - Remove excessive blank lines and trailing spaces
    - Normalize whitespace within lines
    - Preserve all statistical terminology, numbers, and symbols
    """
    if not text:
        return ""
    
    # Split lines, strip each line
    lines = [line.strip() for line in text.splitlines()]
    # Filter out empty lines
    non_empty_lines = [line for line in lines if line]
    
    # Rejoin with single newline
    cleaned = "\n".join(non_empty_lines)
    # Collapse multiple inline spaces
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    
    return cleaned.strip()


def _extract_pdf(file_path: Path, document_id: str, filename: str) -> List[ExtractedBlock]:
    """Extract page-by-page text using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF (fitz) library is missing. Install with 'pip install pymupdf'.")

    blocks: List[ExtractedBlock] = []
    try:
        doc = fitz.open(str(file_path))
        for page_idx in range(len(doc)):
            page = doc.load_page(page_idx)
            raw_text = page.get_text("text")
            cleaned = _clean_text(raw_text)

            if cleaned:
                blocks.append(
                    ExtractedBlock(
                        document_id=document_id,
                        source=filename,
                        location=f"Page {page_idx + 1}",
                        text=cleaned
                    )
                )
        doc.close()
    except Exception as e:
        logger.error(f"PyMuPDF failed to extract text from {file_path}: {e}")
        raise RuntimeError(f"Failed to extract text from PDF document: {str(e)}")

    return blocks


def _extract_pptx(file_path: Path, document_id: str, filename: str) -> List[ExtractedBlock]:
    """Extract slide-by-slide text using python-pptx."""
    try:
        from pptx import Presentation
    except ImportError:
        raise RuntimeError("python-pptx library is missing. Install with 'pip install python-pptx'.")

    blocks: List[ExtractedBlock] = []
    try:
        prs = Presentation(str(file_path))
        for slide_idx, slide in enumerate(prs.slides):
            slide_texts: List[str] = []

            # Iterate shapes in slide
            for shape in slide.shapes:
                # Text frame content (titles, body text boxes, bullets)
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        p_text = paragraph.text.strip()
                        if p_text:
                            slide_texts.append(p_text)

                # Table cell content
                if shape.has_table:
                    for row in shape.table.rows:
                        row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                        if row_texts:
                            slide_texts.append(" | ".join(row_texts))

            combined_raw = "\n".join(slide_texts)
            cleaned = _clean_text(combined_raw)

            if cleaned:
                blocks.append(
                    ExtractedBlock(
                        document_id=document_id,
                        source=filename,
                        location=f"Slide {slide_idx + 1}",
                        text=cleaned
                    )
                )
    except Exception as e:
        logger.error(f"python-pptx failed to extract text from {file_path}: {e}")
        raise RuntimeError(f"Failed to extract text from Presentation document: {str(e)}")

    return blocks


def _extract_docx(file_path: Path, document_id: str, filename: str) -> List[ExtractedBlock]:
    """Extract ordered paragraph & table text using python-docx."""
    try:
        import docx
    except ImportError:
        raise RuntimeError("python-docx library is missing. Install with 'pip install python-docx'.")

    blocks: List[ExtractedBlock] = []
    try:
        doc = docx.Document(str(file_path))
        current_section = "General Section"
        paragraph_counter = 1
        
        # Iterate paragraphs
        for paragraph in doc.paragraphs:
            p_text = paragraph.text.strip()
            if not p_text:
                continue

            # Detect headings to update section location context
            if paragraph.style and 'Heading' in paragraph.style.name:
                current_section = p_text

            cleaned = _clean_text(p_text)
            if cleaned:
                blocks.append(
                    ExtractedBlock(
                        document_id=document_id,
                        source=filename,
                        location=f"{current_section} (Para {paragraph_counter})",
                        text=cleaned
                    )
                )
                paragraph_counter += 1

        # Iterate tables if any
        table_counter = 1
        for table in doc.tables:
            table_lines: List[str] = []
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    table_lines.append(" | ".join(row_cells))
            
            table_raw = "\n".join(table_lines)
            cleaned_table = _clean_text(table_raw)
            if cleaned_table:
                blocks.append(
                    ExtractedBlock(
                        document_id=document_id,
                        source=filename,
                        location=f"Table {table_counter}",
                        text=cleaned_table
                    )
                )
                table_counter += 1

    except Exception as e:
        logger.error(f"python-docx failed to extract text from {file_path}: {e}")
        raise RuntimeError(f"Failed to extract text from Word document: {str(e)}")

    return blocks


def process_document(file_path: Path, file_type: str, document_id: str, filename: str) -> List[ExtractedBlock]:
    """
    Main document processing entrypoint.
    Determines extraction strategy based on file format extension.
    """
    fmt = file_type.lower().lstrip('.')

    if fmt == 'pdf':
        return _extract_pdf(file_path, document_id, filename)
    elif fmt in ('ppt', 'pptx'):
        return _extract_pptx(file_path, document_id, filename)
    elif fmt in ('doc', 'docx'):
        return _extract_docx(file_path, document_id, filename)
    else:
        raise ValueError(f"Unsupported document format '.{fmt}' for text extraction.")

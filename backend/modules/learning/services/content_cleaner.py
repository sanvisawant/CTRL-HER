import re
from typing import List
from models.document import ExtractedBlock

def clean_text_conservative(text: str) -> str:
    """
    Conservative text cleaning algorithm:
    - Normalizes multi-line spacing without altering sentence structure or terminology.
    - Strips orphan whitespace and trailing blank lines.
    - Retains statistical terms, math formulas, numbers, and percentage signs intact.
    """
    if not text:
        return ""
    
    # Replace carriage returns
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Split lines and strip whitespace
    lines = [line.strip() for line in text.split('\n')]
    
    # Remove consecutive empty lines (leave at most single blank line between paragraphs)
    cleaned_lines = []
    prev_empty = False
    for line in lines:
        if not line:
            if not prev_empty:
                cleaned_lines.append('')
                prev_empty = True
        else:
            cleaned_lines.append(line)
            prev_empty = False

    cleaned = "\n".join(cleaned_lines).strip()
    
    # Replace multiple inline spaces/tabs with single space (without collapsing newlines)
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    
    return cleaned


def clean_extracted_blocks(blocks: List[ExtractedBlock]) -> List[ExtractedBlock]:
    """
    Clean extracted text blocks conservatively.
    Filters out empty blocks after cleaning.
    """
    cleaned_blocks: List[ExtractedBlock] = []
    
    for block in blocks:
        cleaned_str = clean_text_conservative(block.text)
        if cleaned_str:
            cleaned_blocks.append(
                ExtractedBlock(
                    document_id=block.document_id,
                    source=block.source,
                    location=block.location,
                    text=cleaned_str
                )
            )
            
    return cleaned_blocks

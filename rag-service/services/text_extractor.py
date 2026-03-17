from pathlib import Path

import fitz
from docx import Document


def extract_pdf_pages(file_path: Path) -> list[dict]:
    pages: list[dict] = []

    with fitz.open(file_path) as document:
        for page in document:
            text = (page.get_text("text") or "").strip()
            if text:
                pages.append(
                    {
                        "page": int(page.number + 1),
                        "text": text,
                    }
                )

    return pages


def extract_docx_sections(file_path: Path) -> list[dict]:
    document = Document(file_path)
    sections: list[dict] = []

    for index, paragraph in enumerate(document.paragraphs, start=1):
        text = (paragraph.text or "").strip()
        if not text:
            continue

        sections.append(
            {
                "section": f"paragraph-{index}",
                "text": text,
            }
        )

    return sections


def extract_txt_sections(file_path: Path) -> list[dict]:
    text = extract_txt_text(file_path)
    if not text:
        return []

    return [{"section": "body", "text": text}]


def extract_pdf_text(file_path: Path) -> str:
    chunks = [page["text"] for page in extract_pdf_pages(file_path)]
    return "\n".join(chunk for chunk in chunks if chunk).strip()


def extract_docx_text(file_path: Path) -> str:
    chunks = [section["text"] for section in extract_docx_sections(file_path)]
    return "\n".join(chunks).strip()


def extract_txt_text(file_path: Path) -> str:
    raw_bytes = file_path.read_bytes()

    try:
        return raw_bytes.decode("utf-8").strip()
    except UnicodeDecodeError:
        return raw_bytes.decode("latin-1", errors="ignore").strip()

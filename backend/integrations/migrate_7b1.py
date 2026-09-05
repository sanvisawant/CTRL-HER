"""
StatSaksham AI — Step 7B-1 Migration Script
Creates identity_mapping and documents tables in Supabase,
then seeds them from existing in-code data.

Usage:
    cd backend
    python integrations/migrate_7b1.py

Safe to re-run — all operations are idempotent.
"""
import sys
import os
import logging
from pathlib import Path

# Add backend to path so existing modules can be imported
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
# Add learning module path for its config
sys.path.insert(0, str(BACKEND_DIR / "modules" / "competency"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
logger = logging.getLogger("migrate_7b1")


def step1_verify_p1_connection():
    logger.info("=== STEP 1: Verify existing P1 Supabase connection ===")
    try:
        from modules.competency.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            # Read-only check on existing tables — no modification
            r1 = conn.execute(text("SELECT COUNT(*) FROM officials"))
            officials_count = r1.scalar()
            r2 = conn.execute(text("SELECT COUNT(*) FROM competencies"))
            comp_count = r2.scalar()
        logger.info(f"  P1 connection: OK")
        logger.info(f"  P1 officials: {officials_count}")
        logger.info(f"  P1 competencies: {comp_count}")
        assert comp_count == 33, f"Expected 33 competencies, got {comp_count}"
        return True
    except Exception as e:
        logger.error(f"  P1 connection FAILED: {type(e).__name__}")
        return False


def step2_check_existing_tables():
    logger.info("=== STEP 2: Check if migration tables already exist ===")
    from integrations.supabase_persistence import check_table_exists
    im_exists = check_table_exists("identity_mapping")
    docs_exists = check_table_exists("documents")
    logger.info(f"  identity_mapping exists: {im_exists}")
    logger.info(f"  documents exists: {docs_exists}")
    return im_exists, docs_exists


def step3_create_tables():
    logger.info("=== STEP 3: Create tables (CREATE IF NOT EXISTS) ===")
    from integrations.supabase_persistence import create_tables
    ok = create_tables()
    if ok:
        logger.info("  Tables created/verified successfully.")
    else:
        logger.error("  Table creation FAILED.")
    return ok


def step4_migrate_identities():
    logger.info("=== STEP 4: Migrate identity mappings ===")
    from integrations.identity_mapping import DEMO_IDENTITIES
    from integrations.supabase_persistence import upsert_identity, get_all_identities

    # Verify each canonical UUID exists in officials before inserting
    from modules.competency.database import engine
    from sqlalchemy import text

    migrated = 0
    skipped = 0
    for identity in DEMO_IDENTITIES:
        cid = str(identity.canonical_user_id)
        # Verify official exists
        with engine.connect() as conn:
            r = conn.execute(text("SELECT id FROM officials WHERE id = :id"), {"id": cid})
            row = r.fetchone()

        if not row:
            logger.warning(f"  Canonical UUID {cid} NOT found in officials — skipping")
            skipped += 1
            continue

        doc = {
            "canonical_user_id": cid,
            "p1_user_id": str(identity.p1_user_id) if identity.p1_user_id else None,
            "p2_learner_id": identity.p2_learner_id,
            "p3_learner_id": identity.p3_learner_id,
            "p4_user_id": identity.p4_user_id,
            "p5_cadre_id": identity.p5_cadre_id,
            "full_name": identity.full_name,
            "designation": identity.designation,
            "department": identity.department,
            "email": identity.email,
            "role": identity.role,
        }
        ok = upsert_identity(doc)
        if ok:
            logger.info(f"  UPSERTED: {identity.full_name} ({cid[:8]}...)")
            migrated += 1
        else:
            logger.error(f"  FAILED: {identity.full_name} ({cid[:8]}...)")

    # Verify
    rows = get_all_identities()
    logger.info(f"  Migrated: {migrated}, Skipped: {skipped}, Total in DB: {len(rows)}")
    return migrated, skipped, len(rows)


def step5_migrate_documents():
    logger.info("=== STEP 5: Migrate document metadata ===")
    from integrations.supabase_persistence import upsert_document, get_all_documents

    docs_to_migrate = []

    # 5A: 3 prototype stubs (always present)
    prototype_docs = [
        {
            "document_id": "doc_nss_78th",
            "filename": "NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            "file_type": "pdf",
            "file_size_bytes": 3450000,
            "file_size_formatted": "3.4 MB",
            "upload_path": "data/uploads/doc_nss_78th_NSS_78th_Round_Multiple_Indicator_Survey.pdf",
            "status": "CHUNKED",
            "pages": 12,
            "text_blocks": 24,
            "chunks": 3,
            "embeddings": 0,
            "description": "National Sample Survey guidelines on household characteristics, education, and migration indicators.",
            "uploaded_by": None,
            "uploaded_at": "2026-08-28T10:15:00+00:00",
        },
        {
            "document_id": "doc_cpi_manual",
            "filename": "Consumer_Price_Index_Compilation_Manual.docx",
            "file_type": "docx",
            "file_size_bytes": 1820000,
            "file_size_formatted": "1.8 MB",
            "upload_path": None,
            "status": "CHUNKED",
            "pages": 8,
            "text_blocks": 16,
            "chunks": 2,
            "embeddings": 0,
            "description": "Methodological guidelines for price collection, weight revision, and Laspeyres price index calculation.",
            "uploaded_by": None,
            "uploaded_at": "2026-08-30T14:30:00+00:00",
        },
        {
            "document_id": "doc_sdg_indicators",
            "filename": "National_Indicator_Framework_SDG_India.pptx",
            "file_type": "pptx",
            "file_size_bytes": 5200000,
            "file_size_formatted": "5.2 MB",
            "upload_path": None,
            "status": "CHUNKED",
            "pages": 15,
            "text_blocks": 30,
            "chunks": 2,
            "embeddings": 0,
            "description": "MoSPI official presentation on tracking 169 Sustainable Development Goal targets.",
            "uploaded_by": None,
            "uploaded_at": "2026-09-01T09:00:00+00:00",
        },
    ]
    docs_to_migrate.extend(prototype_docs)

    # 5B: Real uploaded files in data/uploads/ — metadata only, no binary moves
    uploads_dir = BACKEND_DIR / "data" / "uploads"
    chunks_dir = BACKEND_DIR / "data" / "chunks"
    known_doc_ids = {d["document_id"] for d in prototype_docs}

    if uploads_dir.exists():
        for upload_file in sorted(uploads_dir.iterdir()):
            if upload_file.name.startswith("."):
                continue
            # Extract doc_id from filename pattern: doc_{hex}_{original_name}.ext
            parts = upload_file.name.split("_", 2)
            if len(parts) >= 2 and parts[0] == "doc":
                doc_id = f"doc_{parts[1]}"
            else:
                continue

            if doc_id in known_doc_ids:
                continue  # Already covered by prototype stubs or earlier upload

            known_doc_ids.add(doc_id)
            suffix = upload_file.suffix.lstrip(".")
            size = upload_file.stat().st_size
            size_fmt = f"{size / (1024*1024):.1f} MB" if size > 1024 * 1024 else f"{size / 1024:.0f} KB"

            # Try to get chunk count from chunks directory
            chunk_count = 0
            chunk_file = chunks_dir / f"{doc_id}.json"
            if chunk_file.exists():
                try:
                    import json
                    with open(chunk_file) as cf:
                        cd = json.load(cf)
                        chunk_count = cd.get("chunk_count", 0)
                except Exception:
                    pass

            docs_to_migrate.append({
                "document_id": doc_id,
                "filename": upload_file.name,
                "file_type": suffix,
                "file_size_bytes": size,
                "file_size_formatted": size_fmt,
                "upload_path": f"data/uploads/{upload_file.name}",
                "status": "INDEXED" if chunk_count > 0 else "UPLOADED",
                "pages": 0,
                "text_blocks": 0,
                "chunks": chunk_count,
                "embeddings": 0,
                "description": None,
                "uploaded_by": None,
                "uploaded_at": None,
            })

    migrated = 0
    failed = 0
    for doc in docs_to_migrate:
        ok = upsert_document(doc)
        if ok:
            logger.info(f"  UPSERTED: {doc['document_id']} ({doc['filename'][:40]})")
            migrated += 1
        else:
            logger.error(f"  FAILED:   {doc['document_id']}")
            failed += 1

    all_docs = get_all_documents()
    logger.info(f"  Migrated: {migrated}, Failed: {failed}, Total in DB: {len(all_docs)}")
    return migrated, failed, len(all_docs)


def main():
    logger.info("=" * 60)
    logger.info("StatSaksham AI — Step 7B-1 Supabase Migration")
    logger.info("Tables: identity_mapping, documents")
    logger.info("=" * 60)

    # PART A: Verify P1 connection
    if not step1_verify_p1_connection():
        logger.error("BLOCKED: Cannot connect to Supabase. Aborting.")
        sys.exit(1)

    # PART B: Check existing tables
    im_exists, docs_exists = step2_check_existing_tables()

    # PART C: Create tables (idempotent)
    if not step3_create_tables():
        logger.error("BLOCKED: Table creation failed. Aborting.")
        sys.exit(1)

    # PART D: Migrate identities
    id_migrated, id_skipped, id_total = step4_migrate_identities()

    # PART E: Migrate documents
    doc_migrated, doc_failed, doc_total = step5_migrate_documents()

    logger.info("=" * 60)
    logger.info("MIGRATION COMPLETE")
    logger.info(f"  identity_mapping rows:  {id_total}")
    logger.info(f"  documents rows:         {doc_total}")
    logger.info(f"  Identity skipped:       {id_skipped}")
    logger.info(f"  Document failures:      {doc_failed}")
    logger.info("=" * 60)

    if doc_failed > 0 or id_skipped > 0:
        logger.warning("Some rows were skipped/failed — check logs above.")
        sys.exit(2)

    logger.info("STATUS: PASS")


if __name__ == "__main__":
    main()

"""
StatSaksham AI — Step 7B-1 Persistence Verification Test
Validates:
1. Supabase connection & table schemas for identity_mapping and documents.
2. Identity mapping loads 3 canonical identities directly from Supabase (source="supabase").
3. Document registry loads metadata rows directly from Supabase.
4. Server restart persistence simulation:
   - Save a document via document_registry
   - Wipe in-memory cache completely
   - Reload from Supabase
   - Verify persisted document exists with matching metadata
   - Clean up test document
"""
import sys
import uuid
from pathlib import Path

# Add paths
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
_LEARNING_DIR = _BACKEND_DIR / "modules" / "learning"
if _LEARNING_DIR.exists() and str(_LEARNING_DIR) not in sys.path:
    sys.path.insert(0, str(_LEARNING_DIR))

from integrations.identity_mapping import IdentityMappingService
from integrations.supabase_persistence import (
    check_table_exists,
    get_all_identities,
    get_all_documents,
    upsert_document,
    _get_engine
)
import integrations.document_registry as doc_reg
from models.document import DocumentMetadata


def test_tables_exist():
    print(">>> Test 1: Verifying Supabase tables exist...")
    assert check_table_exists("identity_mapping") is True, "identity_mapping table does not exist!"
    assert check_table_exists("documents") is True, "documents table does not exist!"
    print("    [PASS] Both 'identity_mapping' and 'documents' tables verified in Supabase.")


def test_identity_persistence():
    print(">>> Test 2: Verifying Identity Mapping Supabase loading...")
    svc = IdentityMappingService(seed_demo_data=False)
    assert svc._source == "supabase", f"Expected source 'supabase', got '{svc._source}'"
    count = svc.total_mapped_identities()
    assert count >= 3, f"Expected at least 3 identities, found {count}"
    
    # Verify Siya Sharma exists and maps properly
    siya = svc.get_by_canonical("2b574d66-f752-4348-ab00-17587012f291")
    assert siya is not None, "siya Sharma canonical identity missing!"
    assert siya.p2_learner_id == "U001"
    assert siya.p3_learner_id == "U001"
    assert siya.p4_user_id == "usr_demo_001"
    print(f"    [PASS] Identity service loaded {count} identities directly from Supabase.")


def test_document_registry_persistence():
    print(">>> Test 3: Verifying Document Registry Supabase loading & restart resilience...")
    docs_initial = doc_reg.get_all_documents()
    initial_count = len(docs_initial)
    assert initial_count >= 26, f"Expected at least 26 documents, found {initial_count}"
    print(f"    Initial Supabase documents loaded: {initial_count}")

    # Create a unique test document
    test_id = f"doc_test_persist_{uuid.uuid4().hex[:8]}"
    test_meta = DocumentMetadata(
        document_id=test_id,
        filename="test_persistence_report.pdf",
        file_type="pdf",
        file_size_bytes=102400,
        file_size_formatted="100.0 KB",
        uploaded_at="2026-09-05T22:00:00",
        status="PROCESSED",
        pages=5,
        text_blocks=10,
        chunks=2,
        embeddings=2,
        description="Automated restart persistence verification document."
    )

    # Save document (writes to cache and Supabase)
    print("    Saving test document to registry (write-through to Supabase)...")
    doc_reg.save_document(test_meta)

    # Verify write exists in Supabase directly
    raw_docs = get_all_documents()
    found_in_sb = any(d["document_id"] == test_id for d in raw_docs)
    assert found_in_sb, "Test document was not saved to Supabase!"
    print("    [PASS] Document written to Supabase successfully.")

    # SIMULATE SERVER RESTART: wipe in-memory cache
    print("    Simulating server restart (wiping in-memory cache)...")
    dict.clear(doc_reg._cache)
    doc_reg._loaded_from_supabase = False

    # Trigger reload from Supabase
    reloaded_doc = doc_reg.get_document(test_id)
    assert reloaded_doc is not None, "Test document lost after simulated restart!"
    assert reloaded_doc.filename == "test_persistence_report.pdf"
    assert reloaded_doc.status == "PROCESSED"
    assert reloaded_doc.pages == 5
    print("    [PASS] Document successfully restored from Supabase after cache wipe!")

    # Clean up test document from Supabase
    try:
        from sqlalchemy import text
        engine = _get_engine()
        with engine.connect() as conn:
            conn.execute(text("DELETE FROM documents WHERE document_id = :did"), {"did": test_id})
            conn.commit()
        doc_reg._cache.pop(test_id, None)
        print("    Cleaned up test document from Supabase.")
    except Exception as cleanup_err:
        print(f"    Warning: cleanup note: {cleanup_err}")


def main():
    print("=" * 65)
    print("STATSAKSHAM AI — STEP 7B-1 PERSISTENCE VERIFICATION")
    print("=" * 65)
    test_tables_exist()
    test_identity_persistence()
    test_document_registry_persistence()
    print("\n" + "=" * 65)
    print("ALL STEP 7B-1 PERSISTENCE TESTS PASSED!")
    print("=" * 65)


if __name__ == "__main__":
    main()

"""
StatSaksham AI — Identity Mapping Service
Provides deterministic bidirectional mapping between canonical platform UUIDs
and module-local identifiers (P1 UUID, P2/P3 learner ID, P4 user ID, P5 cadre ID).

Step 7B-1: Supabase is now the PRIMARY source for identity mappings.
The in-code DEMO_IDENTITIES list is retained as a FALLBACK for when Supabase
is temporarily unavailable. Public API is unchanged.
"""
import logging
from typing import Optional, Dict, List
from integrations.contracts import CanonicalIdentity

logger = logging.getLogger("statsaksham.integrations.identity")


# ============================================================================
# DEMO MAPPING ONLY — Isolated Configuration for Verified Demo Fixtures
# These mappings bridge seeded test/demo accounts across modules.
# In production, these rows are resolved from a central identity directory.
# ============================================================================

DEMO_IDENTITIES: List[CanonicalIdentity] = [
    # Demo Officer 1: Primary Learner Profile
    # Matches P1 demo official (Ramesh/Saniya/Riya) across frontend and backend fixtures
    CanonicalIdentity(
        canonical_user_id="2b574d66-f752-4348-ab00-17587012f291",
        p1_user_id="2b574d66-f752-4348-ab00-17587012f291",
        p2_learner_id="U001",
        p3_learner_id="U001",
        p4_user_id="usr_demo_001",
        p5_cadre_id="ISS-2024-8921",
        full_name="Siya Sharma",
        designation="Senior Statistical Officer",
        department="National Sample Survey Office (NSSO)",
        email="siya.sharma@gov.in",
        role="learner"
    ),
    # Demo Officer 2: Secondary Senior Official
    # Matches P1 pre-seeded demo official #2 (Sunita Deshmukh)
    CanonicalIdentity(
        canonical_user_id="0c60c2de-d20c-4694-b453-2ddc213b135f",
        p1_user_id="0c60c2de-d20c-4694-b453-2ddc213b135f",
        p2_learner_id="U002",
        p3_learner_id="U002",
        p4_user_id="usr_seed_002",
        p5_cadre_id="ISS-2022-4105",
        full_name="Sunita Deshmukh",
        designation="Senior Statistical Officer",
        department="National Accounts Division (NAD)",
        email="sunita.deshmukh@mospi.gov.in",
        role="learner"
    ),
    # Demo Officer 3: Research Specialist Profile
    # Matches P1 pre-seeded demo official #3 (Ananya Sen)
    CanonicalIdentity(
        canonical_user_id="4a85cf96-3d3b-49b9-86bd-e29857e7126f",
        p1_user_id="4a85cf96-3d3b-49b9-86bd-e29857e7126f",
        p2_learner_id="U003",
        p3_learner_id="U003",
        p4_user_id="usr_seed_003",
        p5_cadre_id="ISS-2023-7729",
        full_name="Ananya Sen",
        designation="Emerging Tech Research Fellow",
        department="Policy Innovation Cell",
        email="ananya.sen@mospi.gov.in",
        role="learner"
    )
]


# ============================================================================
# IDENTITY MAPPING SERVICE
# ============================================================================

class IdentityMappingService:
    """
    Deterministic identity cross-reference manager.
    Enforces uniqueness, prevents ambiguous collisions, and never fabricates identities.

    Step 7B-1: Loads from Supabase identity_mapping table on init.
    Falls back to in-code DEMO_IDENTITIES if Supabase is unavailable.
    Public API is unchanged.
    """

    def __init__(self, seed_demo_data: bool = True):
        self._by_canonical: Dict[str, CanonicalIdentity] = {}
        self._by_p1: Dict[str, CanonicalIdentity] = {}
        self._by_p2: Dict[str, CanonicalIdentity] = {}
        self._by_p3: Dict[str, CanonicalIdentity] = {}
        self._by_p4: Dict[str, CanonicalIdentity] = {}
        self._by_p5: Dict[str, CanonicalIdentity] = {}
        self._source = "unloaded"

        # 1. Try to load from Supabase (primary source)
        supabase_loaded = self._load_from_supabase()

        # 2. Fallback: always seed demo data if Supabase failed OR returned nothing
        if seed_demo_data and (not supabase_loaded or len(self._by_canonical) == 0):
            logger.info("[IdentityService] Applying in-code DEMO_IDENTITIES as fallback.")
            for item in DEMO_IDENTITIES:
                self.register_identity(item, allow_update=True)
            self._source = "fallback" if not supabase_loaded else "supabase+fallback"
        elif supabase_loaded:
            self._source = "supabase"

        logger.info(f"[IdentityService] Loaded {len(self._by_canonical)} identities from source: {self._source}")

    def _load_from_supabase(self) -> bool:
        """
        Load identity rows from Supabase.
        Returns True if at least one row was loaded successfully.
        """
        try:
            from integrations.supabase_persistence import get_all_identities
            rows = get_all_identities()
            if not rows:
                logger.info("[IdentityService] Supabase identity_mapping is empty — will use fallback.")
                return False
            for row in rows:
                try:
                    identity = CanonicalIdentity(
                        canonical_user_id=str(row["canonical_user_id"]),
                        p1_user_id=str(row["p1_user_id"]) if row.get("p1_user_id") else None,
                        p2_learner_id=row.get("p2_learner_id"),
                        p3_learner_id=row.get("p3_learner_id"),
                        p4_user_id=row.get("p4_user_id"),
                        p5_cadre_id=row.get("p5_cadre_id"),
                        full_name=row.get("full_name", ""),
                        designation=row.get("designation"),
                        department=row.get("department"),
                        email=row.get("email"),
                        role=row.get("role", "learner"),
                    )
                    self.register_identity(identity, allow_update=True)
                except Exception as row_err:
                    logger.warning(f"[IdentityService] Skipping malformed row {row.get('canonical_user_id')}: {row_err}")
            logger.info(f"[IdentityService] Loaded {len(rows)} identities from Supabase.")
            return True
        except Exception as e:
            logger.warning(f"[IdentityService] Supabase unavailable — falling back to demo data: {type(e).__name__}")
            return False

    def register_identity(self, identity: CanonicalIdentity, allow_update: bool = False) -> CanonicalIdentity:
        """
        Registers a canonical identity with strict conflict detection.
        Raises ValueError if an identifier is already assigned to a different canonical user.
        """
        cid = identity.canonical_user_id.strip()

        # Conflict checks
        if not allow_update and cid in self._by_canonical:
            existing = self._by_canonical[cid]
            if existing != identity:
                raise ValueError(f"Identity collision: canonical_user_id '{cid}' already registered to different entity.")

        # Check secondary key uniqueness
        checks = [
            (identity.p1_user_id, self._by_p1, "p1_user_id"),
            (identity.p2_learner_id, self._by_p2, "p2_learner_id"),
            (identity.p3_learner_id, self._by_p3, "p3_learner_id"),
            (identity.p4_user_id, self._by_p4, "p4_user_id"),
            (identity.p5_cadre_id, self._by_p5, "p5_cadre_id"),
        ]

        for val, registry, field_name in checks:
            if val:
                val_clean = val.strip()
                if val_clean in registry and registry[val_clean].canonical_user_id != cid:
                    raise ValueError(
                        f"Ambiguous mapping error: {field_name} '{val_clean}' is already assigned "
                        f"to canonical user '{registry[val_clean].canonical_user_id}'."
                    )

        # Index cleanly
        self._by_canonical[cid] = identity
        if identity.p1_user_id:
            self._by_p1[identity.p1_user_id.strip()] = identity
        if identity.p2_learner_id:
            self._by_p2[identity.p2_learner_id.strip()] = identity
        if identity.p3_learner_id:
            self._by_p3[identity.p3_learner_id.strip()] = identity
        if identity.p4_user_id:
            self._by_p4[identity.p4_user_id.strip()] = identity
        if identity.p5_cadre_id:
            self._by_p5[identity.p5_cadre_id.strip()] = identity

        return identity

    # --- Canonical -> Module Lookups ---

    def get_by_canonical(self, canonical_id: str) -> Optional[CanonicalIdentity]:
        if not canonical_id:
            return None
        return self._by_canonical.get(canonical_id.strip())

    def get_p1_user_id(self, canonical_id: str) -> Optional[str]:
        identity = self.get_by_canonical(canonical_id)
        return identity.p1_user_id if identity else None

    def get_p2_learner_id(self, canonical_id: str) -> Optional[str]:
        identity = self.get_by_canonical(canonical_id)
        return identity.p2_learner_id if identity else None

    def get_p3_learner_id(self, canonical_id: str) -> Optional[str]:
        identity = self.get_by_canonical(canonical_id)
        return identity.p3_learner_id if identity else None

    def get_p4_user_id(self, canonical_id: str) -> Optional[str]:
        identity = self.get_by_canonical(canonical_id)
        return identity.p4_user_id if identity else None

    def get_p5_cadre_id(self, canonical_id: str) -> Optional[str]:
        identity = self.get_by_canonical(canonical_id)
        return identity.p5_cadre_id if identity else None

    # --- Reverse Lookups (Module -> Canonical) ---

    def get_by_p1(self, p1_id: str) -> Optional[CanonicalIdentity]:
        if not p1_id:
            return None
        return self._by_p1.get(p1_id.strip())

    def get_by_p2(self, p2_id: str) -> Optional[CanonicalIdentity]:
        if not p2_id:
            return None
        return self._by_p2.get(p2_id.strip())

    def get_by_p3(self, p3_id: str) -> Optional[CanonicalIdentity]:
        if not p3_id:
            return None
        return self._by_p3.get(p3_id.strip())

    def get_by_p4(self, p4_id: str) -> Optional[CanonicalIdentity]:
        if not p4_id:
            return None
        return self._by_p4.get(p4_id.strip())

    def get_by_p5(self, p5_cadre_id: str) -> Optional[CanonicalIdentity]:
        if not p5_cadre_id:
            return None
        return self._by_p5.get(p5_cadre_id.strip())

    # --- Universal Resolver ---

    def resolve(self, any_id: str) -> Optional[CanonicalIdentity]:
        """
        Attempts to resolve an arbitrary identifier across all recognized indexes.
        Returns the CanonicalIdentity record or None if unmapped.
        """
        if not any_id:
            return None
        clean_id = any_id.strip()

        # Check canonical first
        if clean_id in self._by_canonical:
            return self._by_canonical[clean_id]
        if clean_id in self._by_p5:
            return self._by_p5[clean_id]
        if clean_id in self._by_p4:
            return self._by_p4[clean_id]
        if clean_id in self._by_p2:
            return self._by_p2[clean_id]
        if clean_id in self._by_p3:
            return self._by_p3[clean_id]
        if clean_id in self._by_p1:
            return self._by_p1[clean_id]

        return None

    def resolve_to_canonical_id(self, any_id: str) -> Optional[str]:
        identity = self.resolve(any_id)
        return identity.canonical_user_id if identity else None

    def total_mapped_identities(self) -> int:
        return len(self._by_canonical)


# Singleton instance for backend-wide usage
identity_service = IdentityMappingService()

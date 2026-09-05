"""
StatSaksham AI — Core Integration Package
Exposes canonical contracts, identity mapping service, and competency mapping service.
"""
from .contracts import (
    CanonicalIdentity,
    CanonicalCompetency,
    MappingStatus,
    CompetencyGapContract,
    LearningRecommendationContract,
    LearningEvidenceContract,
    AssessmentResultContract,
    MasteryUpdateContract,
)
from .identity_mapping import (
    IdentityMappingService,
    identity_service,
    DEMO_IDENTITIES,
)
from .competency_mapping import (
    CompetencyMappingService,
    competency_service,
    CANONICAL_MOSPI_COMPETENCIES,
    P4_COMPETENCY_MAPPINGS,
    P3_TOPIC_MAPPINGS,
    P2_IGOT_TAG_MAPPINGS,
)

__all__ = [
    "CanonicalIdentity",
    "CanonicalCompetency",
    "MappingStatus",
    "CompetencyGapContract",
    "LearningRecommendationContract",
    "LearningEvidenceContract",
    "AssessmentResultContract",
    "MasteryUpdateContract",
    "IdentityMappingService",
    "identity_service",
    "DEMO_IDENTITIES",
    "CompetencyMappingService",
    "competency_service",
    "CANONICAL_MOSPI_COMPETENCIES",
    "P4_COMPETENCY_MAPPINGS",
    "P3_TOPIC_MAPPINGS",
    "P2_IGOT_TAG_MAPPINGS",
]

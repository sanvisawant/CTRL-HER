"""
StatSaksham AI — Competency Taxonomy Mapping Service
Anchors the 33 canonical MoSPI competencies (P1) and maps module-local
representations across P2 (iGOT tags), P3 (document topics), and P4 (workforce analytics).
"""
import logging
from typing import Optional, Dict, List, Tuple
from integrations.contracts import CanonicalCompetency, MappingStatus

logger = logging.getLogger("statsaksham.integrations.competency")


# ============================================================================
# CANONICAL MOSPI COMPETENCIES CATALOG (P1 Source of Truth)
# Exact 33 competencies across 4 MoSPI pillars
# ============================================================================

CANONICAL_MOSPI_COMPETENCIES: List[CanonicalCompetency] = [
    # 1. Statistical Pillar (IDs 1 - 10)
    CanonicalCompetency(competency_id=1, p1_id=1, name="Survey Design", category="Statistical", p4_id="comp_sampling", aliases=["Survey Methodology", "Survey Planning"]),
    CanonicalCompetency(competency_id=2, p1_id=2, name="Sampling", category="Statistical", p4_id="comp_sampling", aliases=["Sampling Methodology", "Survey Sampling Methodology", "Sample Design"]),
    CanonicalCompetency(competency_id=3, p1_id=3, name="National Accounts", category="Statistical", p4_id=None, aliases=["GDP Compilation", "National Income", "SNA 2008"]),
    CanonicalCompetency(competency_id=4, p1_id=4, name="Price Statistics", category="Statistical", p4_id="comp_indices", aliases=["Index Numbers & CPI/WPI", "Consumer Price Index", "WPI"]),
    CanonicalCompetency(competency_id=5, p1_id=5, name="Labour Statistics", category="Statistical", p4_id=None, aliases=["PLFS", "Employment Statistics", "Labour Force Survey"]),
    CanonicalCompetency(competency_id=6, p1_id=6, name="Agricultural Statistics", category="Statistical", p4_id=None, aliases=["Crop Estimation", "Agricultural Census"]),
    CanonicalCompetency(competency_id=7, p1_id=7, name="Industrial Statistics", category="Statistical", p4_id=None, aliases=["Annual Survey of Industries", "ASI", "Index of Industrial Production", "IIP"]),
    CanonicalCompetency(competency_id=8, p1_id=8, name="SDG Indicators", category="Statistical", p4_id=None, aliases=["Sustainable Development Goals", "National Indicator Framework", "NIF"]),
    CanonicalCompetency(competency_id=9, p1_id=9, name="Metadata Standards", category="Statistical", p4_id="comp_gov", aliases=["Data Governance & Metadata", "SDMX", "Statistical Metadata"]),
    CanonicalCompetency(competency_id=10, p1_id=10, name="Data Quality", category="Statistical", p4_id=None, aliases=["Data Scrutiny", "Data Validation", "Statistical Audit"]),

    # 2. Technical Pillar (IDs 11 - 22)
    CanonicalCompetency(competency_id=11, p1_id=11, name="Python", category="Technical", p4_id="comp_python", aliases=["Python for Data Analysis", "Python Scripting", "Python 3"]),
    CanonicalCompetency(competency_id=12, p1_id=12, name="R", category="Technical", p4_id=None, aliases=["R Programming", "R Statistical Environment"]),
    CanonicalCompetency(competency_id=13, p1_id=13, name="SQL", category="Technical", p4_id="comp_sql", aliases=["SQL & Relational Databases", "Relational Databases", "PostgreSQL", "Database Queries"]),
    CanonicalCompetency(competency_id=14, p1_id=14, name="Stata", category="Technical", p4_id=None, aliases=["Stata Econometrics"]),
    CanonicalCompetency(competency_id=15, p1_id=15, name="SPSS", category="Technical", p4_id=None, aliases=["IBM SPSS Statistics"]),
    CanonicalCompetency(competency_id=16, p1_id=16, name="SAS", category="Technical", p4_id=None, aliases=["SAS Base", "SAS Analytics"]),
    CanonicalCompetency(competency_id=17, p1_id=17, name="GIS", category="Technical", p4_id="comp_gis", aliases=["GIS & Spatial Analytics", "Geographic Information Systems", "QGIS", "GeoPandas"]),
    CanonicalCompetency(competency_id=18, p1_id=18, name="Data Visualization", category="Technical", p4_id="comp_viz", aliases=["Data Visualization & Dashboards", "PowerBI", "Interactive Dashboards"]),
    CanonicalCompetency(competency_id=19, p1_id=19, name="AI/ML", category="Technical", p4_id="comp_aiml", aliases=["Artificial Intelligence & ML", "Machine Learning", "Predictive Modeling"]),
    CanonicalCompetency(competency_id=20, p1_id=20, name="Cloud", category="Technical", p4_id="comp_cloud", aliases=["Cloud Computing & Data Lakes", "Data Lakes", "Object Storage"]),
    CanonicalCompetency(competency_id=21, p1_id=21, name="APIs", category="Technical", p4_id="comp_apis", aliases=["Data Pipelines & APIs", "Data Pipelines", "REST APIs"]),
    CanonicalCompetency(competency_id=22, p1_id=22, name="Open Data", category="Technical", p4_id=None, aliases=["Open Government Data", "OGD India", "Data Dissemination"]),

    # 3. Digital Governance Pillar (IDs 23 - 27)
    CanonicalCompetency(competency_id=23, p1_id=23, name="Cybersecurity", category="Digital Governance", p4_id=None, aliases=["Information Security", "CERT-In Guidelines"]),
    CanonicalCompetency(competency_id=24, p1_id=24, name="Data Privacy", category="Digital Governance", p4_id=None, aliases=["DPDP Act", "Digital Personal Data Protection"]),
    CanonicalCompetency(competency_id=25, p1_id=25, name="Digital Signatures", category="Digital Governance", p4_id=None, aliases=["eSign", "DSC", "PKI Authentication"]),
    CanonicalCompetency(competency_id=26, p1_id=26, name="Government Cloud", category="Digital Governance", p4_id=None, aliases=["MeghRaj", "Gov Cloud Infrastructure"]),
    CanonicalCompetency(competency_id=27, p1_id=27, name="DPI", category="Digital Governance", p4_id=None, aliases=["Digital Public Infrastructure", "India Stack"]),

    # 4. Behavioural & Managerial Pillar (IDs 28 - 33)
    CanonicalCompetency(competency_id=28, p1_id=28, name="Leadership", category="Behavioural & Managerial", p4_id=None, aliases=["Statistical Leadership", "Cadre Management"]),
    CanonicalCompetency(competency_id=29, p1_id=29, name="Communication", category="Behavioural & Managerial", p4_id="comp_comm", aliases=["Evidence-Based Communication", "Policy Briefing", "Statistical Reporting"]),
    CanonicalCompetency(competency_id=30, p1_id=30, name="Project Management", category="Behavioural & Managerial", p4_id=None, aliases=["Survey Project Management", "Field Operations Management"]),
    CanonicalCompetency(competency_id=31, p1_id=31, name="Ethics", category="Behavioural & Managerial", p4_id=None, aliases=["Professional Statistical Ethics", "UN Fundamental Principles"]),
    CanonicalCompetency(competency_id=32, p1_id=32, name="Decision Making", category="Behavioural & Managerial", p4_id=None, aliases=["Evidence-Based Policy", "Statistical Decision Making"]),
    CanonicalCompetency(competency_id=33, p1_id=33, name="Change Management", category="Behavioural & Managerial", p4_id=None, aliases=["Digital Transformation", "Organizational Agility"]),
]


# ============================================================================
# P4 SQLite -> Canonical MoSPI Competency Mapping Table
# ============================================================================

P4_COMPETENCY_MAPPINGS: Dict[str, Tuple[int, MappingStatus, str]] = {
    "comp_python": (11, MappingStatus.EXACT, "Direct semantic match: Python programming for analytical workflows."),
    "comp_sql": (13, MappingStatus.EXACT, "Direct semantic match: SQL and relational databases."),
    "comp_aiml": (19, MappingStatus.EXACT, "Direct match: Artificial Intelligence & Machine Learning."),
    "comp_gis": (17, MappingStatus.EXACT, "Direct match: GIS and spatial analytics."),
    "comp_cloud": (20, MappingStatus.HIGH_CONFIDENCE, "Mapped to Technical Cloud (#20). Covers cloud-native data lakes."),
    "comp_apis": (21, MappingStatus.EXACT, "Direct match: Data pipelines and REST API integration."),
    "comp_sampling": (2, MappingStatus.EXACT, "Direct match: Survey sampling methodology (NSSO multistage design)."),
    "comp_indices": (4, MappingStatus.HIGH_CONFIDENCE, "Mapped to Price Statistics (#4): Index numbers & CPI/WPI compilation."),
    "comp_viz": (18, MappingStatus.EXACT, "Direct match: Data visualization and dashboards."),
    "comp_gov": (9, MappingStatus.HIGH_CONFIDENCE, "Mapped to Metadata Standards (#9): Data governance and metadata frameworks."),
    "comp_comm": (29, MappingStatus.EXACT, "Direct match: Evidence-based communication of statistical outputs."),
    # Special case: Time Series has no direct single competency in P1 33
    "comp_timeseries": (7, MappingStatus.REQUIRES_REVIEW, "Cross-cutting statistical technique. Primarily utilized in Industrial (IIP) and National Accounts forecasting."),
}


# ============================================================================
# P3 Document Topics -> Canonical MoSPI Competency Mapping Table
# Only topics that actually exist in ingested MoSPI PDFs/manuals
# ============================================================================

P3_TOPIC_MAPPINGS: Dict[str, Tuple[int, MappingStatus, str]] = {
    # NSS 78th Round / NSS Sampling Manual topics
    "Sampling Design": (1, MappingStatus.HIGH_CONFIDENCE, "Survey Design & multi-stage frame setup"),
    "Sampling Methodology": (2, MappingStatus.EXACT, "Sampling theory and multi-stage selection"),
    "Sampling Design & Stratification": (2, MappingStatus.EXACT, "NSSO stratified multistage sampling"),
    "Stratified Sampling": (2, MappingStatus.EXACT, "NSSO proportional allocation and stratification"),
    "Cluster Sampling": (2, MappingStatus.EXACT, "Hamlet-group and sub-block formation"),
    "Estimation Procedure": (2, MappingStatus.HIGH_CONFIDENCE, "Sample multipliers and estimation formulas"),
    "Estimation Procedure, Multipliers and Cluster Sampling": (2, MappingStatus.HIGH_CONFIDENCE, "Multiplier calculation and variance estimation"),
    "Estimation Procedure & Multipliers": (2, MappingStatus.HIGH_CONFIDENCE, "Sample weights calculation W_h = N_h / n_h"),

    # CPI Compilation Manual topics
    "Price Collection Methodology": (4, MappingStatus.EXACT, "Consumer Price Index field collection"),
    "Index Formula": (4, MappingStatus.EXACT, "Modified Laspeyres price index formulation"),
    "Modified Laspeyres Index Formula": (4, MappingStatus.EXACT, "Formula I_t = [Sum((p_it/p_i0)*w_i0)/Sum(w_i0)]*100"),
    "Consumer Price Index": (4, MappingStatus.EXACT, "Price statistics measurement over time"),

    # SDG National Indicator Framework topics
    "SDG Indicators": (8, MappingStatus.EXACT, "Sustainable Development Goals National Indicator Framework"),
    "National Indicator Framework": (8, MappingStatus.EXACT, "MoSPI NIF monitoring for official SDGs"),

    # Technical topics
    "Python": (11, MappingStatus.EXACT, "Python for statistical computing"),
    "SQL": (13, MappingStatus.EXACT, "Relational database queries for statistical scrutiny"),
    "Data Scrutiny": (10, MappingStatus.HIGH_CONFIDENCE, "Validation and consistency checking of survey schedules"),

    # Academic / Supporting Math Topics (Review required for formal alignment)
    "Probability and Statistics": (10, MappingStatus.REQUIRES_REVIEW, "Foundation topic; applied under Data Quality & Statistical modeling"),
    "Linear Algebra": (19, MappingStatus.REQUIRES_REVIEW, "Mathematics supporting Machine Learning and SVD decomposition"),
}


# ============================================================================
# P2 iGOT Course Tag -> Canonical MoSPI Competency Mapping Table
# ============================================================================

P2_IGOT_TAG_MAPPINGS: Dict[str, Tuple[int, MappingStatus, str]] = {
    "Python": (11, MappingStatus.EXACT, "Course tag maps to Python (#11)"),
    "Machine Learning": (19, MappingStatus.EXACT, "Course tag maps to AI/ML (#19)"),
    "Data Analysis": (11, MappingStatus.HIGH_CONFIDENCE, "Broad tag mapped to Python for Data Analysis (#11)"),
    "Statistics": (2, MappingStatus.HIGH_CONFIDENCE, "Broad tag mapped to Sampling & Statistical Methodology (#2)"),
    "Advanced Statistics": (2, MappingStatus.HIGH_CONFIDENCE, "Mapped to advanced statistical estimation (#2)"),
}


# ============================================================================
# COMPETENCY MAPPING SERVICE
# ============================================================================

class CompetencyMappingService:
    """
    Deterministic competency lookup and translation service.
    Translates between P1 IDs, P4 codes, P3 document topics, and P2 course tags.
    """

    def __init__(self):
        self._by_id: Dict[int, CanonicalCompetency] = {c.competency_id: c for c in CANONICAL_MOSPI_COMPETENCIES}
        self._by_name: Dict[str, CanonicalCompetency] = {c.name.lower(): c for c in CANONICAL_MOSPI_COMPETENCIES}
        self._by_p4_id: Dict[str, CanonicalCompetency] = {c.p4_id: c for c in CANONICAL_MOSPI_COMPETENCIES if c.p4_id}

        # Index aliases for fast lookup
        self._by_alias: Dict[str, CanonicalCompetency] = {}
        for c in CANONICAL_MOSPI_COMPETENCIES:
            for alias in c.aliases:
                self._by_alias[alias.lower()] = c

    # --- Canonical Competency Lookups ---

    def get_canonical_by_id(self, competency_id: int) -> Optional[CanonicalCompetency]:
        return self._by_id.get(competency_id)

    def get_canonical_by_name(self, name: str) -> Optional[CanonicalCompetency]:
        if not name:
            return None
        clean = name.strip().lower()
        if clean in self._by_name:
            return self._by_name[clean]
        if clean in self._by_alias:
            return self._by_alias[clean]
        return None

    def get_all_competencies(self) -> List[CanonicalCompetency]:
        return list(self._by_id.values())

    # --- P4 Mapping ---

    def map_p4_to_canonical(self, p4_id_or_code: str) -> Tuple[Optional[CanonicalCompetency], MappingStatus, str]:
        """
        Translates a P4 SQLite competency ID (e.g. 'comp_sampling') or code ('SAMPLING')
        to the canonical MoSPI competency.
        """
        if not p4_id_or_code:
            return None, MappingStatus.UNRESOLVED, "Empty P4 competency identifier"

        clean = p4_id_or_code.strip()
        clean_lower = clean.lower()

        # Check explicit table first
        if clean_lower in P4_COMPETENCY_MAPPINGS:
            target_id, status, reason = P4_COMPETENCY_MAPPINGS[clean_lower]
            return self._by_id.get(target_id), status, reason

        # Check by P4 ID index
        if clean_lower in self._by_p4_id:
            return self._by_p4_id[clean_lower], MappingStatus.EXACT, "Direct match on P4 identifier"

        # Check if caller passed name
        canonical = self.get_canonical_by_name(clean)
        if canonical:
            return canonical, MappingStatus.HIGH_CONFIDENCE, "Matched by canonical name/alias"

        return None, MappingStatus.UNRESOLVED, f"P4 competency '{p4_id_or_code}' has no verified canonical mapping"

    def map_canonical_to_p4(self, competency_id: int) -> Optional[str]:
        comp = self.get_canonical_by_id(competency_id)
        return comp.p4_id if comp else None

    # --- P3 Topic Mapping ---

    def map_p3_topic_to_canonical(self, topic_name: str) -> Tuple[Optional[CanonicalCompetency], MappingStatus, str]:
        """
        Translates an ingested P3 document topic string into a canonical MoSPI competency.
        Never uses fuzzy guessing; relies on the explicit curated mapping table.
        """
        if not topic_name:
            return None, MappingStatus.UNRESOLVED, "Empty topic name"

        clean = topic_name.strip()

        # Check exact topic mapping table
        if clean in P3_TOPIC_MAPPINGS:
            target_id, status, reason = P3_TOPIC_MAPPINGS[clean]
            return self._by_id.get(target_id), status, reason

        # Case-insensitive search on topic mapping table
        clean_lower = clean.lower()
        for t_key, (target_id, status, reason) in P3_TOPIC_MAPPINGS.items():
            if t_key.lower() == clean_lower:
                return self._by_id.get(target_id), status, reason

        # Check if topic matches a canonical competency name or alias directly
        canonical = self.get_canonical_by_name(clean)
        if canonical:
            return canonical, MappingStatus.HIGH_CONFIDENCE, f"Topic matches canonical competency name '{canonical.name}'"

        return None, MappingStatus.UNRESOLVED, f"Topic '{topic_name}' is not currently mapped to a canonical competency"

    def get_p3_topics_for_competency(self, competency_id: int) -> List[str]:
        """Returns all verified P3 document topics belonging to a canonical competency."""
        topics = []
        for t_name, (target_id, _, _) in P3_TOPIC_MAPPINGS.items():
            if target_id == competency_id:
                topics.append(t_name)
        return topics

    # --- P2 iGOT Tag Mapping ---

    def map_p2_tag_to_canonical(self, tag: str) -> Tuple[Optional[CanonicalCompetency], MappingStatus, str]:
        if not tag:
            return None, MappingStatus.UNRESOLVED, "Empty course tag"

        clean = tag.strip()
        if clean in P2_IGOT_TAG_MAPPINGS:
            target_id, status, reason = P2_IGOT_TAG_MAPPINGS[clean]
            return self._by_id.get(target_id), status, reason

        # Check canonical name
        canonical = self.get_canonical_by_name(clean)
        if canonical:
            return canonical, MappingStatus.HIGH_CONFIDENCE, f"Course tag matches canonical competency '{canonical.name}'"

        return None, MappingStatus.UNRESOLVED, f"iGOT course tag '{tag}' has no canonical mapping"


# Singleton instance for backend-wide usage
competency_service = CompetencyMappingService()

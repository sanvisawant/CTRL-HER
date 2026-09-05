import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.department import Department
from app.models.competency import Competency
from app.models.user import User
from app.models.user_competency import UserCompetency
from app.models.learning import Course, UserCourseEnrollment, LearningLog
from app.models.assessment import AssessmentAttempt
from app.models.quest import QuestChallenge, UserQuestProgress, Achievement, UserAchievement
from app.utils.formulas import get_competency_status

def seed_database(db: Session):
    """
    Populates realistic MoSPI data for SIH26101 demonstration.
    Runs idempotently - only seeds if database is empty.
    """
    if db.query(Department).first():
        return # Already seeded

    # 1. Departments
    dept_data = [
        {"id": "dept_nsso", "code": "NSSO", "name": "National Sample Survey Office", "head_name": "Dr. R. K. Verma"},
        {"id": "dept_cso", "code": "CSO", "name": "Central Statistics Office", "head_name": "Smt. Sunita Rao"},
        {"id": "dept_fod", "code": "FOD", "name": "Field Operations Division", "head_name": "Shri Arvind Patel"},
        {"id": "dept_nad", "code": "NAD", "name": "National Accounts Division", "head_name": "Dr. P. Mukherjee"},
        {"id": "dept_esd", "code": "ESD", "name": "Economic Statistics Division", "head_name": "Smt. Meenakshi Sundaram"},
        {"id": "dept_sdrd", "code": "SDRD", "name": "Survey Design & Research Division", "head_name": "Dr. Amitava Bose"},
    ]
    for d in dept_data:
        db.add(Department(**d))
    db.commit()

    # 2. Competencies
    comp_data = [
        # Technical
        {"id": "comp_python", "code": "PYTHON", "name": "Python for Data Analysis", "domain": "Technical", "baseline_required_level": 4.0, "is_emerging": True},
        {"id": "comp_sql", "code": "SQL", "name": "SQL & Relational Databases", "domain": "Technical", "baseline_required_level": 4.0, "is_emerging": False},
        {"id": "comp_aiml", "code": "AI_ML", "name": "Artificial Intelligence & ML", "domain": "Technical", "baseline_required_level": 4.0, "is_emerging": True},
        {"id": "comp_gis", "code": "GIS", "name": "GIS & Spatial Analytics", "domain": "Technical", "baseline_required_level": 3.5, "is_emerging": True},
        {"id": "comp_cloud", "code": "CLOUD", "name": "Cloud Computing & Data Lakes", "domain": "Digital", "baseline_required_level": 3.5, "is_emerging": True},
        {"id": "comp_apis", "code": "APIS", "name": "Data Pipelines & APIs", "domain": "Technical", "baseline_required_level": 3.5, "is_emerging": True},
        # Statistical
        {"id": "comp_sampling", "code": "SAMPLING", "name": "Survey Sampling Methodology", "domain": "Statistical", "baseline_required_level": 4.5, "is_emerging": False},
        {"id": "comp_indices", "code": "INDEX_NUMBERS", "name": "Index Numbers & CPI/WPI", "domain": "Statistical", "baseline_required_level": 4.0, "is_emerging": False},
        {"id": "comp_timeseries", "code": "TIME_SERIES", "name": "Time Series & Forecasting", "domain": "Statistical", "baseline_required_level": 4.0, "is_emerging": False},
        # Digital
        {"id": "comp_viz", "code": "DATA_VIZ", "name": "Data Visualization & Dashboards", "domain": "Digital", "baseline_required_level": 4.0, "is_emerging": True},
        {"id": "comp_gov", "code": "DATA_GOVERNANCE", "name": "Data Governance & Metadata", "domain": "Digital", "baseline_required_level": 3.5, "is_emerging": False},
        # Behavioural
        {"id": "comp_comm", "code": "POLICY_COMM", "name": "Evidence-Based Communication", "domain": "Behavioural", "baseline_required_level": 4.0, "is_emerging": False},
    ]
    for c in comp_data:
        db.add(Competency(**c))
    db.commit()

    # 3. Primary Demo User (Sanvi Sharma) & Additional Officials
    primary_user = User(
        id="usr_demo_001",
        name="Sanvi Sharma",
        email="sanvi.sharma@mospi.gov.in",
        designation="Senior Statistical Officer",
        department_id="dept_nsso",
        role="learner",
        experience_years=4.5,
        highest_qualification="M.Sc. in Statistics",
        specialization="Sample Survey & Econometric Modeling",
        career_goal="Data & Statistical Analytics Specialist",
        profile_completion_pct=68.0,
        xp=720,
        level=7,
        streak_days=6,
        last_active_date=datetime.utcnow()
    )
    db.add(primary_user)

    # 40 additional realistic officials across departments
    names = [
        ("Rajesh Kumar", "Senior Statistical Officer", "dept_cso"),
        ("Priya Nair", "Assistant Director", "dept_sdrd"),
        ("Vikramaditya Rao", "Junior Statistical Officer", "dept_fod"),
        ("Ananya Sengupta", "Data Scientist", "dept_nsso"),
        ("Amitabh Sen", "Director", "dept_nad"),
        ("Sunita Deshmukh", "Senior Statistical Officer", "dept_esd"),
        ("Kavita Iyer", "Joint Director", "dept_sdrd"),
        ("Manoj Tiwari", "Junior Statistical Officer", "dept_fod"),
        ("Deepak Chawla", "Statistical Investigator", "dept_nsso"),
        ("Farhan Khan", "Statistical Officer", "dept_cso"),
        ("Pooja Hegde", "Data Analyst", "dept_nad"),
        ("Harish Patel", "Assistant Director", "dept_esd"),
    ]
    for idx, (n, des, dep_id) in enumerate(names, 2):
        u_id = f"usr_seed_{idx:03d}"
        u = User(
            id=u_id,
            name=n,
            email=f"{n.lower().replace(' ', '.')}@mospi.gov.in",
            designation=des,
            department_id=dep_id,
            role="learner" if idx > 4 else "admin",
            experience_years=float(2 + (idx % 12)),
            profile_completion_pct=float(60 + (idx * 3) % 40),
            xp=400 + (idx * 80),
            level=3 + (idx % 6),
            streak_days=1 + (idx % 9)
        )
        db.add(u)
    db.commit()

    # 4. Competency Scores for Primary User (Matches SIH Blueprint Exactly)
    primary_scores = [
        ("comp_python", 3.8, 4.0, 2.8, "Strong progress in scripting fundamentals; practical pipeline modularity advised."),
        ("comp_sql", 4.2, 4.0, 3.1, "Exceeds required benchmark for complex analytical queries."),
        ("comp_aiml", 2.1, 4.0, 1.4, "Limited practical exposure to machine learning workflows and model evaluation."),
        ("comp_gis", 1.7, 3.5, 1.0, "Requires foundational spatial geocoding and QGIS/GeoPandas coursework."),
        ("comp_cloud", 2.4, 3.5, 1.8, "Needs training on cloud-native object storage and containerized pipelines."),
        ("comp_viz", 3.0, 4.0, 2.2, "Good static visualization skills; interactive dashboarding recommended."),
        ("comp_sampling", 4.4, 4.5, 3.6, "Exceptional grasp of multistage survey design and weighting."),
        ("comp_indices", 4.1, 4.0, 3.5, "Strong mastery of Laspeyres, Paasche, and Fisher index formulation."),
        ("comp_timeseries", 3.8, 4.0, 3.0, "Proficient in ARIMA and seasonal decomposition."),
        ("comp_gov", 3.5, 3.5, 3.0, "Complies with National Metadata Directory standards."),
        ("comp_comm", 4.0, 4.0, 3.5, "Effective inter-departmental technical presentation skills."),
    ]
    for cid, cur, req, base, exp in primary_scores:
        status, _ = get_competency_status(cur, req)
        gap = max(0.0, req - cur)
        prio = "critical" if (cur < 2.5 or gap >= 1.5) else ("high" if gap >= 0.8 else ("medium" if gap > 0 else "low"))
        uc = UserCompetency(
            id=f"uc_demo_{cid}",
            user_id="usr_demo_001",
            competency_id=cid,
            current_level=cur,
            required_level=req,
            baseline_level=base,
            gap=gap,
            priority=prio,
            status=status,
            explanation=exp
        )
        db.add(uc)

    # Seed competency profiles for other officials
    all_users = db.query(User).all()
    all_comps = db.query(Competency).all()
    for u in all_users:
        if u.id == "usr_demo_001":
            continue
        for c in all_comps:
            cur = round(1.5 + (hash(f"{u.id}_{c.id}") % 35) / 10.0, 1)
            req = c.baseline_required_level or 4.0
            base = max(1.0, round(cur - 0.6, 1))
            status, _ = get_competency_status(cur, req)
            gap = max(0.0, req - cur)
            prio = "critical" if (cur < 2.5 or gap >= 1.5) else ("high" if gap >= 0.8 else "low")
            uc = UserCompetency(
                id=f"uc_{u.id}_{c.id}",
                user_id=u.id,
                competency_id=c.id,
                current_level=cur,
                required_level=req,
                baseline_level=base,
                gap=gap,
                priority=prio,
                status=status,
                explanation="Periodic competency review assessment log."
            )
            db.add(uc)
    db.commit()

    # 5. Courses & Enrollments
    courses_seed = [
        {"id": "crs_py_01", "title": "Python for Data Analysis & Official Statistics", "provider": "iGOT Karmayogi", "domain": "Technical", "difficulty": "Beginner", "duration_hours": 8.0, "expected_competency_gain": 0.4, "target_competency_id": "comp_python", "description": "Master NumPy, Pandas, and exploratory data analysis for socioeconomic survey data."},
        {"id": "crs_sql_01", "title": "SQL Essentials & Relational Database Design", "provider": "iGOT Karmayogi", "domain": "Technical", "difficulty": "Intermediate", "duration_hours": 10.0, "expected_competency_gain": 0.5, "target_competency_id": "comp_sql", "description": "Querying large-scale transactional and census databases with PostgreSQL."},
        {"id": "crs_aiml_01", "title": "AI/ML Foundations in Official Statistics", "provider": "NSSTA Academy", "domain": "Technical", "difficulty": "Intermediate", "duration_hours": 16.0, "expected_competency_gain": 0.8, "target_competency_id": "comp_aiml", "description": "Practical application of machine learning, classification, and data imputation in official surveys."},
        {"id": "crs_gis_01", "title": "Spatial Analysis with QGIS & GeoPandas", "provider": "NSSTA Academy", "domain": "Technical", "difficulty": "Beginner", "duration_hours": 12.0, "expected_competency_gain": 0.6, "target_competency_id": "comp_gis", "description": "Urban frame survey mapping and spatial thematic visualization."},
        {"id": "crs_sampling_01", "title": "Advanced Survey Sampling & Weight Calibration", "provider": "MoSPI Academy", "domain": "Statistical", "difficulty": "Advanced", "duration_hours": 14.0, "expected_competency_gain": 0.5, "target_competency_id": "comp_sampling", "description": "Two-stage stratified sampling, variance estimation, and non-response calibration."},
    ]
    for crs in courses_seed:
        db.add(Course(**crs))
    db.commit()

    # Enrollments for Sanvi
    enrollments_seed = [
        {"id": "enr_01", "user_id": "usr_demo_001", "course_id": "crs_py_01", "progress_pct": 100.0, "status": "completed", "learning_hours_spent": 12.0, "completed_at": datetime.utcnow() - timedelta(days=10)},
        {"id": "enr_02", "user_id": "usr_demo_001", "course_id": "crs_sql_01", "progress_pct": 65.0, "status": "in_progress", "learning_hours_spent": 6.5},
        {"id": "enr_03", "user_id": "usr_demo_001", "course_id": "crs_aiml_01", "progress_pct": 30.0, "status": "in_progress", "learning_hours_spent": 4.0},
    ]
    for enr in enrollments_seed:
        db.add(UserCourseEnrollment(**enr))

    now = datetime.utcnow()
    logs_seed = [
        {"id": "ll_1", "user_id": "usr_demo_001", "date": now - timedelta(days=1), "hours_spent": 2.2, "activity_type": "course"},
        {"id": "ll_2", "user_id": "usr_demo_001", "date": now - timedelta(days=3), "hours_spent": 1.5, "activity_type": "quiz"},
        {"id": "ll_3", "user_id": "usr_demo_001", "date": now - timedelta(days=5), "hours_spent": 1.5, "activity_type": "quest"},
        {"id": "ll_4", "user_id": "usr_demo_001", "date": now - timedelta(days=12), "hours_spent": 4.2, "activity_type": "course"},
        {"id": "ll_5", "user_id": "usr_demo_001", "date": now - timedelta(days=18), "hours_spent": 5.0, "activity_type": "course"},
        {"id": "ll_6", "user_id": "usr_demo_001", "date": now - timedelta(days=25), "hours_spent": 4.0, "activity_type": "reading"},
        {"id": "ll_7", "user_id": "usr_demo_001", "date": now - timedelta(days=40), "hours_spent": 23.6, "activity_type": "course"},
    ]
    for l in logs_seed:
        db.add(LearningLog(**l))

    # 6. Assessment Attempts
    assessments_seed = [
        {
            "id": "att_01",
            "user_id": "usr_demo_001",
            "competency_id": "comp_sampling",
            "assessment_title": "Sampling Methodology & Variance Assessment",
            "assessment_type": "quiz",
            "score_achieved": 8.0,
            "max_score": 10.0,
            "score_pct": 80.0,
            "passed": True,
            "strong_areas_json": json.dumps(["Sampling Design", "Population Framework"]),
            "weak_areas_json": json.dumps(["Stratification Weights", "Sampling Error"]),
            "ai_insight": "Strong performance on basic sampling frameworks. Further practice recommended on stratification variance calibration.",
            "completed_at": now - timedelta(days=2)
        },
        {
            "id": "att_02",
            "user_id": "usr_demo_001",
            "competency_id": "comp_python",
            "assessment_title": "Python Data Manipulation Benchmark",
            "assessment_type": "quiz",
            "score_achieved": 9.0,
            "max_score": 10.0,
            "score_pct": 90.0,
            "passed": True,
            "strong_areas_json": json.dumps(["Pandas DataFrames", "Data Cleaning"]),
            "weak_areas_json": json.dumps(["Vectorized String Parsing"]),
            "ai_insight": "Mastery demonstrated across standard aggregation workflows.",
            "completed_at": now - timedelta(days=8)
        }
    ]
    for a in assessments_seed:
        db.add(AssessmentAttempt(**a))

    # 7. Gamification Achievements
    achievements_seed = [
        {"id": "ach_first", "code": "FIRST_ASSESSMENT", "title": "First Assessment", "description": "Completed your first competency diagnostic test", "icon": "🏆", "xp_reward": 50},
        {"id": "ach_gap", "code": "GAP_CRUSHER", "title": "Gap Crusher", "description": "Reduced a critical competency gap by at least 0.5 points", "icon": "🎯", "xp_reward": 100},
        {"id": "ach_hours", "code": "HOURS_10", "title": "10 Hours Learned", "description": "Accumulated 10+ hours of structured official capacity building", "icon": "📚", "xp_reward": 75},
        {"id": "ach_ai", "code": "AI_EXPLORER", "title": "AI Explorer", "description": "Completed an AI/ML official statistics module", "icon": "🧠", "xp_reward": 100},
        {"id": "ach_detective", "code": "DATA_DETECTIVE", "title": "Data Detective", "description": "Discovered all subtle anomalies in a national survey dataset", "icon": "📊", "xp_reward": 150},
        {"id": "ach_streak", "code": "STREAK_7", "title": "7-Day Learning Streak", "description": "Maintained continuous daily engagement for 7 consecutive days", "icon": "🔥", "xp_reward": 200},
    ]
    for ach in achievements_seed:
        db.add(Achievement(**ach))
    db.commit()

    # Unlock some achievements for Sanvi with explicit IDs
    unlocked_for_sanvi = [("ua_seed_1", "ach_first"), ("ua_seed_2", "ach_hours"), ("ua_seed_3", "ach_ai")]
    for uaid, aid in unlocked_for_sanvi:
        db.add(UserAchievement(id=uaid, user_id="usr_demo_001", achievement_id=aid, unlocked_at=now - timedelta(days=4)))

    # 8. Competency Quest Challenges
    det_payload = {
        "dataset_name": "PLFS_Household_Batch_04.csv",
        "columns": ["Person_ID", "Age", "Monthly_Income_INR", "State_Code", "Work_Status"],
        "rows": [
            {"Person_ID": "PLFS_101", "Age": 24, "Monthly_Income_INR": 45000, "State_Code": "MH", "Work_Status": "Employed"},
            {"Person_ID": "PLFS_102", "Age": 27, "Monthly_Income_INR": 52000, "State_Code": "MH", "Work_Status": "Employed"},
            {"Person_ID": "PLFS_103", "Age": None, "Monthly_Income_INR": 61000, "State_Code": "GJ", "Work_Status": "Self-Employed"},
            {"Person_ID": "PLFS_104", "Age": 31, "Monthly_Income_INR": 9999999, "State_Code": "MH", "Work_Status": "Employed"},
            {"Person_ID": "PLFS_105", "Age": 29, "Monthly_Income_INR": 48000, "State_Code": "XX", "Work_Status": "Unemployed"}
        ],
        "anomaly_hints": [
            "Check for missing mandatory values in demographic fields.",
            "Inspect income field for impossible sentinel placeholder values.",
            "Verify state codes against official Census master codes."
        ],
        "questions": [
            {"id": "q1", "prompt": "Which row contains an unhandled missing value in a mandatory demographic field?", "options": ["Row 1 (PLFS_101)", "Row 2 (PLFS_102)", "Row 3 (PLFS_103)", "Row 5 (PLFS_105)"], "question_type": "single_choice"},
            {"id": "q2", "prompt": "Which row contains an extreme numerical outlier / placeholder code?", "options": ["Row 1 (PLFS_101)", "Row 4 (PLFS_104: 9999999)", "Row 3 (PLFS_103)", "Row 2 (PLFS_102)"], "question_type": "single_choice"},
            {"id": "q3", "prompt": "Which row contains an invalid ISO/Census State Code not found in official directory?", "options": ["Row 1 (MH)", "Row 3 (GJ)", "Row 5 (XX)", "Row 4 (MH)"], "question_type": "single_choice"}
        ]
    }
    db.add(QuestChallenge(
        id="qst_det_01",
        type="data_detective",
        title="Data Detective: PLFS Household Survey Audit",
        description="Inspect this extract from the Periodic Labour Force Survey field enumeration table. Identify data-quality anomalies before microdata ingestion.",
        difficulty="Medium",
        xp_reward=150,
        payload_json=json.dumps(det_payload),
        solution_json=json.dumps({"q1": "Row 3 (PLFS_103)", "q2": "Row 4 (PLFS_104: 9999999)", "q3": "Row 5 (XX)"}),
        is_daily=False
    ))

    sudoku_payload = {
        "size": 4,
        "grid": [
            [2, None, 4, 1],
            [None, 1, 3, 2],
            [3, 4, None, None],
            [1, 2, None, 3]
        ],
        "fixed_mask": [
            [True, False, True, True],
            [False, True, True, True],
            [True, True, False, False],
            [True, True, False, True]
        ],
        "row_constraints": [
            {"row": 0, "constraint": "Mean = 2.5, Distinct digits 1 to 4 (Sum = 10)"},
            {"row": 1, "constraint": "Mean = 2.5, Distinct digits 1 to 4 (Sum = 10)"},
            {"row": 2, "constraint": "Variance = 1.25, Distinct digits 1 to 4"},
            {"row": 3, "constraint": "Sum = 10, Distinct digits 1 to 4"}
        ],
        "col_constraints": [
            {"col": 0, "constraint": "Col 1 Sum = 10, Permutation of {1, 2, 3, 4}"},
            {"col": 1, "constraint": "Col 2 Sum = 10, Permutation of {1, 2, 3, 4}"},
            {"col": 2, "constraint": "Col 3 Sum = 10, Permutation of {1, 2, 3, 4}"},
            {"col": 3, "constraint": "Col 4 Sum = 10, Permutation of {1, 2, 3, 4}"}
        ]
    }
    db.add(QuestChallenge(
        id="qst_sudoku_01",
        type="statistical_sudoku",
        title="Statistical Sudoku: Latin Square Sample Allocator",
        description="Fill each row and column with digits 1 to 4 so each digit appears exactly once, satisfying the statistical mean (μ = 2.5) and Latin Square non-collinearity constraints.",
        difficulty="Hard",
        xp_reward=200,
        payload_json=json.dumps(sudoku_payload),
        solution_json=json.dumps({"grid": [[2, 3, 4, 1], [4, 1, 3, 2], [3, 4, 2, 1], [1, 2, 1, 3]]}),
        is_daily=False
    ))

    viz_payload = {
        "dataset_sample": [
            {"Year": 2020, "Month": "Jan", "Urban_Unemployment_Rate": 7.8, "Rural_Unemployment_Rate": 6.1},
            {"Year": 2020, "Month": "Apr", "Urban_Unemployment_Rate": 24.9, "Rural_Unemployment_Rate": 22.8},
            {"Year": 2021, "Month": "Jan", "Urban_Unemployment_Rate": 8.1, "Rural_Unemployment_Rate": 6.5},
            {"Year": 2022, "Month": "Jan", "Urban_Unemployment_Rate": 7.4, "Rural_Unemployment_Rate": 5.9},
            {"Year": 2023, "Month": "Jan", "Urban_Unemployment_Rate": 6.8, "Rural_Unemployment_Rate": 5.4}
        ],
        "options": [
            {"id": "pie", "label": "Pie Chart", "description": "Shows proportions of a whole for categorical slices at a single timestamp."},
            {"id": "line", "label": "Multi-Line Chart (Time-Series)", "description": "Displays continuous trends, seasonal variations, and shocks across sequential time intervals."},
            {"id": "hist", "label": "Histogram", "description": "Shows frequency distribution of a single continuous variable divided into bins."},
            {"id": "scatter", "label": "Scatter Plot", "description": "Illustrates correlation/relationship between two independent continuous variables without temporal ordering."}
        ]
    }
    db.add(QuestChallenge(
        id="qst_viz_01",
        type="visualization",
        title="Visualization Challenge: High-Frequency Labor Market Trends",
        description="MoSPI is releasing monthly urban vs. rural unemployment rates tracked continuously across 5 consecutive years (60 monthly observation points). Which visualization best communicates long-term trends and macroeconomic shock recovery?",
        difficulty="Easy",
        xp_reward=120,
        payload_json=json.dumps(viz_payload),
        solution_json=json.dumps({"correct_option_id": "line"}),
        is_daily=False
    ))

    mission_payload = {
        "agency_context": "National Statistical Systems Training Academy (NSSTA) Field Simulator",
        "steps": [
            {
                "step_number": 1,
                "situation": "You are tasked with designing the sampling frame for the All-India Household Consumer Expenditure Survey (CES) across 36 States/UTs.",
                "question": "Given high socio-economic heterogeneity between rural and urban sectors, what is the best first-stage stratification technique?",
                "options": [
                    {"id": "s1_a", "label": "Simple Random Sampling without replacement (SRSWOR) across the full state"},
                    {"id": "s1_b", "label": "Two-Stage Stratified Sampling (First Stage: Census Villages/Urban Blocks; Second Stage: Households)"},
                    {"id": "s1_c", "label": "Convenience Sampling in high-density urban markets only"}
                ]
            },
            {
                "step_number": 2,
                "situation": "During field enumeration in District X, 15% of selected affluent households in an urban frame refuse to report exact income.",
                "question": "How should the statistical officer mitigate non-response bias during data processing?",
                "options": [
                    {"id": "s2_a", "label": "Delete the entire district from the national estimate"},
                    {"id": "s2_b", "label": "Apply post-stratification survey weighting adjustments and item imputation based on asset ownership proxies"},
                    {"id": "s2_c", "label": "Duplicate the responses of the poorest respondents to fill the quota"}
                ]
            }
        ]
    }
    db.add(QuestChallenge(
        id="qst_mission_01",
        type="real_world_mission",
        title="Mission: All-India Consumer Expenditure Survey Design",
        description="Lead the statistical design and data integrity protocol for a multi-million household national socioeconomic survey.",
        difficulty="Hard",
        xp_reward=250,
        payload_json=json.dumps(mission_payload),
        solution_json=json.dumps({"step_1": "s1_b", "step_2": "s2_b"}),
        is_daily=False
    ))

    daily_payload = {
        "dataset_name": "Daily_Price_Index_Validation",
        "anomaly_hints": ["Look for non-positive commodity price indices"],
        "columns": ["Item_Code", "Item_Name", "Base_Price_2012", "Current_Price_INR", "Price_Relative"],
        "rows": [
            {"Item_Code": "1.1.01", "Item_Name": "Rice (Grade A)", "Base_Price_2012": 28.5, "Current_Price_INR": 44.0, "Price_Relative": 154.3},
            {"Item_Code": "1.1.02", "Item_Name": "Wheat", "Base_Price_2012": 18.0, "Current_Price_INR": -5.0, "Price_Relative": -27.7},
            {"Item_Code": "1.1.03", "Item_Name": "Milk (Cow)", "Base_Price_2012": 35.0, "Current_Price_INR": 58.0, "Price_Relative": 165.7}
        ],
        "questions": [
            {"id": "dq1", "prompt": "Which commodity has a negative price entry resulting in a corrupt Price Relative?", "options": ["Rice", "Wheat (Current Price -5.0)", "Milk"], "question_type": "single_choice"}
        ]
    }
    db.add(QuestChallenge(
        id="qst_daily_01",
        type="daily_challenge",
        title="Daily Micro-Challenge: Consumer Price Index Validation",
        description="A 2-minute daily quality check. Detect invalid price submissions before WPI/CPI index aggregation.",
        difficulty="Easy",
        xp_reward=80,
        payload_json=json.dumps(daily_payload),
        solution_json=json.dumps({"dq1": "Wheat (Current Price -5.0)"}),
        is_daily=True,
        daily_date=datetime.utcnow().strftime("%Y-%m-%d")
    ))

    db.commit()

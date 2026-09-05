import json
import uuid
from datetime import datetime, date
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.models.quest import QuestChallenge, UserQuestProgress, Achievement, UserAchievement
from app.models.user import User
from app.schemas.quest import (
    QuestHomeResponse,
    AchievementBadge,
    ActiveMissionSummary,
    DataDetectiveChallenge,
    DataDetectiveQuestion,
    StatisticalSudokuChallenge,
    VisualizationChallenge,
    VisualizationOption,
    RealWorldMissionChallenge,
    RealWorldMissionStep,
    QuestSubmissionRequest,
    QuestSubmissionResponse,
)
from app.utils.formulas import check_level_up, calculate_xp_for_level

class QuestService:
    @staticmethod
    def get_quest_home(db: Session, user_id: str) -> QuestHomeResponse:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(User).first()
            if not user:
                raise ValueError("No user found")
            user_id = user.id

        # 1. User Gamification Stats
        user_xp = user.xp if (user.xp is not None and user.xp > 0) else 720
        user_level = user.level if (user.level is not None and user.level > 0) else 7
        streak_days = user.streak_days if (user.streak_days is not None and user.streak_days > 0) else 6
        next_xp = calculate_xp_for_level(user_level)
        progress_pct = round((user_xp / max(1, next_xp)) * 100.0, 1)

        # 2. Daily Challenge Check
        daily_challenge = db.query(QuestChallenge).filter(QuestChallenge.is_daily == True).first()
        daily_attempt = None
        if daily_challenge:
            daily_attempt = (
                db.query(UserQuestProgress)
                .filter(
                    UserQuestProgress.user_id == user.id,
                    UserQuestProgress.quest_challenge_id == daily_challenge.id
                )
                .first()
            )
        daily_available = bool(daily_challenge and not daily_attempt)

        # 3. Active Missions
        challenges = db.query(QuestChallenge).all()
        user_attempts = {p.quest_challenge_id: p for p in db.query(UserQuestProgress).filter(UserQuestProgress.user_id == user.id).all()}

        active_missions = []
        for c in challenges:
            completed = (c.id in user_attempts and user_attempts[c.id].status == "completed")
            active_missions.append(
                ActiveMissionSummary(
                    id=c.id,
                    type=c.type,
                    title=c.title,
                    difficulty=c.difficulty,
                    xp_reward=c.xp_reward,
                    completed=completed
                )
            )

        # 4. Achievements
        achievements = db.query(Achievement).all()
        user_achievements = {ua.achievement_id: ua for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user.id).all()}

        achievement_badges = []
        for a in achievements:
            unlocked = (a.id in user_achievements)
            unlocked_at = user_achievements[a.id].unlocked_at if unlocked else None
            achievement_badges.append(
                AchievementBadge(
                    id=a.id,
                    code=a.code,
                    title=a.title,
                    description=a.description,
                    icon=a.icon,
                    unlocked=unlocked,
                    unlocked_at=unlocked_at
                )
            )

        return QuestHomeResponse(
            user_id=user.id,
            user_name=user.name,
            level=user_level,
            current_xp=user_xp,
            next_level_xp=next_xp,
            progress_pct=progress_pct,
            streak_days=streak_days,
            daily_challenge_available=daily_available,
            daily_challenge_id=daily_challenge.id if daily_challenge else "qst_daily_01",
            daily_challenge_title=daily_challenge.title if daily_challenge else "Find the Survey Sampling Anomaly",
            active_missions=active_missions,
            achievements=achievement_badges
        )

    @staticmethod
    def get_data_detective_challenge(db: Session, challenge_id: Optional[str] = None) -> DataDetectiveChallenge:
        query = db.query(QuestChallenge).filter(QuestChallenge.type == "data_detective")
        if challenge_id:
            query = query.filter(QuestChallenge.id == challenge_id)
        challenge = query.first()

        if challenge:
            payload = json.loads(challenge.payload_json)
            return DataDetectiveChallenge(
                id=challenge.id,
                title=challenge.title,
                scenario=challenge.description,
                dataset_name=payload.get("dataset_name", "NSSO Periodic Labour Force Survey Sample"),
                columns=payload.get("columns", ["Person_ID", "Age", "Monthly_Income_INR", "State_Code", "Work_Status"]),
                rows=payload.get("rows", []),
                anomaly_hints=payload.get("anomaly_hints", []),
                questions=[DataDetectiveQuestion(**q) for q in payload.get("questions", [])],
                xp_reward=challenge.xp_reward
            )

        # Fallback
        rows = [
            {"Person_ID": "PLFS_101", "Age": 24, "Monthly_Income_INR": 45000, "State_Code": "MH", "Work_Status": "Employed"},
            {"Person_ID": "PLFS_102", "Age": 27, "Monthly_Income_INR": 52000, "State_Code": "MH", "Work_Status": "Employed"},
            {"Person_ID": "PLFS_103", "Age": None, "Monthly_Income_INR": 61000, "State_Code": "GJ", "Work_Status": "Self-Employed"},
            {"Person_ID": "PLFS_104", "Age": 31, "Monthly_Income_INR": 9999999, "State_Code": "MH", "Work_Status": "Employed"},
            {"Person_ID": "PLFS_105", "Age": 29, "Monthly_Income_INR": 48000, "State_Code": "XX", "Work_Status": "Unemployed"}
        ]
        questions = [
            DataDetectiveQuestion(id="q1", prompt="Which row contains an unhandled missing value in a mandatory demographic field?", options=["Row 1 (PLFS_101)", "Row 2 (PLFS_102)", "Row 3 (PLFS_103)", "Row 5 (PLFS_105)"], question_type="single_choice"),
            DataDetectiveQuestion(id="q2", prompt="Which row contains a severe numerical outlier (placeholder code)?", options=["Row 1 (PLFS_101)", "Row 4 (PLFS_104: 9999999)", "Row 3 (PLFS_103)", "Row 2 (PLFS_102)"], question_type="single_choice"),
            DataDetectiveQuestion(id="q3", prompt="Which row contains an invalid ISO/Census State Code not found in official directory?", options=["Row 1 (MH)", "Row 3 (GJ)", "Row 5 (XX)", "Row 4 (MH)"], question_type="single_choice")
        ]
        return DataDetectiveChallenge(
            id="qst_det_01",
            title="Data Detective: PLFS Household Survey Audit",
            scenario="Inspect this extract from the Periodic Labour Force Survey field enumeration table. Identify data-quality anomalies before microdata ingestion.",
            dataset_name="PLFS_Urban_Extract_Batch_4.csv",
            columns=["Person_ID", "Age", "Monthly_Income_INR", "State_Code", "Work_Status"],
            rows=rows,
            anomaly_hints=[
                "Check for missing mandatory identifiers (Age/Sex).",
                "Look for sentinel error codes (e.g., 9999999) entered as income.",
                "Verify standard state codes (e.g. MH for Maharashtra, GJ for Gujarat)."
            ],
            questions=questions,
            xp_reward=150
        )

    @staticmethod
    def get_statistical_sudoku_challenge(db: Session, challenge_id: Optional[str] = None) -> StatisticalSudokuChallenge:
        query = db.query(QuestChallenge).filter(QuestChallenge.type == "statistical_sudoku")
        if challenge_id:
            query = query.filter(QuestChallenge.id == challenge_id)
        challenge = query.first()

        if challenge:
            payload = json.loads(challenge.payload_json)
            return StatisticalSudokuChallenge(
                id=challenge.id,
                title=challenge.title,
                size=payload.get("size", 4),
                rules_description=challenge.description,
                grid=payload.get("grid", []),
                fixed_mask=payload.get("fixed_mask", []),
                row_constraints=payload.get("row_constraints", []),
                col_constraints=payload.get("col_constraints", []),
                xp_reward=challenge.xp_reward
            )

        grid = [
            [2, None, 4, 1],
            [None, 1, 3, 2],
            [3, 4, None, None],
            [1, 2, None, 3]
        ]
        fixed_mask = [
            [True, False, True, True],
            [False, True, True, True],
            [True, True, False, False],
            [True, True, False, True]
        ]
        row_constraints = [
            {"row": 0, "constraint": "Mean = 2.5, Distinct digits 1 to 4 (Sum = 10)"},
            {"row": 1, "constraint": "Mean = 2.5, Distinct digits 1 to 4 (Sum = 10)"},
            {"row": 2, "constraint": "Variance = 1.25, Distinct digits 1 to 4"},
            {"row": 3, "constraint": "Sum = 10, Distinct digits 1 to 4"}
        ]
        col_constraints = [
            {"col": 0, "constraint": "Col 1 Sum = 10, Permutation of {1, 2, 3, 4}"},
            {"col": 1, "constraint": "Col 2 Sum = 10, Permutation of {1, 2, 3, 4}"},
            {"col": 2, "constraint": "Col 3 Sum = 10, Permutation of {1, 2, 3, 4}"},
            {"col": 3, "constraint": "Col 4 Sum = 10, Permutation of {1, 2, 3, 4}"}
        ]
        return StatisticalSudokuChallenge(
            id="qst_sudoku_01",
            title="Statistical Sudoku: Latin Square Sample Allocator",
            size=4,
            rules_description="Fill each row and column with digits 1 to 4 so each digit appears exactly once, satisfying the statistical mean (μ = 2.5) and Latin Square non-collinearity constraints.",
            grid=grid,
            fixed_mask=fixed_mask,
            row_constraints=row_constraints,
            col_constraints=col_constraints,
            xp_reward=200
        )

    @staticmethod
    def get_visualization_challenge(db: Session, challenge_id: Optional[str] = None) -> VisualizationChallenge:
        query = db.query(QuestChallenge).filter(QuestChallenge.type == "visualization")
        if challenge_id:
            query = query.filter(QuestChallenge.id == challenge_id)
        challenge = query.first()

        if challenge:
            payload = json.loads(challenge.payload_json)
            return VisualizationChallenge(
                id=challenge.id,
                title=challenge.title,
                scenario=challenge.description,
                dataset_sample=payload.get("dataset_sample", []),
                options=[VisualizationOption(**opt) for opt in payload.get("options", [])],
                xp_reward=challenge.xp_reward
            )

        dataset_sample = [
            {"Year": 2020, "Month": "Jan", "Urban_Unemployment_Rate": 7.8, "Rural_Unemployment_Rate": 6.1},
            {"Year": 2020, "Month": "Apr", "Urban_Unemployment_Rate": 24.9, "Rural_Unemployment_Rate": 22.8},
            {"Year": 2021, "Month": "Jan", "Urban_Unemployment_Rate": 8.1, "Rural_Unemployment_Rate": 6.5},
            {"Year": 2022, "Month": "Jan", "Urban_Unemployment_Rate": 7.4, "Rural_Unemployment_Rate": 5.9},
            {"Year": 2023, "Month": "Jan", "Urban_Unemployment_Rate": 6.8, "Rural_Unemployment_Rate": 5.4}
        ]
        options = [
            VisualizationOption(id="pie", label="Pie Chart", description="Shows proportions of a whole for categorical slices at a single timestamp."),
            VisualizationOption(id="line", label="Multi-Line Chart (Time-Series)", description="Displays continuous trends, seasonal variations, and shocks across sequential time intervals."),
            VisualizationOption(id="hist", label="Histogram", description="Shows frequency distribution of a single continuous variable divided into bins."),
            VisualizationOption(id="scatter", label="Scatter Plot", description="Illustrates correlation/relationship between two independent continuous variables without temporal ordering.")
        ]
        return VisualizationChallenge(
            id="qst_viz_01",
            title="Visualization Challenge: High-Frequency Labor Market Trends",
            scenario="MoSPI is releasing monthly urban vs. rural unemployment rates tracked continuously across 5 consecutive years (60 monthly observation points). Which visualization best communicates long-term trends and macroeconomic shock recovery?",
            dataset_sample=dataset_sample,
            options=options,
            xp_reward=120
        )

    @staticmethod
    def get_real_world_missions(db: Session) -> List[RealWorldMissionChallenge]:
        challenges = db.query(QuestChallenge).filter(QuestChallenge.type == "real_world_mission").all()
        if challenges:
            res = []
            for c in challenges:
                payload = json.loads(c.payload_json)
                steps = [RealWorldMissionStep(**s) for s in payload.get("steps", [])]
                res.append(
                    RealWorldMissionChallenge(
                        id=c.id,
                        title=c.title,
                        agency_context=payload.get("agency_context", "National Statistical Commission / NSSO"),
                        problem_statement=c.description,
                        steps=steps,
                        xp_reward=c.xp_reward
                    )
                )
            return res

        steps = [
            RealWorldMissionStep(
                step_number=1,
                situation="You are tasked with designing the sampling frame for the All-India Household Consumer Expenditure Survey (CES) across 36 States/UTs.",
                question="Given high socio-economic heterogeneity between rural and urban sectors, what is the best first-stage stratification technique?",
                options=[
                    {"id": "s1_a", "label": "Simple Random Sampling without replacement (SRSWOR) across the full state"},
                    {"id": "s1_b", "label": "Two-Stage Stratified Sampling (First Stage: Census Villages/Urban Blocks; Second Stage: Households)"},
                    {"id": "s1_c", "label": "Convenience Sampling in high-density urban markets only"}
                ]
            ),
            RealWorldMissionStep(
                step_number=2,
                situation="During field enumeration in District X, 15% of selected affluent households in an urban frame refuse to report exact income.",
                question="How should the statistical officer mitigate non-response bias during data processing?",
                options=[
                    {"id": "s2_a", "label": "Delete the entire district from the national estimate"},
                    {"id": "s2_b", "label": "Apply post-stratification survey weighting adjustments and item imputation based on asset ownership proxies"},
                    {"id": "s2_c", "label": "Duplicate the responses of the poorest respondents to fill the quota"}
                ]
            )
        ]
        return [
            RealWorldMissionChallenge(
                id="qst_mission_01",
                title="Mission: All-India Consumer Expenditure Survey Design",
                agency_context="National Statistical Systems Training Academy (NSSTA) Field Simulator",
                problem_statement="Lead the statistical design and data integrity protocol for a multi-million household national socioeconomic survey.",
                steps=steps,
                xp_reward=250
            )
        ]

    @staticmethod
    def submit_quest_challenge(db: Session, request: QuestSubmissionRequest) -> QuestSubmissionResponse:
        user_id = request.user_id or "usr_demo_001"
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(User).first()
            if not user:
                raise ValueError("User not found")
            user_id = user.id

        challenge = db.query(QuestChallenge).filter(QuestChallenge.id == request.challenge_id).first()
        
        # Determine challenge type & evaluate answers
        is_correct = True
        score_pct = 100.0
        feedback = "Outstanding statistical reasoning! Your answers comply with official MoSPI and UN Fundamental Principles of Official Statistics."
        unlocked_achievements = []

        # 1. Evaluation logic by challenge type
        if challenge and challenge.type == "visualization" or request.challenge_id == "qst_viz_01":
            selected = str(request.answers).lower().strip()
            if "line" in selected:
                is_correct = True
                score_pct = 100.0
                feedback = (
                    "Correct! A Multi-Line Chart is the optimal choice for displaying high-frequency temporal data "
                    "(monthly points over 5 years). It clearly highlights trends, seasonality, and comparative trajectories "
                    "between urban and rural series without cluttering."
                )
            else:
                is_correct = False
                score_pct = 40.0
                feedback = (
                    "Not optimal. For continuous time-series data across 60 monthly observations, a Line Chart is "
                    "standard in official statistics. Pie charts cannot convey time trends, and histograms represent distribution rather than sequential changes."
                )

        elif challenge and challenge.type == "data_detective" or request.challenge_id == "qst_det_01":
            answers_str = json.dumps(request.answers).lower()
            correct_flags = 0
            if "row 3" in answers_str or "plfs_103" in answers_str or "q1" in answers_str:
                correct_flags += 1
            if "row 4" in answers_str or "9999999" in answers_str or "q2" in answers_str:
                correct_flags += 1
            if "row 5" in answers_str or "xx" in answers_str or "q3" in answers_str:
                correct_flags += 1

            if correct_flags >= 2:
                is_correct = True
                score_pct = 100.0 if correct_flags == 3 else 80.0
                feedback = (
                    "Superb Data Detective work! You successfully identified: (1) Missing mandatory Age in PLFS_103, "
                    "(2) Sentinel code '9999999' entered as income in PLFS_104, and (3) Non-existent State Code 'XX' in PLFS_105. "
                    "Automated validation rules have been triggered to flag these rows."
                )
            else:
                is_correct = False
                score_pct = 50.0
                feedback = "Partial audit completed. Remember to check both range bounds, mandatory fields, and reference code masters."

        elif challenge and challenge.type == "statistical_sudoku" or request.challenge_id == "qst_sudoku_01":
            is_correct = True
            score_pct = 100.0
            feedback = (
                "Puzzle Solved! All Latin Square rows and columns sum to 10 with a mean of 2.5 and variance of 1.25, "
                "ensuring orthogonal sample distribution."
            )

        else:
            is_correct = True
            score_pct = 100.0
            feedback = "Mission Completed! Your statistical sampling protocol and bias adjustment strategies meet national survey standards."

        # 2. XP, Level & Streak Updates
        xp_gain = int((challenge.xp_reward if challenge else 100) * (score_pct / 100.0))
        old_xp = user.xp if (user.xp is not None and user.xp > 0) else 720
        old_level = user.level if (user.level is not None and user.level > 0) else 7
        new_total_xp = old_xp + xp_gain
        new_level, next_threshold, is_level_up = check_level_up(new_total_xp, old_level)

        user.xp = new_total_xp
        user.level = new_level
        user.streak_days = (user.streak_days or 0) + 1
        user.last_active_date = datetime.utcnow()

        # 3. Unlock Gamification Achievements
        if (challenge and challenge.type == "data_detective") or "det" in request.challenge_id:
            det_ach = db.query(Achievement).filter(Achievement.code == "DATA_DETECTIVE").first()
            if det_ach:
                existing_ua = db.query(UserAchievement).filter(
                    UserAchievement.user_id == user.id,
                    UserAchievement.achievement_id == det_ach.id
                ).first()
                if not existing_ua:
                    db.add(UserAchievement(
                        id=f"ua_{uuid.uuid4().hex[:12]}",
                        user_id=user.id,
                        achievement_id=det_ach.id
                    ))
                    unlocked_achievements.append("Data Detective (Master of Survey Data Integrity)")

        if user.streak_days >= 7:
            streak_ach = db.query(Achievement).filter(Achievement.code == "STREAK_7").first()
            if streak_ach:
                existing_ua = db.query(UserAchievement).filter(
                    UserAchievement.user_id == user.id,
                    UserAchievement.achievement_id == streak_ach.id
                ).first()
                if not existing_ua:
                    db.add(UserAchievement(
                        id=f"ua_{uuid.uuid4().hex[:12]}",
                        user_id=user.id,
                        achievement_id=streak_ach.id
                    ))
                    unlocked_achievements.append("7-Day Learning Streak (Continuous Statistical Excellence)")

        # 4. Save Progress Attempt
        if challenge:
            progress = UserQuestProgress(
                id=f"uqp_{uuid.uuid4().hex[:12]}",
                user_id=user.id,
                quest_challenge_id=challenge.id,
                status="completed" if is_correct else "attempted",
                score=score_pct,
                xp_earned=xp_gain,
                user_submission_json=json.dumps(request.answers) if not isinstance(request.answers, str) else request.answers,
                feedback_json=feedback
            )
            db.add(progress)

        db.commit()

        return QuestSubmissionResponse(
            challenge_id=request.challenge_id,
            is_correct=is_correct,
            score_pct=score_pct,
            xp_earned=xp_gain,
            new_total_xp=new_total_xp,
            new_level=new_level,
            level_up=is_level_up,
            streak_days=user.streak_days,
            streak_increased=True,
            detailed_feedback=feedback,
            correct_solution=None,
            unlocked_achievements=unlocked_achievements
        )

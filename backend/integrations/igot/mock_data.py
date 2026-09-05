# Mock iGOT course catalogue for hackathon/demo use.

COURSES = [
    {
        "id": "IG001",
        "title": "Python Basics",
        "description": "Introduction to Python programming and basic programming concepts.",
        "competencies": ["Python"],
        "difficulty": "Beginner",
        "duration_hours": 10,
        "target_roles": [
            "Statistical Officer",
            "Data Analyst",
            "Data Scientist"
        ],
        "provider": "iGOT Karmayogi",
        "category": "Technical Skills",
        "url": "#"
    },
    {
        "id": "IG002",
        "title": "Python for Data Analysis",
        "description": "Learn data analysis, processing and visualization using Python.",
        "competencies": [
            "Python",
            "Data Analysis"
        ],
        "difficulty": "Intermediate",
        "duration_hours": 20,
        "target_roles": [
            "Statistical Officer",
            "Data Analyst"
        ],
        "provider": "iGOT Karmayogi",
        "category": "Data Analytics",
        "url": "#"
    },
    {
        "id": "IG003",
        "title": "Statistics with Python",
        "description": "Apply statistical concepts and statistical analysis using Python.",
        "competencies": [
            "Statistics",
            "Python",
            "Data Analysis"
        ],
        "difficulty": "Intermediate",
        "duration_hours": 25,
        "target_roles": [
            "Statistical Officer",
            "Data Analyst"
        ],
        "provider": "iGOT Karmayogi",
        "category": "Statistics",
        "url": "#"
    },
    {
        "id": "IG004",
        "title": "Machine Learning Fundamentals",
        "description": "Introduction to machine learning algorithms and concepts.",
        "competencies": [
            "Machine Learning",
            "Python",
            "Data Analysis"
        ],
        "difficulty": "Advanced",
        "duration_hours": 30,
        "target_roles": [
            "Data Analyst",
            "Data Scientist"
        ],
        "provider": "iGOT Karmayogi",
        "category": "Artificial Intelligence",
        "url": "#"
    },
    {
        "id": "IG005",
        "title": "Advanced Statistical Methods",
        "description": "Advanced statistical methods for official statistics and data analysis.",
        "competencies": [
            "Statistics",
            "Advanced Statistics",
            "Data Analysis"
        ],
        "difficulty": "Advanced",
        "duration_hours": 30,
        "target_roles": [
            "Statistical Officer",
            "Senior Statistical Officer"
        ],
        "provider": "iGOT Karmayogi",
        "category": "Statistics",
        "url": "#"
    }
]


USER_PROGRESS = [
    {
        "user_id": "U001",
        "course_id": "IG001",
        "progress": 100,
        "status": "COMPLETED"
    },
    {
        "user_id": "U001",
        "course_id": "IG002",
        "progress": 60,
        "status": "IN_PROGRESS"
    },
    {
        "user_id": "U001",
        "course_id": "IG003",
        "progress": 0,
        "status": "NOT_STARTED"
    }
]
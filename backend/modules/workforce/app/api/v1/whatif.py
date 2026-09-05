from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_admin
from app.schemas.common import APIResponse
from app.schemas.whatif import WhatIfRequest, WhatIfResponse
from app.services.whatif_simulator_service import WhatIfSimulatorService

router = APIRouter(prefix="/admin", tags=["Workforce What-If Simulator"])

@router.post("/what-if/simulate", response_model=APIResponse[WhatIfResponse])
def simulate_workforce_scenario(
    request: WhatIfRequest = Body(
        ...,
        openapi_examples={
            "default": {
                "summary": "AI/ML Capacity Simulation",
                "value": {
                    "competency_code": "AI_ML",
                    "required_level": 4.0,
                    "target_officials_count": 500,
                    "department_code": None
                }
            }
        }
    ),
    db: Session = Depends(get_db),
    admin: str = Depends(require_admin)
):
    """
    Workforce What-If Scenario Simulator:
    
    Admin Inputs:
    - Target Competency (e.g. AI_ML, GIS, PYTHON)
    - Required Proficiency Level (e.g. 4.0)
    - Target Officials Count Needed (e.g. 500)
    
    Simulated Outputs:
    - Current Qualified Officials (e.g. 127)
    - Gap / Training Deficit (e.g. 373)
    - Estimated Total Training Hours (e.g. 7,460 hours)
    - Policy Priority Rating (HIGH / MEDIUM / LOW)
    - Actionable Strategic Training Plan
    - Recommended aligned courses & Department impact breakdown
    """
    data = WhatIfSimulatorService.simulate_workforce_capacity(db, request=request)
    return APIResponse(success=True, message="What-If workforce simulation calculated successfully", data=data)

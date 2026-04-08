from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from auth_service import auth_service
from middleware.auth_middleware import get_current_user_id

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    username: str
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/signup")
async def signup(req: SignupRequest):
    try:
        return auth_service.signup(
            username=req.username,
            password=req.password,
            display_name=req.name,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    try:
        return auth_service.login(username=req.username, password=req.password)
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
async def get_me(request: Request, user_id: str = Depends(get_current_user_id)):
    profile = auth_service.get_user_profile(user_id)
    return {
        "user_id": user_id,
        "username": getattr(request.state, "username", ""),
        "profile": profile,
    }

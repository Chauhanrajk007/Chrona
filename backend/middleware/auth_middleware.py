from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from auth_service import auth_service

PUBLIC_PATHS = [
    "/api/health",
    "/api/auth/signup",
    "/api/auth/login",
    "/docs",
    "/openapi.json",
]


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        if any(request.url.path.startswith(p) for p in PUBLIC_PATHS):
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Missing authorization header"})

        token = auth_header.split(" ", 1)[1]
        user_info = auth_service.validate_token(token)

        if not user_info or not user_info.get("id"):
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        request.state.user_id = user_info["id"]
        request.state.username = user_info.get("username", "")
        return await call_next(request)


def get_current_user_id(request: Request) -> str:
    uid = getattr(request.state, "user_id", None)
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return uid

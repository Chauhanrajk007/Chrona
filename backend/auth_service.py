import os
import hashlib
import secrets
import requests
from typing import Dict, Any, Optional

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# In-memory session store: token -> { user_id, username }
active_sessions: Dict[str, Dict[str, str]] = {}


class AuthService:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            print("WARNING: Missing SUPABASE_URL or SUPABASE_ANON_KEY")
        self.rest_url = f"{SUPABASE_URL}/rest/v1"
        self.headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    # ------------------------------------------------------------------
    # SIGNUP
    # ------------------------------------------------------------------
    def signup(self, username: str, password: str, display_name: str = "") -> Dict[str, Any]:
        # Check if username already exists
        check_url = f"{self.rest_url}/app_users?username=eq.{username}&select=id"
        res = requests.get(check_url, headers=self.headers)
        existing = res.json()
        if existing:
            raise Exception("Username already taken")

        # Insert new user
        user_payload = {
            "username": username,
            "password_hash": self._hash_password(password),
            "display_name": display_name or username,
        }
        insert_headers = {**self.headers, "Prefer": "return=representation"}
        res = requests.post(f"{self.rest_url}/app_users", headers=insert_headers, json=user_payload)

        if res.status_code not in [200, 201]:
            print(f"Signup insert error: {res.text}")
            raise Exception(f"Failed to create user: {res.text}")

        user = res.json()
        if isinstance(user, list):
            user = user[0]

        user_id = user["id"]

        # Initialize default profile rows
        self._initialize_user_data(user_id)

        return {
            "user_id": user_id,
            "username": username,
            "message": "signup successful",
        }

    # ------------------------------------------------------------------
    # LOGIN
    # ------------------------------------------------------------------
    def login(self, username: str, password: str) -> Dict[str, Any]:
        pw_hash = self._hash_password(password)
        url = f"{self.rest_url}/app_users?username=eq.{username}&password_hash=eq.{pw_hash}&select=id,username,display_name"
        res = requests.get(url, headers=self.headers)
        users = res.json()

        if not users:
            raise Exception("Invalid username or password")

        user = users[0]
        token = secrets.token_urlsafe(48)
        active_sessions[token] = {
            "user_id": user["id"],
            "username": user["username"],
        }

        return {
            "access_token": token,
            "user_id": user["id"],
            "username": user["username"],
        }

    # ------------------------------------------------------------------
    # VALIDATE TOKEN
    # ------------------------------------------------------------------
    def validate_token(self, token: str) -> Optional[Dict[str, str]]:
        session = active_sessions.get(token)
        if not session:
            return None
        return {"id": session["user_id"], "username": session["username"]}

    # ------------------------------------------------------------------
    # GET USER PROFILE
    # ------------------------------------------------------------------
    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        try:
            url = f"{self.rest_url}/behavior_profiles?user_id=eq.{user_id}"
            res = requests.get(url, headers=self.headers)
            data = res.json()

            if data:
                bp = data[0]
                return {
                    "archetype": bp.get("archetype", "student_balanced"),
                    "slot_weights": bp.get("slot_weights", {}),
                }
        except Exception as e:
            print(f"Profile fetch error: {e}")

        return {"archetype": "student_balanced", "slot_weights": {}}

    # ------------------------------------------------------------------
    # INIT USER DATA
    # ------------------------------------------------------------------
    def _initialize_user_data(self, user_id: str):
        try:
            self._insert_row("behavior_profiles", {
                "user_id": user_id,
                "archetype": "student_balanced",
            })
            self._insert_row("onboarding_responses", {
                "user_id": user_id,
                "productive_time": "morning",
                "work_type": "mixed",
                "task_preference": "balanced",
                "study_hours": 4,
            })
            self._insert_row("capacity_profiles", {
                "user_id": user_id,
                "weekly_capacity": 40,
                "deep_work_hours": 20,
                "efficiency_factor": 0.8,
                "stress_tolerance": 5,
            })
        except Exception as e:
            print(f"Init user data error (non-fatal): {e}")

    def _insert_row(self, table: str, payload: dict):
        headers = {**self.headers, "Prefer": "return=minimal"}
        res = requests.post(f"{self.rest_url}/{table}", headers=headers, json=payload)
        if res.status_code not in [200, 201, 204, 409]:
            print(f"Insert {table} failed: {res.text}")


auth_service = AuthService()

"""
Neuravex Backend API Server
Handles event extraction via Gemini and insertion into Supabase.
Run with: uvicorn server:app --port 8000 --reload
"""

import os
import json
import tempfile
import requests
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# ==============================
# CONFIGURATION
# ==============================

from dotenv import load_dotenv
load_dotenv()  # Load variables from .env file

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not GEMINI_API_KEY or not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("⚠️ WARNING: Missing necessary environment variables (.env)")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# ==============================
# FAST API APP
# ==============================

app = FastAPI(title="Chrona Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from middleware.auth_middleware import AuthMiddleware
from auth_router import router as auth_router

app.add_middleware(AuthMiddleware)
app.include_router(auth_router)

# ==============================
# GEMINI PROMPTS
# ==============================

EXTRACTION_PROMPT = """
You are an intelligent event extraction engine with priority analysis capabilities, built specifically to help students manage their workloads and schedules.

Analyze the input and extract event information, breaking it down into a mindmap structure, and providing actionable study steps.

Return JSON in this exact format:

{
  "title": "",
  "category": "",
  "venue": "",
  "event_datetime": "",
  "severity_level": "",
  "complexity_score": 0,
  "estimated_prep_hours": 0,
  "key_topics": [],
  "action_items": []
}

Rules:

category must be one of:
  exam
  hackathon
  assignment
  meeting
  personal
  reminder

severity_level must be one of:
  low - routine events with minimal consequences if missed
  medium - important events that require attention
  high - critical events with significant impact
  critical - urgent events with severe consequences (e.g., exams very soon), immediate attention needed

complexity_score is a number from 1-10:
  1-3: Simple tasks requiring minimal effort
  4-6: Moderate complexity requiring focused work
  7-10: Highly complex requiring extensive preparation

estimated_prep_hours: Estimate how many hours of preparation/study this event realistically needs for a student.

key_topics: Extract an array of strings representing specific sub-topics, chapters, or syllabus points to be studied. Limit to 3-5 items.

action_items: Extract an array of strings representing concrete actionable steps the student must take (e.g., ["Review Chapter 5 slides", "Complete practice test", "Prepare presentation"]). Limit to 3-5 items.

Convert relative times using today's date (%s):
  "today" → today's date
  "tomorrow" → tomorrow's date
  "next week" → 7 days from now
  "in 2 days" → 2 days from now

Convert datetime to ISO format: YYYY-MM-DDTHH:MM:SS

Return ONLY valid JSON.
If a field is missing, return null for that field.
Analyze context clues for severity:
  - Exams mentioned with "tomorrow", "final", "important" → high/critical
  - Assignments with close deadlines → high
  - Hackathons → high severity, high complexity
  - Routine meetings → low/medium
""" % datetime.now().strftime("%Y-%m-%d")


# ==============================
# DATABASE INSERT FUNCTION
# ==============================

def insert_into_supabase(event_data: dict) -> bool:
    """Insert an event into the Supabase events table.

    Only inserts columns that exist in the events table:
    title, category, venue, event_datetime, user_id, source_hash, key_topics, action_items

    NOTE: severity_level, complexity_score, estimated_prep_hours are Gemini analytics fields.
    They do NOT exist in the events table — they are returned to the frontend only.
    """
    url = f"{SUPABASE_URL}/rest/v1/events"

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    # Whitelist: only columns that actually exist in the events table
    EVENTS_COLUMNS = {"title", "category", "venue", "event_datetime", "user_id", "source_hash", "key_topics", "action_items"}

    clean_data = {
        key: value
        for key, value in event_data.items()
        if key in EVENTS_COLUMNS and value is not None
    }

    if not clean_data.get("title"):
        raise ValueError("Extracted event has no title")

    response = requests.post(url, headers=headers, json=clean_data)

    if response.status_code in [200, 201, 204]:
        print(f"✅ Event inserted: {clean_data.get('title')}")
        return True
    else:
        print(f"❌ Failed to insert: {response.text}")
        raise Exception(f"Supabase error: {response.text}")


# ==============================
# GEMINI EXTRACTION FUNCTIONS
# ==============================

def extract_data_from_file(file_path: str) -> dict:
    """Extract event data from a file (PDF/image) using Gemini."""
    print(f"\n📄 Processing file: {file_path}")

    uploaded_file = genai.upload_file(path=file_path)
    model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    response = model.generate_content(
        [EXTRACTION_PROMPT, uploaded_file],
        generation_config={"response_mime_type": "application/json"},
    )

    extracted = json.loads(response.text)
    print(f"📦 Extracted: {json.dumps(extracted, indent=2)}")
    return extracted


def extract_data_from_text(text: str) -> dict:
    """Extract event data from plain text using Gemini."""
    print(f"\n📝 Processing text: {text}")

    model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    prompt = f"{EXTRACTION_PROMPT}\n\nText to analyze:\n{text}"

    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"},
    )

    extracted = json.loads(response.text)
    print(f"📦 Extracted: {json.dumps(extracted, indent=2)}")
    return extracted


# ==============================
# API ENDPOINTS
# ==============================

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "chrona-backend"}


@app.post("/api/process-event")
async def process_event(
    request: Request,
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
):
    """
    Process an event from text or file upload.
    Accepts either:
      - JSON body with { "text": "..." }
      - FormData with file and optional text
    """
    try:
        extracted_data = None

        if file and file.filename:
            # Save uploaded file to a temp location
            suffix = os.path.splitext(file.filename)[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name

            try:
                extracted_data = extract_data_from_file(tmp_path)
            finally:
                os.unlink(tmp_path)  # Clean up temp file

        elif text and text.strip():
            extracted_data = extract_data_from_text(text.strip())
        else:
            raise HTTPException(status_code=400, detail="No text or file provided")

        # Inject user_id from middleware
        if hasattr(request.state, "user_id"):
            extracted_data["user_id"] = request.state.user_id

        # Insert into Supabase
        insert_into_supabase(extracted_data)

        return {
            "success": True,
            "message": "Event processed successfully",
            "event": extracted_data,
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Handle JSON body as well (text-only submissions)
from fastapi import Request

@app.post("/api/process-event-json")
async def process_event_json(request: Request):
    """Alternative endpoint for JSON body submissions."""
    body = await request.json()
    text = body.get("text", "")
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text provided")

    try:
        extracted_data = extract_data_from_text(text.strip())
        
        # Inject user_id from middleware
        if hasattr(request.state, "user_id"):
            extracted_data["user_id"] = request.state.user_id
            
        insert_into_supabase(extracted_data)
        return {
            "success": True,
            "message": "Event processed successfully",
            "event": extracted_data,
        }
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

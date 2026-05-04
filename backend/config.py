import os

from dotenv import load_dotenv

# Load variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── MongoDB ────────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "procurement_db")
SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000/")
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")

# ── AWS S3 ───────────────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "")
AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME", "")
AWS_S3_PUBLIC_BASE_URL = os.getenv("AWS_S3_PUBLIC_BASE_URL", "").strip()
# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_FILE_DB = os.path.join(BASE_DIR, "local_file_db")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not set. Add it to backend/.env")

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Load .env before anything else
load_dotenv(os.path.join(BASE_DIR, ".env"))

from db.mongo import get_client
from middlewares.cors import add_cors_middleware
from services.pdf_processing import load_yolo_model, LOCAL_FILE_DB

from routes.budget_mongo import router as budget_router
from routes.pdf import router as pdf_router
from routes.floorplan import router as floorplan_router
from routes.projects import router as mongo_projects_router
from routes.rooms import router as rooms_router
from routes.groups import router as groups_router
from routes.masks import router as masks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup processing
    load_yolo_model()

    # Verify MongoDB connection
    try:
        client = get_client()
        # Use a short timeout for the ping
        import asyncio
        await asyncio.wait_for(client.admin.command("ping"), timeout=2.0)
        print("[MongoDB] ✅ Connected to Atlas")
    except Exception as e:
        print(f"[MongoDB] ⚠️  Could not connect: {e}")

    yield

    # Shutdown Processing
    client = get_client()
    if client:
        client.close()
        print("[MongoDB] 🔌 Connection closed")


app = FastAPI(title="Procurement and Co. API", version="2.0.0", lifespan=lifespan)

# Middlewares
add_cors_middleware(app)

# Static Files
uploads_path = os.path.join(BASE_DIR, "uploads")
os.makedirs(uploads_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")
app.mount("/local_file_db", StaticFiles(directory=LOCAL_FILE_DB), name="local_file_db")

# Routers
app.include_router(budget_router)
app.include_router(pdf_router)
app.include_router(floorplan_router)
app.include_router(mongo_projects_router)
app.include_router(rooms_router)
app.include_router(groups_router)
app.include_router(masks_router)


@app.get("/health")
def health():
    from services.pdf_processing import get_yolo_status
    yolo_status = get_yolo_status()
    return {
        "status": "ok",
        "service": "Procurement and Co. API v2",
        "yolo_ready": yolo_status["model_loaded"],
        "yolo_error": yolo_status["error"],
    }

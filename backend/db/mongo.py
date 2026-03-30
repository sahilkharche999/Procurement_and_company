from motor.motor_asyncio import AsyncIOMotorClient

from config import MONGO_URI, MONGO_DB_NAME

# Single shared client (created once at startup)
_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URI)
    return _client


def get_db():
    return get_client()[MONGO_DB_NAME]


def get_projects_collection():
    return get_db()["projects"]


def get_budget_collection():
    return get_db()["budget_items"]


def get_project_sources_collection():
    return get_db()["project_sources"]


def get_pages_collection():
    return get_db()["pages"]


def get_diagrams_collection():
    return get_db()["diagrams"]


def get_rooms_collection():
    return get_db()["rooms"]


def get_pdf_documents_collection():
    return get_db()["pdf_documents"]


def get_processing_jobs_collection():
    return get_db()["processing_jobs"]


def get_groups_collection():
    return get_db()["groups"]


def get_masks_collection():
    return get_db()["masks"]


def get_items_collection():
    return get_db()["items"]

def get_vendors_collection():
    return get_db()["vendors"]

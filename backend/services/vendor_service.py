"""
services/vendor_service.py
Service layer for vendor management with MongoDB.
"""
from datetime import datetime
from bson import ObjectId
from db.mongo import get_vendors_collection
from schemas.vendor import VendorCreate, VendorUpdate


async def create_vendor(vendor_data: VendorCreate) -> dict:
    """Create a new vendor."""
    coll = get_vendors_collection()
    doc = vendor_data.model_dump()
    doc["created_at"] = datetime.utcnow().isoformat()
    doc["updated_at"] = datetime.utcnow().isoformat()
    res = await coll.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return doc


async def get_vendor(vendor_id: str) -> dict:
    """Get a single vendor by ID."""
    coll = get_vendors_collection()
    try:
        obj_id = ObjectId(vendor_id) if len(vendor_id) == 24 else vendor_id
    except Exception:
        obj_id = vendor_id
    
    doc = await coll.find_one({"_id": obj_id})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def get_all_vendors(search: str = "", limit: int = 1000, skip: int = 0) -> tuple:
    """Get all vendors with optional search."""
    coll = get_vendors_collection()
    query = {}
    
    if search:
        query["$or"] = [
            {"company_name": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}},
            {"contact_number": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    
    total = await coll.count_documents(query)
    docs = await coll.find(query).skip(skip).limit(limit).sort("company_name", 1).to_list(limit)
    
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    
    return docs, total


async def update_vendor(vendor_id: str, vendor_data: VendorUpdate) -> dict:
    """Update a vendor."""
    coll = get_vendors_collection()
    try:
        obj_id = ObjectId(vendor_id) if len(vendor_id) == 24 else vendor_id
    except Exception:
        obj_id = vendor_id
    
    updates = vendor_data.model_dump(exclude_none=True)
    updates["updated_at"] = datetime.utcnow().isoformat()
    
    result = await coll.find_one_and_update(
        {"_id": obj_id},
        {"$set": updates},
        return_document=True
    )
    
    if result:
        result["_id"] = str(result["_id"])
    
    return result


async def delete_vendor(vendor_id: str) -> bool:
    """Delete a vendor."""
    coll = get_vendors_collection()
    try:
        obj_id = ObjectId(vendor_id) if len(vendor_id) == 24 else vendor_id
    except Exception:
        obj_id = vendor_id
    
    result = await coll.delete_one({"_id": obj_id})
    return result.deleted_count > 0

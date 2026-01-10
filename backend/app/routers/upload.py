"""
PharmaInsight Pro - Upload Router
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
import uuid

from app.services import DataProcessor, data_store

router = APIRouter()


class ColumnMapping(BaseModel):
    date: Optional[str] = None
    product: Optional[str] = None
    quantity: Optional[str] = None
    price: Optional[str] = None
    total: Optional[str] = None
    invoice_id: Optional[str] = None


class ProcessRequest(BaseModel):
    session_id: str
    column_mapping: ColumnMapping


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a sales data file"""
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Read file content
    content = await file.read()
    
    # Create processor and load file
    processor = DataProcessor()
    success, message, columns = processor.load_file(content, file.filename)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Auto-detect columns
    detected = processor.detect_columns()
    
    # Store processor
    data_store[session_id] = processor
    
    return {
        "sessionId": session_id,
        "message": message,
        "columns": columns,
        "detected": detected,
        "rowCount": len(processor.raw_data),
    }


@router.post("/process")
async def process_data(request: ProcessRequest):
    """Process uploaded data with column mapping"""
    
    processor = data_store.get(request.session_id)
    
    if not processor:
        raise HTTPException(status_code=404, detail="Session not found. Please upload file again.")
    
    # Convert mapping to dict
    mapping = {k: v for k, v in request.column_mapping.dict().items() if v}
    
    # Validate required columns
    required = ['date', 'product', 'quantity']
    missing = [r for r in required if r not in mapping]
    
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {', '.join(missing)}")
    
    # Process data
    success, message = processor.process_data(mapping)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    # Get data summary
    data = processor.get_data()
    
    return {
        "success": True,
        "message": message,
        "summary": {
            "totalRows": len(data),
            "uniqueProducts": data['product'].nunique(),
            "dateRange": {
                "start": data['date'].min().strftime('%Y-%m-%d'),
                "end": data['date'].max().strftime('%Y-%m-%d'),
            },
            "monthsOfData": data['month_year'].nunique(),
        }
    }


@router.get("/session/{session_id}")
async def check_session(session_id: str):
    """Check if session exists and has processed data"""
    
    processor = data_store.get(session_id)
    
    if not processor:
        return {"exists": False, "hasData": False}
    
    has_data = processor.get_data() is not None
    
    return {
        "exists": True,
        "hasData": has_data,
    }

"""
PharmaInsight Pro - FastAPI Backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.routers import upload, analytics, forecasting, intelligence

app = FastAPI(
    title="PharmaInsight Pro API",
    description="Pharmacy Sales Intelligence Platform",
    version="1.0.0"
)

# CORS - Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(forecasting.router, prefix="/api", tags=["Forecasting"])
app.include_router(intelligence.router, prefix="/api/ai", tags=["AI Intelligence"])


@app.get("/")
async def root():
    return {"message": "PharmaInsight Pro API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

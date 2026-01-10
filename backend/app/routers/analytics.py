"""
PharmaInsight Pro - Analytics Router
Enhanced with date filtering support
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from app.services import AnalyticsService, data_store

router = APIRouter()


def get_analytics(session_id: str, start_date: str = None, end_date: str = None) -> AnalyticsService:
    """Get analytics service for session with optional date filtering"""
    processor = data_store.get(session_id)
    
    if not processor:
        raise HTTPException(status_code=404, detail="Session not found")
    
    data = processor.get_data()
    if data is None:
        raise HTTPException(status_code=400, detail="Data not processed yet")
    
    return AnalyticsService(data, start_date, end_date)


@router.get("/date-range/{session_id}")
async def get_date_range(session_id: str):
    """Get available date range for the data"""
    processor = data_store.get(session_id)
    
    if not processor:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return processor.get_date_range()


@router.get("/kpis/{session_id}")
async def get_kpis(
    session_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get key performance indicators"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.get_kpis()


@router.get("/revenue-trend/{session_id}")
async def get_revenue_trend(
    session_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get monthly revenue trend"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.get_revenue_trend()


@router.get("/top-products/{session_id}")
async def get_top_products(
    session_id: str,
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get top products by revenue"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.get_top_products(limit)


@router.get("/categories/{session_id}")
async def get_categories(
    session_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get category performance"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.get_category_performance()


@router.get("/abc-analysis/{session_id}")
async def get_abc_analysis(
    session_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get ABC analysis"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.get_abc_analysis()


@router.get("/day-of-week/{session_id}")
async def get_day_of_week(
    session_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get day of week analysis"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.get_day_of_week_analysis()


@router.get("/product/{session_id}/{product_name}")
async def get_product_details(
    session_id: str,
    product_name: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get detailed analysis for a specific product"""
    analytics = get_analytics(session_id, start_date, end_date)
    result = analytics.get_product_details(product_name)
    
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return result


@router.get("/search-products/{session_id}")
async def search_products(
    session_id: str,
    q: str = Query(..., min_length=1)
):
    """Search products by name - returns products with revenue"""
    analytics = get_analytics(session_id)
    return analytics.search_products(q)


@router.post("/compare-products/{session_id}")
async def compare_products(
    session_id: str,
    products: List[str],
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Compare multiple products"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.compare_products(products)


@router.get("/inventory-alerts/{session_id}")
async def get_inventory_alerts(
    session_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get inventory alerts"""
    analytics = get_analytics(session_id, start_date, end_date)
    return analytics.get_inventory_alerts()


@router.get("/reorder-suggestions/{session_id}")
async def get_reorder_suggestions(
    session_id: str,
    months: int = Query(1, ge=1, le=3)
):
    """Get reorder quantity suggestions"""
    analytics = get_analytics(session_id)
    return analytics.get_reorder_suggestions(months)


@router.get("/seasonality/{session_id}")
async def get_seasonality(session_id: str):
    """Get seasonality analysis"""
    analytics = get_analytics(session_id)
    return analytics.get_seasonality_analysis()


@router.get("/preliminary-analysis/{session_id}")
async def get_preliminary_analysis(session_id: str):
    """Get preliminary analysis for AI module"""
    analytics = get_analytics(session_id)
    return analytics.generate_preliminary_analysis()

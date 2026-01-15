"""
PharmaInsight Pro - AI Intelligence Router
Natural language Q&A about pharmacy data using Claude API
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import httpx
import json
import os

from app.services import AnalyticsService, data_store

router = APIRouter()

# Claude API configuration
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"


class AIQuestion(BaseModel):
    question: str
    session_id: str
    api_key: Optional[str] = None


class AIResponse(BaseModel):
    answer: str
    context_used: list
    suggestions: list


def get_data_context(session_id: str, include_full_lists: bool = False) -> dict:
    """Get data context for AI"""
    processor = data_store.get(session_id)

    if not processor:
        raise HTTPException(status_code=404, detail="Session not found")

    data = processor.get_data()
    if data is None:
        raise HTTPException(status_code=400, detail="Data not processed yet")

    analytics = AnalyticsService(data)

    # Gather comprehensive context
    context = {
        'kpis': analytics.get_kpis(),
        'categories': analytics.get_category_performance(),
        'abc': analytics.get_abc_analysis(),
        'revenuetrend': analytics.get_revenue_trend(),
        'topProducts': analytics.get_top_products(20),
        'inventory': analytics.get_inventory_alerts(),
        'seasonality': analytics.get_seasonality_analysis(),
        'preliminary': analytics.generate_preliminary_analysis(),
    }

    # Only include full lists when specifically requested
    if include_full_lists:
        context['allDeadStock'] = analytics.get_all_dead_stock()
        context['allFastMovers'] = analytics.get_all_fast_movers()
    else:
        # Include just top 50 for context
        context['deadStockSample'] = analytics.get_all_dead_stock(limit=50)
        context['fastMoversSample'] = analytics.get_all_fast_movers(limit=50)

    return context


def should_include_full_lists(question: str) -> bool:
    """Check if the question requires full lists"""
    question_lower = question.lower()
    full_list_keywords = [
        'list all', 'show all', 'all dead stock', 'all fast movers',
        'complete list', 'full list', 'every dead', 'every fast',
        'all products with no sales', 'all slow moving', 'all items',
        'give me all', 'show me all', 'list every', 'all the dead',
        'entire list', 'whole list', 'export', 'download'
    ]
    return any(keyword in question_lower for keyword in full_list_keywords)


@router.post("/ask")
async def ask_ai(request: AIQuestion):
    """Ask AI a question about the pharmacy data"""

    api_key = request.api_key or os.environ.get("ANTHROPIC_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="API key required. Please provide api_key in request or set ANTHROPIC_API_KEY environment variable."
        )

    # Check if user wants full lists
    include_full_lists = should_include_full_lists(request.question)

    # Get data context
    try:
        context = get_data_context(request.session_id, include_full_lists=include_full_lists)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Build prompt for Claude
    system_prompt = """You are PharmaInsight AI, an expert pharmacy business analyst assistant.
You have access to comprehensive sales data from a retail pharmacy and your job is to:

1. Answer questions about the pharmacy's performance clearly and actionably
2. Identify problems and issues in the data
3. Provide specific, actionable recommendations
4. Use the actual numbers from the data to support your analysis
5. Think like a 30-year veteran pharmacy owner who knows the business inside out

Key pharmacy concepts you understand:
- ABC Analysis: Class A products (80% of revenue), Class B (15%), Class C (5%)
- Markup strategies: Acute items (45%), Chronic (30%), Convenience (40%), Recurring (35%)
- Fast movers vs dead stock
- Seasonality in pharmacy sales
- The importance of never letting high-demand items go out of stock

When presenting lists of products, format them clearly in a table or numbered list.
Always be specific with numbers and percentages. Give actionable advice, not generic recommendations.
Format your response with clear sections when appropriate."""

    # Format context based on whether full lists are included
    if include_full_lists:
        dead_stock_text = f"""
**FULL Dead Stock List ({len(context.get('allDeadStock', []))} items - products with no sales in 60+ days):**
{json.dumps(context.get('allDeadStock', []), indent=2)}

**FULL Fast Movers List ({len(context.get('allFastMovers', []))} items - top 10% by sales velocity):**
{json.dumps(context.get('allFastMovers', []), indent=2)}
"""
    else:
        dead_stock_text = f"""
**Dead Stock Sample (top 50 of {context['inventory']['deadStockCount']} total items with no sales in 60+ days):**
{json.dumps(context.get('deadStockSample', []), indent=2)}

**Fast Movers Sample (top 50 of {context['inventory']['fastMoversCount']} total fast-moving items):**
{json.dumps(context.get('fastMoversSample', []), indent=2)}

NOTE: If user asks for the COMPLETE list, tell them to ask "list all dead stock" or "show all fast movers" to see the full data.
"""

    context_text = f"""
## Current Data Summary

**Key Performance Indicators:**
- Total Revenue: GHS {context['kpis']['totalRevenue']:,.2f}
- Total Transactions: {context['kpis']['totalTransactions']:,}
- Average Transaction: GHS {context['kpis']['avgTransactionValue']:,.2f}
- Unique Products: {context['kpis']['uniqueProducts']:,}
- Month-over-Month Growth: {context['kpis']['momGrowth']:.1f}%

**Category Performance:**
{json.dumps(context['categories'], indent=2)}

**ABC Analysis:**
- Class A Products: {context['abc']['summary'][0]['count'] if context['abc']['summary'] else 0}
- Class B Products: {context['abc']['summary'][1]['count'] if len(context['abc']['summary']) > 1 else 0}
- Class C Products: {context['abc']['summary'][2]['count'] if len(context['abc']['summary']) > 2 else 0}

**Top 20 Products by Revenue:**
{json.dumps(context['topProducts'], indent=2)}

**Monthly Revenue Trend:**
{json.dumps(context['revenuetrend'], indent=2)}

**Inventory Alerts Summary:**
- Fast Movers Count: {context['inventory']['fastMoversCount']}
- Dead Stock Count (60+ days no sales): {context['inventory']['deadStockCount']}

{dead_stock_text}

**Seasonality:**
{json.dumps(context['seasonality'], indent=2)}

**Preliminary Analysis:**
Issues Identified: {context['preliminary'].get('issues', [])}
Recommendations: {context['preliminary'].get('recommendations', [])}
"""

    # Call Claude API
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01"
    }

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4000,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": f"""Here is the pharmacy's current data:

{context_text}

Based on this data, please answer the following question:

{request.question}

Provide specific, actionable insights based on the actual numbers."""
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(CLAUDE_API_URL, headers=headers, json=payload)

            if response.status_code != 200:
                error_detail = response.json().get('error', {}).get('message', 'Unknown error')
                raise HTTPException(status_code=response.status_code, detail=f"Claude API error: {error_detail}")

            result = response.json()
            answer = result['content'][0]['text']

            return {
                "answer": answer,
                "context_used": ["kpis", "categories", "abc", "revenue_trend", "top_products", "inventory", "seasonality"],
                "suggestions": [
                    "What are my top selling products?",
                    "Which products should I reorder?",
                    "List all dead stock",
                    "How can I improve my margins?",
                    "What's my sales trend looking like?",
                ]
            }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timed out. Please try again.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Failed to connect to AI service: {str(e)}")


@router.get("/diagnose/{session_id}")
async def diagnose_data(session_id: str, api_key: Optional[str] = Query(None)):
    """Run automatic diagnosis on the data"""

    api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")

    if not api_key:
        # Return basic diagnosis without AI
        analytics = get_analytics_for_diagnosis(session_id)
        return analytics.generate_preliminary_analysis()

    # With API key, run full AI diagnosis
    request = AIQuestion(
        question="""Please provide a comprehensive diagnosis of this pharmacy's performance:

1. **Overall Health Assessment**: Rate the business health (Good/Fair/Poor) with reasons
2. **Top 3 Issues**: What are the most critical problems I should address immediately?
3. **Quick Wins**: What are 3 things I can do THIS WEEK to improve performance?
4. **Revenue Opportunities**: Where am I leaving money on the table?
5. **Risk Areas**: What should I watch out for in the coming months?

Be specific with numbers and give me actionable steps, not generic advice.""",
        session_id=session_id,
        api_key=api_key
    )

    return await ask_ai(request)


def get_analytics_for_diagnosis(session_id: str) -> AnalyticsService:
    """Get analytics service for diagnosis"""
    processor = data_store.get(session_id)

    if not processor:
        raise HTTPException(status_code=404, detail="Session not found")

    data = processor.get_data()
    if data is None:
        raise HTTPException(status_code=400, detail="Data not processed yet")

    return AnalyticsService(data)


@router.get("/suggested-questions")
async def get_suggested_questions():
    """Get suggested questions users can ask"""
    return {
        "categories": [
            {
                "name": "Performance",
                "questions": [
                    "How is my pharmacy performing overall?",
                    "What was my best month and why?",
                    "Am I growing or declining?",
                ]
            },
            {
                "name": "Products",
                "questions": [
                    "What are my top 10 products?",
                    "Which products should I stop stocking?",
                    "What products should I promote?",
                ]
            },
            {
                "name": "Inventory",
                "questions": [
                    "What should I reorder this week?",
                    "List all dead stock",
                    "Show all fast movers",
                ]
            },
            {
                "name": "Strategy",
                "questions": [
                    "How can I increase my margins?",
                    "What pricing changes should I make?",
                    "How do I reduce dead stock?",
                ]
            },
            {
                "name": "Diagnosis",
                "questions": [
                    "What problems do you see in my data?",
                    "What am I doing wrong?",
                    "Where am I leaving money on the table?",
                ]
            }
        ]
    }
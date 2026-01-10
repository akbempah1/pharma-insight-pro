# 💊 PharmaInsight Pro

A premium pharmacy sales intelligence platform built with React + FastAPI.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Tremor** for dashboard components
- **Recharts** for visualizations
- **Vite** for fast development

### Backend
- **FastAPI** (Python)
- **Pandas** for data processing
- **Statsmodels** for forecasting

## Quick Start

### 1. Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### 2. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at `http://localhost:5173`

## Features

### 📊 Dashboard
- KPI cards with gradient design
- Revenue trend visualization
- Top products chart
- Category distribution
- ABC analysis
- Day of week analysis

### 🔍 Product Explorer
- Search products
- Individual product analysis
- Monthly trend per product
- Price sensitivity analysis
- Markup recommendations

### 📈 Forecasting
- Total revenue forecast
- Product-specific forecasts
- Exponential smoothing
- Seasonal decomposition
- Confidence intervals

### 📦 Inventory Alerts
- Fast movers identification
- Dead stock detection
- Action recommendations

## Project Structure

```
pharma-insight-pro/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── requirements.txt
│   └── app/
│       ├── routers/         # API endpoints
│       └── services/        # Business logic
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── api/             # API client
        ├── components/      # React components
        ├── pages/           # Page components
        └── utils/           # Utilities
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload sales file |
| `/api/process` | POST | Process with column mapping |
| `/api/kpis/{session_id}` | GET | Get KPIs |
| `/api/revenue-trend/{session_id}` | GET | Get monthly trend |
| `/api/top-products/{session_id}` | GET | Get top products |
| `/api/categories/{session_id}` | GET | Get category performance |
| `/api/abc-analysis/{session_id}` | GET | Get ABC analysis |
| `/api/forecast/{session_id}` | GET | Get forecast |
| `/api/inventory-alerts/{session_id}` | GET | Get alerts |

## Design Principles

1. **Premium UI** - Gradient cards, smooth animations, clean typography
2. **Responsive** - Works on all screen sizes
3. **Fast** - Optimized rendering, efficient data loading
4. **Intuitive** - Clear navigation, helpful tooltips

## Built By

**Damien** - Operations & Finance Manager | PharmD, MSc Finance, MSc Computer Science

---

*PharmaInsight Pro - Transform pharmacy data into actionable intelligence*

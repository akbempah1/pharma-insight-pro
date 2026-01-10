"""
PharmaInsight Pro - Forecasting Router (UPDATED)

Fixes:
- Removes dependency on '_rows' column (caused 500 error)
- Backward-compatible: accepts legacy query param `type=total_revenue`
- Supports:
  - method: auto | moving_average | exponential | seasonal
  - forecast_type: revenue | units | transactions
  - /forecast-accuracy/{session_id} endpoint (holdout test)
"""

from fastapi import APIRouter, HTTPException, Query
import pandas as pd
import numpy as np
from typing import Optional, Dict, Any, List

from app.services import data_store

router = APIRouter()


# -----------------------------
# Helpers
# -----------------------------
def get_data(session_id: str) -> pd.DataFrame:
    """Get processed data for session"""
    processor = data_store.get(session_id)
    if not processor:
        raise HTTPException(status_code=404, detail="Session not found")

    data = processor.get_data()
    if data is None:
        raise HTTPException(status_code=400, detail="Data not processed yet")

    return data


def _safe_col(df: pd.DataFrame, name: str) -> bool:
    return name in df.columns


def _normalize_forecast_type(forecast_type: str) -> str:
    """
    Backward compatibility:
    - frontend currently calls: type=total_revenue
    - normalize that to: revenue
    """
    ft = (forecast_type or "").strip().lower()
    if ft in ("total_revenue", "revenue", "sales", "amount"):
        return "revenue"
    if ft in ("units", "quantity", "qty"):
        return "units"
    if ft in ("transactions", "txns", "transaction", "orders"):
        return "transactions"
    return "revenue"


def prepare_time_series(
    data: pd.DataFrame,
    product: Optional[str] = None,
    forecast_type: str = "revenue",
) -> pd.DataFrame:
    """
    Prepare monthly time series.

    Output columns:
      - period: YYYY-MM (string)
      - ds: datetime
      - value: numeric series to forecast (based on forecast_type)
      - revenue, units, transactions
    """
    df = data.copy()

    if product:
        df = df[df["product"] == product]

    if df.empty:
        return pd.DataFrame()

    if not _safe_col(df, "month_year"):
        raise HTTPException(status_code=400, detail="Missing required column: month_year")
    if not _safe_col(df, "product"):
        raise HTTPException(status_code=400, detail="Missing required column: product")

    has_total = _safe_col(df, "total")
    has_qty = _safe_col(df, "quantity")

    # Try transaction id columns; otherwise transactions = row count per month
    txn_col_candidates = ["transaction_id", "invoice", "invoice_no", "receipt", "receipt_no", "bill_no"]
    txn_col = next((c for c in txn_col_candidates if _safe_col(df, c)), None)

    agg: Dict[str, Any] = {}
    if has_total:
        agg["total"] = "sum"
    if has_qty:
        agg["quantity"] = "sum"

    # If we have a transaction id column, count unique transactions per month
    if txn_col:
        agg[txn_col] = pd.Series.nunique

    monthly = df.groupby("month_year", as_index=False).agg(agg)

    # transactions:
    # - if txn_col exists: use nunique result
    # - else: use group size (row count) safely (NO _rows column needed)
    if txn_col and txn_col in monthly.columns:
        monthly["transactions"] = monthly[txn_col].astype(float)
    else:
        monthly["transactions"] = df.groupby("month_year").size().reset_index(name="transactions")["transactions"].astype(float)

    # Standardize
    monthly.rename(columns={"month_year": "period"}, inplace=True)

    monthly["ds"] = pd.to_datetime(monthly["period"].astype(str) + "-01", errors="coerce")
    monthly = monthly.dropna(subset=["ds"]).sort_values("ds")

    monthly["revenue"] = monthly["total"].astype(float) if has_total and "total" in monthly.columns else 0.0
    monthly["units"] = monthly["quantity"].astype(float) if has_qty and "quantity" in monthly.columns else 0.0

    ft = _normalize_forecast_type(forecast_type)
    if ft == "units":
        monthly["value"] = monthly["units"]
    elif ft == "transactions":
        monthly["value"] = monthly["transactions"]
    else:
        monthly["value"] = monthly["revenue"]

    monthly["value"] = pd.to_numeric(monthly["value"], errors="coerce").fillna(0.0)

    return monthly[["period", "ds", "value", "revenue", "units", "transactions"]]


def _trend_label(x: float) -> str:
    if x > 0:
        return "up"
    if x < 0:
        return "down"
    return "flat"


def _make_result(
    ts: pd.DataFrame,
    forecasts: List[Dict[str, Any]],
    method_name: str,
    forecast_type: str,
    trend_value: float,
) -> Dict[str, Any]:
    return {
        "metric": _normalize_forecast_type(forecast_type),
        "historical": [
            {"period": r["period"], "value": float(r["value"])}
            for r in ts[["period", "value"]].to_dict("records")
        ],
        "forecast": forecasts,
        "method": method_name,
        "lastActual": float(ts["value"].iloc[-1]),
        "forecastAvg": float(np.mean([f["forecast"] for f in forecasts])) if forecasts else 0.0,
        "trend": _trend_label(trend_value),
    }


# -----------------------------
# Forecast Methods
# -----------------------------
def forecast_moving_average(ts: pd.DataFrame, periods: int = 3, window: int = 3):
    """Simple moving average forecast."""
    if len(ts) < max(3, window):
        return None

    series = ts["value"].astype(float)
    last_date = ts["ds"].iloc[-1]

    ma = series.rolling(window=window).mean()
    last_ma = float(ma.iloc[-1])

    trend = 0.0
    ma_clean = ma.dropna()
    if len(ma_clean) >= 2:
        trend = float(ma_clean.iloc[-1] - ma_clean.iloc[-2])

    forecasts = []
    for i in range(periods):
        forecast_date = last_date + pd.DateOffset(months=i + 1)
        forecast_value = max(0.0, last_ma + trend * (i + 1))
        forecasts.append(
            {
                "period": forecast_date.strftime("%Y-%m"),
                "forecast": forecast_value,
                "lower": max(0.0, forecast_value * 0.85),
                "upper": forecast_value * 1.15,
            }
        )

    return forecasts, trend


def forecast_exponential_smoothing(ts: pd.DataFrame, periods: int = 3, alpha: float = 0.3):
    """Exponential smoothing forecast."""
    if len(ts) < 3:
        return None

    series = ts["value"].astype(float)
    ema = series.ewm(alpha=alpha, adjust=False).mean()

    last_ema = float(ema.iloc[-1])
    last_date = ts["ds"].iloc[-1]

    trend = 0.0
    if len(ema) >= 2:
        trend = float(ema.iloc[-1] - ema.iloc[-2])

    forecasts = []
    for i in range(periods):
        forecast_date = last_date + pd.DateOffset(months=i + 1)
        forecast_value = max(0.0, last_ema + trend * (i + 1))
        forecasts.append(
            {
                "period": forecast_date.strftime("%Y-%m"),
                "forecast": forecast_value,
                "lower": max(0.0, forecast_value * 0.85),
                "upper": forecast_value * 1.15,
            }
        )

    return forecasts, trend


def forecast_seasonal(ts: pd.DataFrame, periods: int = 3):
    """Seasonal decomposition style forecast (needs enough months)."""
    if len(ts) < 6:
        return None

    tmp = ts.copy()
    tmp["month"] = tmp["ds"].dt.month

    monthly_avg = tmp.groupby("month")["value"].mean()
    overall_avg = float(tmp["value"].mean())
    if overall_avg == 0:
        overall_avg = 1.0

    seasonal_indices = (monthly_avg / overall_avg).replace([np.inf, -np.inf], 1.0).fillna(1.0).to_dict()

    tmp["seasonal_index"] = tmp["month"].map(seasonal_indices).fillna(1.0)
    tmp["deseasonalized"] = tmp["value"] / tmp["seasonal_index"].replace(0, 1.0)

    tmp["t"] = range(len(tmp))
    X = tmp["t"].values.astype(float)
    y = tmp["deseasonalized"].values.astype(float)

    x_mean = float(np.mean(X))
    y_mean = float(np.mean(y))

    denom = float(np.sum((X - x_mean) ** 2))
    slope = float(np.sum((X - x_mean) * (y - y_mean)) / denom) if denom != 0 else 0.0
    intercept = float(y_mean - slope * x_mean)

    last_date = tmp["ds"].iloc[-1]
    last_t = int(tmp["t"].iloc[-1])

    forecasts = []
    for i in range(periods):
        forecast_date = last_date + pd.DateOffset(months=i + 1)
        t = last_t + i + 1
        month = int(forecast_date.month)

        trend_value = intercept + slope * t
        seasonal_value = float(seasonal_indices.get(month, 1.0))
        forecast_value = max(0.0, trend_value * seasonal_value)

        forecasts.append(
            {
                "period": forecast_date.strftime("%Y-%m"),
                "forecast": forecast_value,
                "lower": max(0.0, forecast_value * 0.8),
                "upper": forecast_value * 1.2,
            }
        )

    return forecasts, slope, {str(k): round(float(v), 2) for k, v in seasonal_indices.items()}


# -----------------------------
# Routes
# -----------------------------
@router.get("/forecast/{session_id}")
async def get_forecast(
    session_id: str,
    product: Optional[str] = None,
    periods: int = Query(3, ge=1, le=6),
    method: str = Query(
        "auto",
        pattern="^(auto|moving_average|exponential|seasonal)$",
        description="auto | moving_average | exponential | seasonal",
    ),
    # ✅ New param
    forecast_type: str = Query(
        "revenue",
        pattern="^(revenue|units|transactions|total_revenue)$",
        description="revenue | units | transactions (legacy: total_revenue)",
    ),
    # ✅ Legacy param currently used by your frontend: type=total_revenue
    type: Optional[str] = Query(
        None,
        description="Legacy alias for forecast_type (e.g. total_revenue)",
    ),
):
    """
    Generate forecast.

    Backward compatible:
    - Old callers: /forecast/{session_id}?periods=3&product=...
    - Legacy param: type=total_revenue
    - Default forecast_type=revenue and method=auto
    """
    # if legacy "type" is provided, it wins
    if type:
        forecast_type = type

    data = get_data(session_id)
    ts = prepare_time_series(data, product, forecast_type)

    if ts.empty or len(ts) < 3:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data. Need at least 3 months, have {len(ts)}.",
        )

    ft = _normalize_forecast_type(forecast_type)

    if method == "auto":
        method = "seasonal" if len(ts) >= 6 else "exponential"

    if method == "moving_average":
        out = forecast_moving_average(ts, periods=periods, window=3)
        if not out:
            raise HTTPException(status_code=400, detail="Unable to generate moving average forecast")
        forecasts, trend = out
        return _make_result(ts, forecasts, "Moving Average", ft, trend)

    if method == "seasonal":
        out = forecast_seasonal(ts, periods=periods)
        if not out:
            out2 = forecast_exponential_smoothing(ts, periods=periods)
            if not out2:
                raise HTTPException(status_code=400, detail="Unable to generate forecast")
            forecasts, trend = out2
            return _make_result(ts, forecasts, "Exponential Smoothing", ft, trend)

        forecasts, slope, seasonal_indices = out
        res = _make_result(ts, forecasts, "Seasonal Decomposition", ft, slope)
        res["seasonalIndices"] = seasonal_indices
        return res

    out = forecast_exponential_smoothing(ts, periods=periods)
    if not out:
        raise HTTPException(status_code=400, detail="Unable to generate forecast")
    forecasts, trend = out
    return _make_result(ts, forecasts, "Exponential Smoothing", ft, trend)


@router.get("/forecast-products/{session_id}")
async def get_products_with_forecasts(
    session_id: str,
    limit: int = Query(10, ge=1, le=50),
    forecast_type: str = Query("revenue", pattern="^(revenue|units|transactions|total_revenue)$"),
    method: str = Query("auto", pattern="^(auto|moving_average|exponential|seasonal)$"),
):
    """Get top products with their next-month forecast (based on selected metric)."""
    data = get_data(session_id)

    # Top products by revenue (stable ranking)
    products = data.groupby("product")["total"].sum().nlargest(limit).index.tolist()

    ft = _normalize_forecast_type(forecast_type)

    results = []
    for product in products:
        ts = prepare_time_series(data, product, ft)
        if len(ts) < 3:
            continue

        picked = method
        if picked == "auto":
            picked = "seasonal" if len(ts) >= 6 else "exponential"

        try:
            if picked == "moving_average":
                out = forecast_moving_average(ts, periods=1, window=3)
                if not out:
                    continue
                forecasts, trend = out
                next_fc = forecasts[0]["forecast"]
                method_name = "Moving Average"

            elif picked == "seasonal":
                out = forecast_seasonal(ts, periods=1)
                if out:
                    forecasts, slope, _ = out
                    next_fc = forecasts[0]["forecast"]
                    trend = slope
                    method_name = "Seasonal Decomposition"
                else:
                    out2 = forecast_exponential_smoothing(ts, periods=1)
                    if not out2:
                        continue
                    forecasts, trend = out2
                    next_fc = forecasts[0]["forecast"]
                    method_name = "Exponential Smoothing"

            else:
                out = forecast_exponential_smoothing(ts, periods=1)
                if not out:
                    continue
                forecasts, trend = out
                next_fc = forecasts[0]["forecast"]
                method_name = "Exponential Smoothing"

            results.append(
                {
                    "product": product,
                    "metric": ft,
                    "lastMonthValue": float(ts["value"].iloc[-1]),
                    "nextMonthForecast": float(next_fc),
                    "trend": _trend_label(float(trend)),
                    "method": method_name,
                }
            )
        except Exception:
            continue

    return results


@router.get("/forecast-accuracy/{session_id}")
async def forecast_accuracy_test(
    session_id: str,
    product: Optional[str] = None,
    holdout: int = Query(1, ge=1, le=3),
    method: str = Query("auto", pattern="^(auto|moving_average|exponential|seasonal)$"),
    forecast_type: str = Query("revenue", pattern="^(revenue|units|transactions|total_revenue)$"),
    type: Optional[str] = Query(None, description="Legacy alias for forecast_type"),
):
    """
    Forecast accuracy testing:
    - Hold out the last `holdout` months
    - Train on the earlier months
    - Forecast `holdout` months
    - Compare predicted vs actual
    """
    if type:
        forecast_type = type

    ft = _normalize_forecast_type(forecast_type)

    data = get_data(session_id)
    ts_all = prepare_time_series(data, product, ft)

    if ts_all.empty or len(ts_all) < (3 + holdout):
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient data for accuracy test. Need at least {3 + holdout} months, have {len(ts_all)}.",
        )

    ts_train = ts_all.iloc[:-holdout].copy()
    ts_test = ts_all.iloc[-holdout:].copy()

    picked = method
    if picked == "auto":
        picked = "seasonal" if len(ts_train) >= 6 else "exponential"

    if picked == "moving_average":
        out = forecast_moving_average(ts_train, periods=holdout, window=3)
        if not out:
            raise HTTPException(status_code=400, detail="Unable to run moving average accuracy test")
        forecasts, _ = out
        method_name = "Moving Average"

    elif picked == "seasonal":
        out = forecast_seasonal(ts_train, periods=holdout)
        if out:
            forecasts, _, _ = out
            method_name = "Seasonal Decomposition"
        else:
            out2 = forecast_exponential_smoothing(ts_train, periods=holdout)
            if not out2:
                raise HTTPException(status_code=400, detail="Unable to run accuracy test")
            forecasts, _ = out2
            method_name = "Exponential Smoothing"

    else:
        out = forecast_exponential_smoothing(ts_train, periods=holdout)
        if not out:
            raise HTTPException(status_code=400, detail="Unable to run exponential accuracy test")
        forecasts, _ = out
        method_name = "Exponential Smoothing"

    pred_map = {f["period"]: float(f["forecast"]) for f in forecasts}
    actual = []
    predicted = []

    for _, row in ts_test.iterrows():
        p = str(row["period"])
        a_val = float(row["value"])
        yhat = float(pred_map.get(p, 0.0))
        actual.append(a_val)
        predicted.append(yhat)

    actual_arr = np.array(actual, dtype=float)
    pred_arr = np.array(predicted, dtype=float)

    mae = float(np.mean(np.abs(actual_arr - pred_arr)))
    rmse = float(np.sqrt(np.mean((actual_arr - pred_arr) ** 2)))
    denom = np.where(actual_arr == 0, 1.0, actual_arr)
    mape = float(np.mean(np.abs((actual_arr - pred_arr) / denom)) * 100.0)

    details = []
    for i in range(len(ts_test)):
        details.append(
            {
                "period": str(ts_test.iloc[i]["period"]),
                "actual": float(actual_arr[i]),
                "predicted": float(pred_arr[i]),
                "error": float(actual_arr[i] - pred_arr[i]),
                "absError": float(abs(actual_arr[i] - pred_arr[i])),
            }
        )

    return {
        "metric": ft,
        "product": product,
        "method": method_name,
        "holdout": holdout,
        "metrics": {"MAE": mae, "RMSE": rmse, "MAPE": mape},
        "details": details,
    }

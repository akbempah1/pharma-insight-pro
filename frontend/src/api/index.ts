import axios from 'axios';

// @ts-ignore
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =====================
// Types (existing)
// =====================
export interface UploadResponse {
  sessionId: string;
  message: string;
  columns: string[];
  detected: Record<string, string | null>;
  rowCount: number;
}

export interface ProcessResponse {
  success: boolean;
  message: string;
  summary: {
    totalRows: number;
    uniqueProducts: number;
    dateRange: { start: string; end: string };
    monthsOfData: number;
  };
}

export interface DateRange {
  min: string;
  max: string;
  months: string[];
}

export interface KPIs {
  totalRevenue: number;
  totalTransactions: number;
  totalUnits: number;
  uniqueProducts: number;
  avgTransactionValue: number;
  avgUnitsPerTransaction: number;
  momGrowth: number;
}

export interface RevenueTrend {
  period: string;
  revenue: number;
  units: number;
  transactions: number;
  growth: number;
}

export interface TopProduct {
  name: string;
  revenue: number;
  units: number;
  transactions: number;
  avgQtyPerTxn: number;
}

export interface CategoryPerformance {
  category: string;
  revenue: number;
  units: number;
  products: number;
  percentage: number;
  label: string;
  suggestedMarkup: number;
}

export interface ABCAnalysis {
  summary: Array<{
    class: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  details: Array<{
    product: string;
    revenue: number;
    units: number;
    cumulative_pct: number;
    class: string;
  }>;
}

export interface DayOfWeek {
  day: string;
  revenue: number;
  units: number;
}

export interface ProductDetails {
  name: string;
  totalRevenue: number;
  totalUnits: number;
  totalTransactions: number;
  avgQtyPerTransaction: number;
  category: string;
  categoryLabel: string;
  suggestedMarkup: number;
  monthlyTrend: Array<{
    period: string;
    revenue: number;
    units: number;
    transactions: number;
  }>;
}

export interface ProductSearchResult {
  name: string;
  revenue: number;
}

/**
 * UPDATED: Product comparison (to support charting TWO trends)
 */
export interface ProductComparison {
  product1: string;
  product2: string;
  series: Array<{
    period: string;
    product1: number; // e.g. revenue for product1
    product2: number; // e.g. revenue for product2
  }>;
}

/**
 * UPDATED: Reorder suggestion — matches your screenshot columns
 */
export interface ReorderSuggestion {
  product: string;
  avgMonthlyUnits: number;
  forecastRevenue: number;
  suggestedReorder: number; // units
}

/**
 * NEW: Product options for dropdowns (Compare Products UI)
 */
export interface ProductOption {
  name: string;
}

// Forecasting
export type ForecastMethod =
  | 'auto'
  | 'moving_average'
  | 'exponential_smoothing'
  | 'seasonal';

export type ForecastType =
  | 'total_revenue'
  | 'units'
  | 'transactions'
  | 'product';

/**
 * UPDATED: Forecast response supports charting + confidence intervals
 * (keeps backward compatibility with your current UI if needed)
 */
export interface Forecast {
  historical: Array<{
    period: string;
    revenue: number;
  }>;
  forecast: Array<{
    period: string;
    forecast: number;
    lower: number;
    upper: number;
  }>;
  method: string;
  lastActual: number;
  forecastAvg: number;
  trend: 'up' | 'down' | 'flat';
}

/**
 * NEW: Forecast accuracy response
 */
export interface ForecastAccuracy {
  method: ForecastMethod | string;
  metric: string; // e.g. MAPE, MAE, RMSE
  value: number;
  notes?: string;
}

export interface InventoryAlerts {
  fastMovers: Array<{
    product: string;
    monthly_revenue: number;
    monthly_units: number;
  }>;
  deadStock: Array<{
    product: string;
    days_since_last_sale: number;
    revenue: number;
  }>;
  fastMoversCount: number;
  deadStockCount: number;
}

export interface Seasonality {
  hasSeasonality: boolean;
  patterns: Array<{
    month_name: string;
    revenue: number;
    index: number;
  }>;
  peakMonth?: string;
  peakIndex?: number;
  lowMonth?: string;
  lowIndex?: number;
}

export interface AIResponse {
  answer: string;
  context_used: string[];
  suggestions: string[];
}

export interface PreliminaryAnalysis {
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    uniqueProducts: number;
    periodDays: number;
    recentGrowth: number;
    overallTrend: string;
  };
  topProducts: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  abcSummary: { classA: number; classB: number; classC: number };
  deadStockCount: number;
  issues: string[];
  recommendations: string[];
}

// =====================
// Helpers
// =====================
const buildDateParams = (startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  return params.toString() ? `?${params.toString()}` : '';
};

// =====================
// API Functions (existing)
// =====================
export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export const processData = async (
  sessionId: string,
  columnMapping: Record<string, string | null>
): Promise<ProcessResponse> => {
  const response = await api.post('/process', {
    session_id: sessionId,
    column_mapping: columnMapping,
  });
  return response.data;
};

export const getDateRange = async (sessionId: string): Promise<DateRange> => {
  const response = await api.get(`/date-range/${sessionId}`);
  return response.data;
};

export const getKPIs = async (
  sessionId: string,
  startDate?: string,
  endDate?: string
): Promise<KPIs> => {
  const params = buildDateParams(startDate, endDate);
  const response = await api.get(`/kpis/${sessionId}${params}`);
  return response.data;
};

export const getRevenueTrend = async (
  sessionId: string,
  startDate?: string,
  endDate?: string
): Promise<RevenueTrend[]> => {
  const params = buildDateParams(startDate, endDate);
  const response = await api.get(`/revenue-trend/${sessionId}${params}`);
  return response.data;
};

export const getTopProducts = async (
  sessionId: string,
  limit = 10,
  startDate?: string,
  endDate?: string
): Promise<TopProduct[]> => {
  let url = `/top-products/${sessionId}?limit=${limit}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  const response = await api.get(url);
  return response.data;
};

export const getCategories = async (
  sessionId: string,
  startDate?: string,
  endDate?: string
): Promise<CategoryPerformance[]> => {
  const params = buildDateParams(startDate, endDate);
  const response = await api.get(`/categories/${sessionId}${params}`);
  return response.data;
};

export const getABCAnalysis = async (
  sessionId: string,
  startDate?: string,
  endDate?: string
): Promise<ABCAnalysis> => {
  const params = buildDateParams(startDate, endDate);
  const response = await api.get(`/abc-analysis/${sessionId}${params}`);
  return response.data;
};

export const getDayOfWeek = async (
  sessionId: string,
  startDate?: string,
  endDate?: string
): Promise<DayOfWeek[]> => {
  const params = buildDateParams(startDate, endDate);
  const response = await api.get(`/day-of-week/${sessionId}${params}`);
  return response.data;
};

export const getProductDetails = async (
  sessionId: string,
  productName: string
): Promise<ProductDetails> => {
  const response = await api.get(
    `/product/${sessionId}/${encodeURIComponent(productName)}`
  );
  return response.data;
};

export const searchProducts = async (
  sessionId: string,
  query: string
): Promise<ProductSearchResult[]> => {
  const response = await api.get(
    `/search-products/${sessionId}?q=${encodeURIComponent(query)}`
  );

  const data = response.data;
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.results)
    ? (data as any).results
    : [];

  if (raw.length > 0 && typeof raw[0] === 'string') {
    return raw
      .map((name: string) => ({ name: String(name).trim(), revenue: 0 }))
      .filter((x) => x.name.length > 0);
    }

  return raw
    .map((item: any) => {
      const name =
        typeof item?.name === 'string'
          ? item.name
          : item?.name?.name ?? String(item?.name ?? '');

      const revenue =
        typeof item?.revenue === 'number' ? item.revenue : Number(item?.revenue ?? 0);

      return {
        name: String(name).trim(),
        revenue: Number.isFinite(revenue) ? revenue : 0,
      };
    })
    .filter((x) => x.name.length > 0);
};

// =====================
// UPDATED / NEW Forecasting APIs
// =====================

/**
 * Forecast API (supports method + forecast type + periods + optional product)
 * Endpoint recommendation:
 *  GET /forecast/:sessionId?periods=3&method=auto&type=total_revenue&product=...
 */
export const getForecast = async (
  sessionId: string,
  params: {
    periods?: number;
    method?: ForecastMethod;
    type?: ForecastType;
    product?: string;
  } = {}
): Promise<Forecast> => {
  const q = new URLSearchParams();
  q.set('periods', String(params.periods ?? 3));
  if (params.method) q.set('method', params.method);
  if (params.type) q.set('type', params.type);
  if (params.product) q.set('product', params.product);

  const response = await api.get(`/forecast/${sessionId}?${q.toString()}`);
  return response.data;
};

/**
 * NEW: Accuracy testing
 * Endpoint recommendation:
 *  GET /forecast-accuracy/:sessionId?periods=3&method=auto&type=total_revenue&product=...
 */
export const testForecastAccuracy = async (
  sessionId: string,
  params: {
    periods?: number;
    method?: ForecastMethod;
    type?: ForecastType;
    product?: string;
  } = {}
): Promise<ForecastAccuracy> => {
  const q = new URLSearchParams();
  q.set('periods', String(params.periods ?? 3));
  if (params.method) q.set('method', params.method);
  if (params.type) q.set('type', params.type);
  if (params.product) q.set('product', params.product);

  const response = await api.get(`/forecast-accuracy/${sessionId}?${q.toString()}`);
  return response.data;
};

/**
 * UPDATED: Reorder suggestions
 * Endpoint recommendation:
 *  GET /reorder-suggestions/:sessionId?months=3&method=auto
 */
export const getReorderSuggestions = async (
  sessionId: string,
  months = 1,
  method?: ForecastMethod
): Promise<ReorderSuggestion[]> => {
  const q = new URLSearchParams();
  q.set('months', String(months));
  if (method) q.set('method', method);

  const response = await api.get(`/reorder-suggestions/${sessionId}?${q.toString()}`);

  // Backward compatibility mapper: if backend still returns old keys, map to new ones
  const raw = Array.isArray(response.data) ? response.data : [];
  return raw.map((r: any) => ({
    product: r.product ?? r.name ?? '',
    avgMonthlyUnits: Number(r.avgMonthlyUnits ?? r.monthly_units ?? r.avg_monthly_units ?? 0),
    forecastRevenue: Number(r.forecastRevenue ?? r.monthly_revenue ?? r.forecast_revenue ?? 0),
    suggestedReorder: Number(r.suggestedReorder ?? r.suggested_reorder ?? r.suggested_reorder_units ?? 0),
  }));
};

/**
 * NEW: Product options for dropdowns
 * Endpoint recommendation:
 *  GET /product-options/:sessionId
 */
export const getProductOptions = async (sessionId: string): Promise<ProductOption[]> => {
  const response = await api.get(`/product-options/${sessionId}`);
  const raw = Array.isArray(response.data) ? response.data : [];
  // allow backend to return string[]
  if (raw.length && typeof raw[0] === 'string') {
    return raw.map((name: string) => ({ name }));
  }
  return raw.map((x: any) => ({ name: String(x?.name ?? x ?? '').trim() })).filter((x) => x.name);
};

/**
 * UPDATED: Compare products
 * Endpoint recommendation:
 *  POST /compare-products/:sessionId
 *  body: { product1, product2, periods, method, metric }
 */
export const compareProducts = async (
  sessionId: string,
  payload: {
    product1: string;
    product2: string;
    periods?: number;
    method?: ForecastMethod;
    metric?: 'revenue' | 'units';
  }
): Promise<ProductComparison> => {
  const response = await api.post(`/compare-products/${sessionId}`, payload);
  return response.data;
};

// =====================
// Other APIs (existing)
// =====================
export const getInventoryAlerts = async (sessionId: string): Promise<InventoryAlerts> => {
  const response = await api.get(`/inventory-alerts/${sessionId}`);
  return response.data;
};

export const getSeasonality = async (sessionId: string): Promise<Seasonality> => {
  const response = await api.get(`/seasonality/${sessionId}`);
  return response.data;
};

export const getPreliminaryAnalysis = async (
  sessionId: string
): Promise<PreliminaryAnalysis> => {
  const response = await api.get(`/preliminary-analysis/${sessionId}`);
  return response.data;
};

// AI Intelligence APIs
export const askAI = async (
  sessionId: string,
  question: string,
  apiKey?: string
): Promise<AIResponse> => {
  const response = await api.post('/ai/ask', {
    session_id: sessionId,
    question,
    api_key: apiKey,
  });
  return response.data;
};

export const diagnoseData = async (
  sessionId: string,
  apiKey?: string
): Promise<AIResponse | PreliminaryAnalysis> => {
  let url = `/ai/diagnose/${sessionId}`;
  if (apiKey) url += `?api_key=${encodeURIComponent(apiKey)}`;
  const response = await api.get(url);
  return response.data;
};

export const getSuggestedQuestions = async (): Promise<{
  categories: Array<{ name: string; questions: string[] }>;
}> => {
  const response = await api.get('/ai/suggested-questions');
  return response.data;
};

export default api;


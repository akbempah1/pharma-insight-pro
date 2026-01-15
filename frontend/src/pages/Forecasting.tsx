import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Title,
  Text,
  AreaChart,
  Flex,
  Metric,
  Grid,
  Select,
  SelectItem,
  Badge,
} from '@tremor/react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  getForecast,
  testForecastAccuracy,
  searchProducts,
  Forecast,
  ForecastMethod,
  ForecastAccuracy,
  ProductSearchResult,
} from '../api';
import { formatCurrency, formatNumber, cn } from '../utils';

interface ForecastingProps {
  sessionId: string;
}

type MetricType = 'revenue' | 'units' | 'transactions';

const METHOD_OPTIONS: Array<{ label: string; value: ForecastMethod }> = [
  { label: 'Auto (Recommended)', value: 'auto' },
  { label: 'Moving Average', value: 'moving_average' },
  { label: 'Exponential Smoothing', value: 'exponential_smoothing' },
  { label: 'Seasonal', value: 'seasonal' },
];

export default function Forecasting({ sessionId }: ForecastingProps) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  // Controls - SEPARATED metric from product selection
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [method, setMethod] = useState<ForecastMethod>('auto');
  const [periods, setPeriods] = useState(3);

  // Product search (optional - can forecast for specific product OR overall)
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
 

  // Accuracy testing
  const [accuracyLoading, setAccuracyLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<ForecastAccuracy | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Fetch forecast whenever settings change
  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, periods, method, metric, selectedProduct]);

  // Debounced product search
  useEffect(() => {
    const run = async () => {
      const q = productQuery.trim();
      if (q.length < 2) {
        setProductResults([]);
        return;
      }

      try {
        const results = await searchProducts(sessionId, q);
        setProductResults(Array.isArray(results) ? results : []);
      } catch {
        setProductResults([]);
      }
    };

    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [productQuery, sessionId]);

  // Format value based on metric type
  const formatValue = (value: number): string => {
    if (metric === 'units') {
      return `${formatNumber(Math.round(value))} units`;
    }
    if (metric === 'transactions') {
      return `${formatNumber(Math.round(value))} txns`;
    }
    return formatCurrency(value);
  };

  // Format value for chart (shorter)
  const formatChartValue = (value: number): string => {
    if (metric === 'units') {
      return formatNumber(Math.round(value));
    }
    if (metric === 'transactions') {
      return formatNumber(Math.round(value));
    }
    return formatCurrency(value);
  };

  // Get unit label
  const getUnitLabel = (): string => {
    if (metric === 'units') return 'Units';
    if (metric === 'transactions') return 'Transactions';
    return 'Revenue (GHS)';
  };

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    setAccuracy(null);

    try {
      // Map metric to backend forecast_type
      const forecastType = metric === 'units' ? 'units' : 
                          metric === 'transactions' ? 'transactions' : 
                          'total_revenue';

      const data = await getForecast(sessionId, {
        periods,
        method,
        type: forecastType as any,
        product: selectedProduct ?? undefined,
      });
      setForecast(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate forecast');
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productName: string) => {
    setSelectedProduct(productName);
    setProductQuery('');
    setProductResults([]);
  };

  const clearSelectedProduct = () => {
    setSelectedProduct(null);
    setProductQuery('');
    setProductResults([]);
  };

  const runAccuracyTest = async () => {
    setAccuracyLoading(true);
    setError(null);
    try {
      const forecastType = metric === 'units' ? 'units' : 
                          metric === 'transactions' ? 'transactions' : 
                          'total_revenue';

      const res = await testForecastAccuracy(sessionId, {
        periods,
        method,
        type: forecastType as any,
        product: selectedProduct ?? undefined,
      });
      setAccuracy(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to test forecast accuracy');
      setAccuracy(null);
    } finally {
      setAccuracyLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />;
    if (trend === 'down') return <ArrowTrendingDownIcon className="w-5 h-5 text-red-500" />;
    return <MinusIcon className="w-5 h-5 text-gray-400" />;
  };

  const getTrendColor = (trend: string): 'emerald' | 'red' | 'gray' => {
    if (trend === 'up') return 'emerald';
    if (trend === 'down') return 'red';
    return 'gray';
  };

  const pageTitle = useMemo(() => {
    const metricLabel = metric === 'units' ? 'Units' : 
                       metric === 'transactions' ? 'Transactions' : 'Revenue';
    if (selectedProduct) {
      return `${metricLabel} Forecast: ${selectedProduct}`;
    }
    return `Total ${metricLabel} Forecast`;
  }, [metric, selectedProduct]);

  const pageSubtitle = useMemo(() => {
    if (metric === 'units') {
      return selectedProduct 
        ? `Forecast quantity to order for ${selectedProduct}`
        : 'Forecast total quantity for purchasing & inventory planning';
    }
    if (metric === 'transactions') return 'Forecast customer transaction count';
    return 'Forecast revenue for financial planning';
  }, [metric, selectedProduct]);

  // Combine historical and forecast data for chart
  const chartData = useMemo(() => {
    if (!forecast) return [];

    const hist = forecast.historical.map((h) => ({
      period: h.period,
      Historical: h.revenue,
      Forecast: null as number | null,
    }));

    const fc = forecast.forecast.map((f) => ({
      period: f.period,
      Historical: null as number | null,
      Forecast: f.forecast,
    }));

    return [...hist, ...fc];
  }, [forecast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Forecasting</h1>
        <p className="text-gray-500 mt-1">Predict future sales using historical data</p>
      </div>

      {/* Quick Action for Purchasing Officers */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="text-amber-900">📦 Purchasing Officer?</Title>
            <Text className="text-amber-700 mt-1">
              Search for a product and see how many units to order
            </Text>
          </div>
          <button
            onClick={() => {
              setMetric('units');
              
            }}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
          >
            Forecast Product Units →
          </button>
        </Flex>
      </Card>

      {/* Forecast Settings */}
      <Card>
        <Title>Forecast Settings</Title>
        <Text className="mt-1">Choose what to measure and how far ahead to forecast.</Text>

        {/* Metric Toggle */}
        <div className="mt-4">
          <Text className="mb-2 font-medium">What do you want to forecast?</Text>
          <div className="flex gap-2">
            <button
              onClick={() => setMetric('revenue')}
              className={cn(
                "px-4 py-3 rounded-lg font-medium transition-all flex-1 border-2",
                metric === 'revenue' 
                  ? "bg-teal-500 text-white border-teal-500" 
                  : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"
              )}
            >
              💰 Revenue (GHS)
            </button>
            <button
              onClick={() => setMetric('units')}
              className={cn(
                "px-4 py-3 rounded-lg font-medium transition-all flex-1 border-2",
                metric === 'units' 
                  ? "bg-amber-500 text-white border-amber-500" 
                  : "bg-white text-gray-700 border-gray-200 hover:border-amber-300"
              )}
            >
              📦 Units (Quantity)
            </button>
            <button
              onClick={() => setMetric('transactions')}
              className={cn(
                "px-4 py-3 rounded-lg font-medium transition-all flex-1 border-2",
                metric === 'transactions' 
                  ? "bg-blue-500 text-white border-blue-500" 
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
              )}
            >
              🧾 Transactions
            </button>
          </div>
        </div>

        {/* Product Search */}
        <div className="mt-4">
          <Flex justifyContent="between" alignItems="center" className="mb-2">
            <Text className="font-medium">
              {selectedProduct ? 'Selected Product' : 'Filter by Product (Optional)'}
            </Text>
            {selectedProduct && (
              <button
                onClick={clearSelectedProduct}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <XMarkIcon className="w-3 h-3" />
                Clear
              </button>
            )}
          </Flex>

          {selectedProduct ? (
            <div className="p-3 bg-gray-100 rounded-lg flex items-center justify-between">
              <div>
                <Text className="font-semibold text-gray-900">{selectedProduct}</Text>
                <Text className="text-xs text-gray-500">
                  Forecasting {metric} for this product
                </Text>
              </div>
              <Badge color={metric === 'units' ? 'amber' : 'teal'}>
                {metric === 'units' ? '📦 Units' : metric === 'transactions' ? '🧾 Txns' : '💰 Revenue'}
              </Badge>
            </div>
          ) : (
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search product (e.g., Nifecard, Paracetamol)..."
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              {productResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {productResults.map((result, idx) => (
                    <button
                      key={`${result.name}-${idx}`}
                      onClick={() => handleSelectProduct(result.name)}
                      className="w-full px-4 py-3 text-left hover:bg-teal-50 border-b border-gray-100 last:border-0 flex justify-between items-center"
                      type="button"
                    >
                      <span className="text-gray-900 font-medium">{result.name}</span>
                      <span className="text-gray-500 text-sm">
                        {formatCurrency(result.revenue)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {productQuery.trim().length >= 2 && productResults.length === 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                  <Text className="text-gray-500">No products found for "{productQuery.trim()}"</Text>
                </div>
              )}
            </div>
          )}

          {!selectedProduct && (
            <Text className="text-xs text-gray-500 mt-2">
              Leave empty to forecast for all products combined
            </Text>
          )}
        </div>

        <Grid numItemsSm={2} className="gap-4 mt-4">
          {/* Periods */}
          <div>
            <Text className="mb-2">Forecast Periods</Text>
            <Select value={String(periods)} onValueChange={(v) => setPeriods(Number(v))}>
              <SelectItem value="1">1 Month</SelectItem>
              <SelectItem value="2">2 Months</SelectItem>
              <SelectItem value="3">3 Months (Recommended)</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
            </Select>
          </div>

          {/* Method */}
          <div>
            <Text className="mb-2">Forecast Method</Text>
            <Select value={method} onValueChange={(v) => setMethod(v as ForecastMethod)}>
              {METHOD_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </Grid>

        {/* Generate Button */}
        <div className="mt-4">
          <button
            onClick={fetchForecast}
            className={cn(
              "w-full px-4 py-3 rounded-lg text-white font-medium transition-colors",
              metric === 'units' ? "bg-amber-500 hover:bg-amber-600" : "bg-teal-600 hover:bg-teal-700"
            )}
            disabled={loading}
            type="button"
          >
            {loading ? 'Generating...' : `Generate ${metric === 'units' ? 'Units' : metric === 'transactions' ? 'Transactions' : 'Revenue'} Forecast`}
          </button>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <Text className="text-red-700">{error}</Text>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Forecast Results */}
      {!loading && forecast && (
        <>
          {/* Summary Cards */}
          <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
            <Card decoration="left" decorationColor={metric === 'units' ? 'amber' : 'teal'}>
              <Text>Last Actual</Text>
              <Metric>{formatValue(forecast.lastActual)}</Metric>
              <Text className="text-xs text-gray-500 mt-1">{getUnitLabel()}</Text>
            </Card>

            <Card decoration="left" decorationColor="violet">
              <Text>Forecast Average</Text>
              <Metric>{formatValue(forecast.forecastAvg)}</Metric>
              <Text className="text-xs text-gray-500 mt-1">Per month</Text>
            </Card>

            <Card decoration="left" decorationColor={getTrendColor(forecast.trend)}>
              <Flex>
                <div>
                  <Text>Trend</Text>
                  <Metric className="capitalize">{forecast.trend}</Metric>
                </div>
                {getTrendIcon(forecast.trend)}
              </Flex>
            </Card>

            <Card decoration="left" decorationColor="gray">
              <Text>Method Used</Text>
              <Metric className="text-lg">{forecast.method}</Metric>
            </Card>
          </Grid>

          {/* Purchasing Summary for Units - Show at top when relevant */}
          {metric === 'units' && (
            <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Flex justifyContent="between" alignItems="center">
                <div>
                  <Title className="text-white">
                    📋 {selectedProduct ? `Order Recommendation: ${selectedProduct}` : 'Total Order Recommendation'}
                  </Title>
                  <Text className="text-amber-100 mt-1">
                    Recommended quantity for the next {periods} month(s)
                  </Text>
                </div>
                <div className="text-right">
                  <Metric className="text-white text-4xl">
                    {formatNumber(Math.round(forecast.forecast.reduce((sum, f) => sum + f.forecast, 0) * 1.1))}
                  </Metric>
                  <Text className="text-amber-100">units (includes 10% safety buffer)</Text>
                </div>
              </Flex>
            </Card>
          )}

          {/* Forecast Chart */}
          <Card>
            <Flex justifyContent="between" alignItems="start">
              <div>
                <Title>{pageTitle}</Title>
                <Text>{pageSubtitle}</Text>
              </div>
              <Badge color={metric === 'units' ? 'amber' : metric === 'transactions' ? 'blue' : 'teal'} size="sm">
                {getUnitLabel()}
              </Badge>
            </Flex>

            <div className="h-80 min-h-[320px]">
              <AreaChart
                className="h-full mt-4"
                data={chartData}
                index="period"
                categories={['Historical', 'Forecast']}
                colors={metric === 'units' ? ['amber', 'orange'] : ['teal', 'violet']}
                valueFormatter={(value) => (value ? formatChartValue(value) : '')}
                showLegend={true}
                curveType="monotone"
              />
            </div>
          </Card>

          {/* Forecast Details */}
          <Card>
            <Flex justifyContent="between" alignItems="center" className="mb-4">
              <div>
                <Title>Monthly Breakdown</Title>
                {metric === 'units' && selectedProduct && (
                  <Text className="text-amber-600">📦 Use these numbers for your {selectedProduct} purchase orders</Text>
                )}
              </div>
              {metric === 'units' && (
                <Badge color="amber" size="lg">
                  Total: {formatNumber(Math.round(forecast.forecast.reduce((sum, f) => sum + f.forecast, 0)))} units
                </Badge>
              )}
            </Flex>

            <div className="space-y-3">
              {forecast.forecast.map((f, index) => (
                <div
                  key={f.period}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg",
                    metric === 'units' ? "bg-amber-50 border border-amber-200" : "bg-gray-50"
                  )}
                >
                  <div>
                    <Text className="font-semibold text-lg">{f.period}</Text>
                    <Text className="text-xs text-gray-500">Month {index + 1}</Text>
                  </div>
                  <div className="text-right">
                    <Text className={cn(
                      "font-bold text-2xl",
                      metric === 'units' ? "text-amber-700" : "text-gray-900"
                    )}>
                      {metric === 'units' ? (
                        <>{formatNumber(Math.round(f.forecast))} <span className="text-sm font-normal">units</span></>
                      ) : metric === 'transactions' ? (
                        <>{formatNumber(Math.round(f.forecast))} <span className="text-sm font-normal">transactions</span></>
                      ) : (
                        formatCurrency(f.forecast)
                      )}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      Range: {metric === 'units' || metric === 'transactions'
                        ? `${formatNumber(Math.round(f.lower))} - ${formatNumber(Math.round(f.upper))}`
                        : `${formatCurrency(f.lower)} - ${formatCurrency(f.upper)}`
                      }
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Forecast Accuracy Testing */}
          <Card>
            <Flex justifyContent="between" alignItems="start">
              <div>
                <Title>Forecast Accuracy Testing</Title>
                <Text className="mt-1">
                  Test how accurate this method would have been on your historical data.
                </Text>
              </div>
              <button
                onClick={runAccuracyTest}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  accuracyLoading
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
                disabled={accuracyLoading}
                type="button"
              >
                {accuracyLoading ? 'Testing…' : 'Test Accuracy'}
              </button>
            </Flex>

            {accuracyLoading && (
              <div className="flex items-center justify-center h-24">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            )}

            {!accuracyLoading && accuracy && (
              <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-white">
                <Flex justifyContent="between" alignItems="start">
                  <div>
                    <Text className="text-sm text-gray-500">Metric</Text>
                    <Metric className="text-gray-900">{accuracy.metric}</Metric>
                  </div>
                  <div className="text-right">
                    <Text className="text-sm text-gray-500">Error Rate (MAPE)</Text>
                    <Metric className="text-gray-900">
                      {Number.isFinite(accuracy.value) ? accuracy.value.toFixed(1) + '%' : String(accuracy.value)}
                    </Metric>
                  </div>
                </Flex>

                <div className="mt-3 flex items-start gap-2 text-gray-600">
                  <BeakerIcon className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <Text>
                    Method: <span className="font-medium">{String(accuracy.method)}</span>
                  </Text>
                </div>
              </div>
            )}
          </Card>

          {/* Info Note */}
          <Card className={cn(
            "border",
            metric === 'units' ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
          )}>
            <Title className={metric === 'units' ? "text-amber-900" : "text-blue-900"}>
              {metric === 'units' ? '📦 About This Units Forecast' : 'ℹ️ About This Forecast'}
            </Title>
            <Text className={cn("mt-2", metric === 'units' ? "text-amber-700" : "text-blue-700")}>
              This forecast uses <span className="font-medium">{forecast.method}</span> based on your historical sales data.
              {metric === 'units' ? (
                <> The quantities shown are estimates. Consider adding a 10-15% buffer when placing orders to account for variability.</>
              ) : (
                <> The range shown represents the confidence interval. Actual results may vary based on market conditions.</>
              )}
            </Text>
          </Card>
        </>
      )}
    </div>
  );
}

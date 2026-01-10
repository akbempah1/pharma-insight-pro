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
} from '@heroicons/react/24/outline';
import {
  getForecast,
  testForecastAccuracy,
  searchProducts,
  Forecast,
  ForecastMethod,
  ForecastType,
  ForecastAccuracy,
  ProductSearchResult,
} from '../api';
import { formatCurrency, cn } from '../utils';

interface ForecastingProps {
  sessionId: string;
}

const METHOD_OPTIONS: Array<{ label: string; value: ForecastMethod }> = [
  { label: 'Auto (Recommended)', value: 'auto' },
  { label: 'Moving Average', value: 'moving_average' },
  { label: 'Exponential Smoothing', value: 'exponential_smoothing' },
  { label: 'Seasonal', value: 'seasonal' },
];

export default function Forecasting({ sessionId }: ForecastingProps) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  // Controls
  const [forecastType, setForecastType] = useState<ForecastType>('total_revenue');
  const [method, setMethod] = useState<ForecastMethod>('auto');
  const [periods, setPeriods] = useState(3);

  // Product search (only used when you want a specific product forecast)
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<ProductSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Accuracy testing
  const [accuracyLoading, setAccuracyLoading] = useState(false);
  const [accuracy, setAccuracy] = useState<ForecastAccuracy | null>(null);

  const [error, setError] = useState<string | null>(null);

  // If user selects a product, automatically switch type to "product"
  useEffect(() => {
    if (selectedProduct) setForecastType('product');
  }, [selectedProduct]);

  // If user switches away from product forecast type, clear product
  useEffect(() => {
    if (forecastType !== 'product' && selectedProduct) {
      setSelectedProduct(null);
      setProductQuery('');
      setProductResults([]);
    }
  }, [forecastType, selectedProduct]);

  // Fetch forecast whenever settings change
  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, periods, method, forecastType, selectedProduct]);

  // Debounced product search
  useEffect(() => {
    const run = async () => {
      const q = productQuery.trim();
      if (forecastType !== 'product') return;
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
  }, [productQuery, sessionId, forecastType]);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    setAccuracy(null); // reset accuracy when settings change

    try {
      const data = await getForecast(sessionId, {
        periods,
        method,
        type: forecastType,
        product: forecastType === 'product' ? selectedProduct ?? undefined : undefined,
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
      const res = await testForecastAccuracy(sessionId, {
        periods,
        method,
        type: forecastType,
        product: forecastType === 'product' ? selectedProduct ?? undefined : undefined,
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
    if (forecastType === 'product' && selectedProduct) return `Forecast: ${selectedProduct}`;
    if (forecastType === 'units') return 'Units Forecast';
    if (forecastType === 'transactions') return 'Transactions Forecast';
    return 'Total Revenue Forecast';
  }, [forecastType, selectedProduct]);

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

      {/* Forecast Settings (matches the “first version” layout) */}
      <Card>
        <Title>Forecast Settings</Title>
        <Text className="mt-1">Choose what to forecast, how far ahead, and which method to use.</Text>

        <Grid numItemsSm={2} numItemsLg={3} className="gap-4 mt-4">
          {/* Forecast Type */}
          <div>
            <Flex justifyContent="between" className="mb-2">
              <Text>Forecast Type</Text>
              <Text className="text-xs text-gray-500">
                {forecastType === 'product' ? 'Product' : 'Overall'}
              </Text>
            </Flex>

            <Select value={forecastType} onValueChange={(v) => setForecastType(v as ForecastType)}>
              <SelectItem value="total_revenue">Total Revenue</SelectItem>
              <SelectItem value="units">Units Sold</SelectItem>
              <SelectItem value="transactions">Transactions</SelectItem>
              <SelectItem value="product">Specific Product</SelectItem>
            </Select>

            {/* Product picker appears ONLY when Specific Product is chosen */}
            {forecastType === 'product' && (
              <div className="mt-3">
                <Text className="mb-2">Product</Text>

                <div className="relative">
                  <input
                    type="text"
                    placeholder={selectedProduct || 'Search product name...'}
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />

                  {selectedProduct && (
                    <button
                      onClick={clearSelectedProduct}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear product selection"
                      type="button"
                    >
                      ×
                    </button>
                  )}

                  {productResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {productResults.map((result, idx) => (
                        <button
                          key={`${result.name}-${idx}`}
                          onClick={() => handleSelectProduct(result.name)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50 border-b border-gray-100 last:border-0 flex justify-between items-center"
                          type="button"
                        >
                          <span className="text-gray-900 truncate pr-3">{result.name}</span>
                          <span className="text-gray-500 whitespace-nowrap">
                            {formatCurrency(result.revenue)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {productQuery.trim().length >= 2 && productResults.length === 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center">
                      <Text className="text-gray-500">No products found for “{productQuery.trim()}”</Text>
                    </div>
                  )}
                </div>

                {forecastType === 'product' && !selectedProduct && (
                  <Text className="text-xs text-gray-500 mt-2">
                    Tip: search and select a product to forecast.
                  </Text>
                )}
              </div>
            )}
          </div>

          {/* Periods */}
          <div>
            <Text className="mb-2">Forecast Periods (Months)</Text>
            <Select value={String(periods)} onValueChange={(v) => setPeriods(Number(v))}>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="6">6</SelectItem>
            </Select>
          </div>

          {/* Method */}
          <div>
            <Text className="mb-2">Method</Text>
            <Select value={method} onValueChange={(v) => setMethod(v as ForecastMethod)}>
              {METHOD_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </Grid>

        {/* Actions row */}
        <Flex className="mt-4" justifyContent="between" alignItems="center">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchForecast}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-60"
              disabled={loading || (forecastType === 'product' && !selectedProduct)}
              type="button"
            >
              Generate Forecast
            </button>

            <Badge color="teal" size="xs">
              {forecastType === 'product' ? 'Product forecast' : 'Overall forecast'}
            </Badge>
          </div>

          <Text className="text-xs text-gray-500">
            {forecastType === 'product' && !selectedProduct
              ? 'Select a product to enable forecast.'
              : 'Forecast updates automatically when settings change.'}
          </Text>
        </Flex>
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
            <Card decoration="left" decorationColor="teal">
              <Text>Last Actual</Text>
              <Metric>{formatCurrency(forecast.lastActual)}</Metric>
            </Card>

            <Card decoration="left" decorationColor="violet">
              <Text>Forecast Average</Text>
              <Metric>{formatCurrency(forecast.forecastAvg)}</Metric>
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
              <Text>Method</Text>
              <Metric className="text-lg">{forecast.method}</Metric>
            </Card>
          </Grid>

          {/* Forecast Chart */}
          <Card>
            <Flex justifyContent="between" alignItems="start">
              <div>
                <Title>{pageTitle}</Title>
                <Text>Historical data with {periods}-month forecast</Text>
              </div>
              <Badge color="teal" size="sm">
                {method === 'auto' ? 'Auto' : method.replace('_', ' ')}
              </Badge>
            </Flex>

            <div className="h-80 min-h-[320px]">
              <AreaChart
                className="h-full mt-4"
                data={chartData}
                index="period"
                categories={['Historical', 'Forecast']}
                colors={['teal', 'violet']}
                valueFormatter={(value) => (value ? formatCurrency(value) : '')}
                showLegend={true}
                curveType="monotone"
              />
            </div>
          </Card>

          {/* Forecast Details */}
          <Card>
            <Title>Forecast Details</Title>
            <div className="mt-4 space-y-3">
              {forecast.forecast.map((f, index) => (
                <div
                  key={f.period}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <Text className="font-medium">{f.period}</Text>
                    <Text className="text-xs text-gray-500">Month {index + 1}</Text>
                  </div>
                  <div className="text-right">
                    <Text className="font-semibold text-lg">{formatCurrency(f.forecast)}</Text>
                    <Text className="text-xs text-gray-500">
                      Range: {formatCurrency(f.lower)} - {formatCurrency(f.upper)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Forecast Accuracy Testing (like your first version) */}
          <Card>
            <Flex justifyContent="between" alignItems="start">
              <div>
                <Title>Forecast Accuracy Testing</Title>
                <Text className="mt-1">
                  Test how accurate this would have been on your historical data (holdout evaluation).
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={runAccuracyTest}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    accuracyLoading
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  )}
                  disabled={accuracyLoading || (forecastType === 'product' && !selectedProduct)}
                  type="button"
                >
                  {accuracyLoading ? 'Testing…' : 'Test Forecast Accuracy'}
                </button>
              </div>
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
                    <Text className="text-sm text-gray-500">Value</Text>
                    <Metric className="text-gray-900">
                      {Number.isFinite(accuracy.value) ? accuracy.value.toFixed(3) : String(accuracy.value)}
                    </Metric>
                  </div>
                </Flex>

                <div className="mt-3 flex items-start gap-2 text-gray-600">
                  <BeakerIcon className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <Text>
                    Method: <span className="font-medium">{String(accuracy.method)}</span>
                    {accuracy.notes ? ` — ${accuracy.notes}` : ''}
                  </Text>
                </div>
              </div>
            )}

            {!accuracyLoading && !accuracy && (
              <Text className="text-sm text-gray-500 mt-4">
                Click <span className="font-medium">Test Forecast Accuracy</span> to evaluate your current settings.
              </Text>
            )}
          </Card>

          {/* Confidence Note */}
          <Card className="bg-blue-50 border-blue-200">
            <Title className="text-blue-900">About This Forecast</Title>
            <Text className="text-blue-700 mt-2">
              This forecast uses <span className="font-medium">{forecast.method}</span> based on your historical data.
              The range shown is a confidence interval — actual results may vary. For best results, ensure you have
              at least 6 months of data.
            </Text>
          </Card>
        </>
      )}
    </div>
  );
}

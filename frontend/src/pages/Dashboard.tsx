import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  AreaChart,
  BarChart,
  DonutChart,
  Flex,
  Grid,
  Metric,
  BadgeDelta,
  Select,
  SelectItem,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
} from '@tremor/react';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CubeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ReceiptPercentIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import {
  getKPIs,
  getRevenueTrend,
  getTopProducts,
  getCategories,
  getABCAnalysis,
  getDayOfWeek,
  KPIs,
  RevenueTrend,
  TopProduct,
  CategoryPerformance,
  ABCAnalysis,
  DayOfWeek,
} from '../api';
import { formatCurrency, formatNumber, cn } from '../utils';

interface DashboardProps {
  sessionId: string;
}

export default function Dashboard({ sessionId }: DashboardProps) {
  const [kpis, setKPIs] = useState<KPIs | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryPerformance[]>([]);
  const [abcAnalysis, setABCAnalysis] = useState<ABCAnalysis | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  // ✅ build start/end dates from the selectedPeriod so KPIs + everything updates (not only the chart)
  const getPeriodDates = (
    period: string
  ): { startDate?: string; endDate?: string } => {
    if (period === 'all') return {};

    const end = new Date();
    const start = new Date(end);

    const months =
      period === '1m'
        ? 1
        : period === '3m'
        ? 3
        : period === '6m'
        ? 6
        : period === '12m'
        ? 12
        : 0;

    if (!months) return {};

    start.setMonth(start.getMonth() - months);

    const toISO = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
    return { startDate: toISO(start), endDate: toISO(end) };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { startDate, endDate } = getPeriodDates(selectedPeriod);

      try {
        const [
          kpisData,
          trendData,
          productsData,
          categoriesData,
          abcData,
          dowData,
        ] = await Promise.all([
          getKPIs(sessionId, startDate, endDate),
          getRevenueTrend(sessionId, startDate, endDate),
          getTopProducts(sessionId, 15, startDate, endDate),
          getCategories(sessionId, startDate, endDate),
          getABCAnalysis(sessionId, startDate, endDate),
          getDayOfWeek(sessionId, startDate, endDate),
        ]);

        setKPIs(kpisData);
        setRevenueTrend(trendData);
        setTopProducts(productsData);
        setCategories(categoriesData);
        setABCAnalysis(abcData);
        setDayOfWeek(dowData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, selectedPeriod]);

  // ✅ Calculate additional KPIs based on the CURRENT filtered window (revenueTrend is already filtered by API now)
  const extendedKPIs = useMemo(() => {
    if (!kpis || !revenueTrend.length) return null;

    const approxDays = revenueTrend.length * 30; // simple approximation
    const avgDailyRevenue = approxDays > 0 ? kpis.totalRevenue / approxDays : 0;
    const revenuePerProduct =
      kpis.uniqueProducts > 0 ? kpis.totalRevenue / kpis.uniqueProducts : 0;
    const basketSize = kpis.avgTransactionValue;

    const lastMonth = revenueTrend[revenueTrend.length - 1];
    const prevMonth = revenueTrend[revenueTrend.length - 2];

    let trendDirection: 'up' | 'down' | 'stable' = 'stable';
    if (lastMonth && prevMonth) {
      if (lastMonth.revenue > prevMonth.revenue * 1.05) trendDirection = 'up';
      else if (lastMonth.revenue < prevMonth.revenue * 0.95)
        trendDirection = 'down';
    }

    return {
      avgDailyRevenue,
      revenuePerProduct,
      basketSize,
      trendDirection,
      lastMonthRevenue: lastMonth?.revenue || 0,
      prevMonthRevenue: prevMonth?.revenue || 0,
    };
  }, [kpis, revenueTrend]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto"></div>
          <Text className="mt-4">Loading your pharmacy data...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pharmacy Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Real-time sales performance & insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Period Selector */}
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            className="w-40"
          >
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="1m">Last Month</SelectItem>
            <SelectItem value="3m">Last 3 Months</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="12m">Last 12 Months</SelectItem>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('overview')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                viewMode === 'overview'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                viewMode === 'detailed'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-teal-500 to-teal-700 border-0">
          <Flex alignItems="start">
            <div>
              <Text className="text-teal-100">Total Revenue</Text>
              <Metric className="text-white mt-1">
                {formatCurrency(kpis?.totalRevenue || 0)}
              </Metric>
              <Flex className="mt-2" justifyContent="start" alignItems="center">
                <BadgeDelta
                  deltaType={
                    kpis?.momGrowth && kpis.momGrowth >= 0
                      ? 'increase'
                      : 'decrease'
                  }
                  size="xs"
                  className="bg-white/20 text-white"
                >
                  {kpis?.momGrowth
                    ? `${kpis.momGrowth >= 0 ? '+' : ''}${kpis.momGrowth.toFixed(
                        1
                      )}%`
                    : '0%'}
                </BadgeDelta>
                <Text className="ml-2 text-xs text-teal-100">vs last month</Text>
              </Flex>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-white" />
            </div>
          </Flex>
        </Card>

        {/* Transactions */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 border-0">
          <Flex alignItems="start">
            <div>
              <Text className="text-blue-100">Transactions</Text>
              <Metric className="text-white mt-1">
                {formatNumber(kpis?.totalTransactions || 0)}
              </Metric>
              <Text className="text-blue-100 text-sm mt-2">
                {formatCurrency(kpis?.avgTransactionValue || 0)} avg basket
              </Text>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <ShoppingCartIcon className="w-6 h-6 text-white" />
            </div>
          </Flex>
        </Card>

        {/* Units Sold */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 border-0">
          <Flex alignItems="start">
            <div>
              <Text className="text-purple-100">Units Sold</Text>
              <Metric className="text-white mt-1">
                {formatNumber(kpis?.totalUnits || 0)}
              </Metric>
              <Text className="text-purple-100 text-sm mt-2">
                {(kpis?.avgUnitsPerTransaction || 0).toFixed(1)} units/txn
              </Text>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <CubeIcon className="w-6 h-6 text-white" />
            </div>
          </Flex>
        </Card>

        {/* Active Products */}
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0">
          <Flex alignItems="start">
            <div>
              <Text className="text-amber-100">Active Products</Text>
              <Metric className="text-white mt-1">
                {formatNumber(kpis?.uniqueProducts || 0)}
              </Metric>
              <Text className="text-amber-100 text-sm mt-2">
                {formatCurrency(extendedKPIs?.revenuePerProduct || 0)}/product
              </Text>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* Secondary KPIs - Pharmacy Owner Specifics */}
      {viewMode === 'detailed' && (
        <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
          <Card decoration="left" decorationColor="teal">
            <Flex>
              <div>
                <Text>Avg Daily Revenue</Text>
                <Metric className="text-teal-700">
                  {formatCurrency(extendedKPIs?.avgDailyRevenue || 0)}
                </Metric>
              </div>
              <CalendarIcon className="w-8 h-8 text-teal-300" />
            </Flex>
          </Card>

          <Card decoration="left" decorationColor="blue">
            <Flex>
              <div>
                <Text>Basket Size</Text>
                <Metric className="text-blue-700">
                  {formatCurrency(extendedKPIs?.basketSize || 0)}
                </Metric>
              </div>
              <ScaleIcon className="w-8 h-8 text-blue-300" />
            </Flex>
          </Card>

          <Card decoration="left" decorationColor="purple">
            <Flex>
              <div>
                <Text>Revenue/Product</Text>
                <Metric className="text-purple-700">
                  {formatCurrency(extendedKPIs?.revenuePerProduct || 0)}
                </Metric>
              </div>
              <ReceiptPercentIcon className="w-8 h-8 text-purple-300" />
            </Flex>
          </Card>

          <Card
            decoration="left"
            decorationColor={
              extendedKPIs?.trendDirection === 'up'
                ? 'emerald'
                : extendedKPIs?.trendDirection === 'down'
                ? 'red'
                : 'gray'
            }
          >
            <Flex>
              <div>
                <Text>Sales Trend</Text>
                <Metric
                  className={cn(
                    extendedKPIs?.trendDirection === 'up'
                      ? 'text-emerald-700'
                      : extendedKPIs?.trendDirection === 'down'
                      ? 'text-red-700'
                      : 'text-gray-700'
                  )}
                >
                  {extendedKPIs?.trendDirection === 'up'
                    ? '↑ Growing'
                    : extendedKPIs?.trendDirection === 'down'
                    ? '↓ Declining'
                    : '→ Stable'}
                </Metric>
              </div>
              {extendedKPIs?.trendDirection === 'up' ? (
                <ArrowTrendingUpIcon className="w-8 h-8 text-emerald-300" />
              ) : (
                <ArrowTrendingDownIcon className="w-8 h-8 text-red-300" />
              )}
            </Flex>
          </Card>
        </Grid>
      )}

      {/* Revenue Trend with Monthly Breakdown */}
      <Card>
        <Flex>
          <div>
            <Title>Revenue Trend</Title>
            <Text>Monthly performance over time</Text>
          </div>
          <Badge color="teal">{revenueTrend.length} months</Badge>
        </Flex>

        <TabGroup className="mt-4">
          <TabList>
            <Tab>Chart View</Tab>
            <Tab>Table View</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <AreaChart
                className="h-80 mt-4"
                data={revenueTrend}
                index="period"
                categories={['revenue']}
                colors={['teal']}
                valueFormatter={(value) => formatCurrency(value)}
                showLegend={false}
                showGridLines={true}
                curveType="monotone"
              />
            </TabPanel>
            <TabPanel>
              <div className="mt-4 max-h-80 overflow-y-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Month</TableHeaderCell>
                      <TableHeaderCell className="text-right">
                        Revenue
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right">Units</TableHeaderCell>
                      <TableHeaderCell className="text-right">
                        Transactions
                      </TableHeaderCell>
                      <TableHeaderCell className="text-right">Growth</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {revenueTrend.map((month) => (
                      <TableRow key={month.period}>
                        <TableCell>
                          <Text className="font-medium">{month.period}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatCurrency(month.revenue)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatNumber(month.units)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatNumber(month.transactions)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <BadgeDelta
                            deltaType={month.growth >= 0 ? 'increase' : 'decrease'}
                            size="xs"
                          >
                            {month.growth >= 0 ? '+' : ''}
                            {month.growth.toFixed(1)}%
                          </BadgeDelta>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>

      {/* Two Column Layout */}
      <Grid numItemsMd={2} className="gap-6">
        {/* Top Products */}
        <Card>
          <Title>Top 15 Products</Title>
          <Text>Revenue generators - keep these in stock!</Text>
          <div className="mt-4 max-h-96 overflow-y-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>#</TableHeaderCell>
                  <TableHeaderCell>Product</TableHeaderCell>
                  <TableHeaderCell className="text-right">Revenue</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topProducts.map((product, index) => (
                  <TableRow key={product.name}>
                    <TableCell>
                      <Badge
                        color={index < 3 ? 'emerald' : index < 7 ? 'blue' : 'gray'}
                      >
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text
                        className="font-medium truncate max-w-[200px]"
                        title={product.name}
                      >
                        {product.name}
                      </Text>
                    </TableCell>
                    <TableCell className="text-right">
                      <Text>{formatCurrency(product.revenue)}</Text>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Category Performance */}
        <Card>
          <Title>Sales by Category</Title>
          <Text>Customer buying behavior breakdown</Text>
          <DonutChart
            className="h-52 mt-4"
            data={categories.map((c) => ({
              name: c.label,
              value: c.revenue,
            }))}
            category="value"
            index="name"
            valueFormatter={(value) => formatCurrency(value)}
            colors={['amber', 'red', 'blue', 'violet']}
            showLabel={true}
            showAnimation={true}
          />
          <div className="mt-4 space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      cat.label === 'I just grabbed it' && 'bg-amber-500',
                      cat.label === 'I need it NOW' && 'bg-red-500',
                      cat.label === 'I buy EVERY month' && 'bg-blue-500',
                      cat.label === 'I buy this regularly' && 'bg-violet-500'
                    )}
                  />
                  <div>
                    <Text className="font-medium">{cat.label}</Text>
                    <Text className="text-xs text-gray-500">
                      {cat.products} products
                    </Text>
                  </div>
                </div>
                <div className="text-right">
                  <Text className="font-semibold">
                    {formatCurrency(cat.revenue)}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {cat.percentage.toFixed(1)}%
                  </Text>
                </div>
              </div>
            ))}
          </div>

          {/* Markup Recommendations */}
          <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
            <Text className="font-semibold text-teal-800">💡 Markup Strategy</Text>
            <div className="mt-2 text-sm text-teal-700 space-y-1">
              <p>
                • <strong>Acute (45%)</strong>: Customer needs it NOW
              </p>
              <p>
                • <strong>Chronic (30%)</strong>: Price sensitive, buy monthly
              </p>
              <p>
                • <strong>Convenience (40%)</strong>: Impulse, less sensitive
              </p>
              <p>
                • <strong>Recurring (35%)</strong>: Regular purchasers
              </p>
            </div>
          </div>
        </Card>
      </Grid>

      {/* ABC Analysis */}
      <Card>
        <Flex>
          <div>
            <Title>ABC Inventory Classification</Title>
            <Text>Focus your attention where it matters most</Text>
          </div>
        </Flex>

        <Grid numItemsSm={3} className="gap-4 mt-6">
          {abcAnalysis?.summary.map((item) => {
            const config: Record<
              string,
              { bg: string; border: string; text: string; desc: string }
            > = {
              A: {
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                text: 'text-emerald-700',
                desc: 'Top performers - 80% of revenue. Never let these go out of stock!',
              },
              B: {
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                text: 'text-amber-700',
                desc: 'Moderate performers - 15% of revenue. Monitor stock levels.',
              },
              C: {
                bg: 'bg-gray-50',
                border: 'border-gray-200',
                text: 'text-gray-700',
                desc: 'Low performers - 5% of revenue. Review for discontinuation.',
              },
            };

            const cfg = config[item.class] || config.C;

            return (
              <Card key={item.class} className={cn(cfg.bg, cfg.border, 'border')}>
                <Flex alignItems="start">
                  <div>
                    <Badge
                      color={
                        item.class === 'A'
                          ? 'emerald'
                          : item.class === 'B'
                          ? 'amber'
                          : 'gray'
                      }
                      size="lg"
                    >
                      Class {item.class}
                    </Badge>
                    <Metric className={cn(cfg.text, 'mt-2')}>{item.count}</Metric>
                    <Text>products</Text>
                  </div>
                  <div className="text-right">
                    <Text className="font-semibold">
                      {formatCurrency(item.revenue)}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {item.percentage.toFixed(0)}% of revenue
                    </Text>
                  </div>
                </Flex>
                <Text className="mt-3 text-sm text-gray-600">{cfg.desc}</Text>
              </Card>
            );
          })}
        </Grid>
      </Card>

      {/* Day of Week Analysis */}
      <Card>
        <Title>Sales by Day of Week</Title>
        <Text>Plan your staffing based on peak days</Text>
        <BarChart
          className="h-64 mt-4"
          data={dayOfWeek}
          index="day"
          categories={['revenue']}
          colors={['teal']}
          valueFormatter={(value) => formatCurrency(value)}
          showLegend={false}
        />

        {dayOfWeek.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Flex>
              <div>
                <Text className="font-semibold text-blue-800">📊 Staffing Insight</Text>
                <Text className="text-sm text-blue-700 mt-1">
                  Peak day:{' '}
                  <strong>
                    {dayOfWeek.reduce((a, b) => (a.revenue > b.revenue ? a : b)).day}
                  </strong>{' '}
                  - Consider extra staff and full stock
                </Text>
              </div>
            </Flex>
          </div>
        )}
      </Card>

      {/* Quick Actions for Pharmacy Owner */}
      <Card className="bg-gradient-to-r from-teal-600 to-blue-600 border-0">
        <Title className="text-white">Today's Action Items</Title>
        <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-4">
            <Text className="text-white/80 text-sm">Check Stock</Text>
            <Text className="text-white font-semibold mt-1">
              {topProducts.slice(0, 5).length} top products
            </Text>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Text className="text-white/80 text-sm">Review Pricing</Text>
            <Text className="text-white font-semibold mt-1">
              {categories.find((c) => c.category === 'chronic')?.products || 0}{' '}
              chronic items
            </Text>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Text className="text-white/80 text-sm">ABC Focus</Text>
            <Text className="text-white font-semibold mt-1">
              {abcAnalysis?.summary.find((s) => s.class === 'A')?.count || 0} Class A items
            </Text>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <Text className="text-white/80 text-sm">Growth Target</Text>
            <Text className="text-white font-semibold mt-1">
              {formatCurrency((extendedKPIs?.lastMonthRevenue || 0) * 1.1)} next month
            </Text>
          </div>
        </Grid>
      </Card>
    </div>
  );
}

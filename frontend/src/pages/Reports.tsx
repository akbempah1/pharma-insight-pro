import { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Grid,
  Flex,
  Badge,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Button,
  Metric,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@tremor/react';
import {
  DocumentArrowDownIcon,
  TableCellsIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  getKPIs,
  getRevenueTrend,
  getTopProducts,
  getCategories,
  getABCAnalysis,
  KPIs,
  RevenueTrend,
  TopProduct,
  CategoryPerformance,
  ABCAnalysis,
} from '../api';
import { formatCurrency, formatNumber } from '../utils';

interface ReportsProps {
  sessionId: string;
}

export default function Reports({ sessionId }: ReportsProps) {
  const [kpis, setKPIs] = useState<KPIs | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categories, setCategories] = useState<CategoryPerformance[]>([]);
  const [abcAnalysis, setABCAnalysis] = useState<ABCAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpisData, trendData, productsData, categoriesData, abcData] = await Promise.all([
          getKPIs(sessionId),
          getRevenueTrend(sessionId),
          getTopProducts(sessionId, 50),
          getCategories(sessionId),
          getABCAnalysis(sessionId),
        ]);

        setKPIs(kpisData);
        setRevenueTrend(trendData);
        setTopProducts(productsData);
        setCategories(categoriesData);
        setABCAnalysis(abcData);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportProductReport = () => {
    exportToCSV(topProducts.map(p => ({
      Product: p.name,
      Revenue: p.revenue,
      Units: p.units,
      Transactions: p.transactions,
      AvgQtyPerTxn: p.avgQtyPerTxn.toFixed(2),
    })), 'product_performance');
  };

  const exportMonthlyReport = () => {
    exportToCSV(revenueTrend.map(m => ({
      Month: m.period,
      Revenue: m.revenue,
      Units: m.units,
      Transactions: m.transactions,
      GrowthPercent: m.growth.toFixed(2),
    })), 'monthly_revenue');
  };

  const exportCategoryReport = () => {
    exportToCSV(categories.map(c => ({
      Category: c.label,
      Revenue: c.revenue,
      Products: c.products,
      RevenuePercent: c.percentage.toFixed(2),
      SuggestedMarkup: c.suggestedMarkup,
    })), 'category_analysis');
  };

  const exportABCReport = () => {
    if (!abcAnalysis?.details) return;
    exportToCSV(abcAnalysis.details.map(p => ({
      Product: p.product,
      Revenue: p.revenue,
      Units: p.units,
      CumulativePercent: (p.cumulative_pct * 100).toFixed(2),
      Class: p.class,
    })), 'abc_classification');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Exports</h1>
          <p className="text-gray-500 mt-1">Generate reports for accounting, analysis, and decision making</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth} className="w-48">
            <SelectItem value="all">All Months</SelectItem>
            {revenueTrend.map(m => (
              <SelectItem key={m.period} value={m.period}>{m.period}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Quick Export Cards */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={exportProductReport}>
          <Flex>
            <div>
              <Text>Product Performance</Text>
              <Text className="text-gray-500 text-sm">{topProducts.length} products</Text>
            </div>
            <div className="p-2 bg-teal-100 rounded-lg">
              <DocumentArrowDownIcon className="w-6 h-6 text-teal-600" />
            </div>
          </Flex>
          <Button size="xs" variant="secondary" className="mt-3 w-full">
            Export CSV
          </Button>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={exportMonthlyReport}>
          <Flex>
            <div>
              <Text>Monthly Revenue</Text>
              <Text className="text-gray-500 text-sm">{revenueTrend.length} months</Text>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </Flex>
          <Button size="xs" variant="secondary" className="mt-3 w-full">
            Export CSV
          </Button>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={exportCategoryReport}>
          <Flex>
            <div>
              <Text>Category Analysis</Text>
              <Text className="text-gray-500 text-sm">{categories.length} categories</Text>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TableCellsIcon className="w-6 h-6 text-purple-600" />
            </div>
          </Flex>
          <Button size="xs" variant="secondary" className="mt-3 w-full">
            Export CSV
          </Button>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={exportABCReport}>
          <Flex>
            <div>
              <Text>ABC Classification</Text>
              <Text className="text-gray-500 text-sm">{abcAnalysis?.details?.length || 0} items</Text>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClipboardDocumentListIcon className="w-6 h-6 text-amber-600" />
            </div>
          </Flex>
          <Button size="xs" variant="secondary" className="mt-3 w-full">
            Export CSV
          </Button>
        </Card>
      </Grid>

      {/* Executive Summary */}
      <Card>
        <Flex>
          <Title>Executive Summary</Title>
          <Button size="xs" variant="secondary" icon={PrinterIcon} onClick={() => window.print()}>
            Print
          </Button>
        </Flex>
        
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text className="text-gray-500">Total Revenue</Text>
            <Metric className="text-teal-700">{formatCurrency(kpis?.totalRevenue || 0)}</Metric>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text className="text-gray-500">Transactions</Text>
            <Metric className="text-blue-700">{formatNumber(kpis?.totalTransactions || 0)}</Metric>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text className="text-gray-500">Avg Transaction</Text>
            <Metric className="text-purple-700">{formatCurrency(kpis?.avgTransactionValue || 0)}</Metric>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Text className="text-gray-500">MoM Growth</Text>
            <Metric className={kpis?.momGrowth && kpis.momGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'}>
              {kpis?.momGrowth ? `${kpis.momGrowth >= 0 ? '+' : ''}${kpis.momGrowth.toFixed(1)}%` : '0%'}
            </Metric>
          </div>
        </div>
      </Card>

      {/* Detailed Reports Tabs */}
      <Card>
        <TabGroup>
          <TabList>
            <Tab>Monthly Report</Tab>
            <Tab>Product Report</Tab>
            <Tab>Category Report</Tab>
            <Tab>ABC Report</Tab>
          </TabList>

          <TabPanels>
            {/* Monthly Report */}
            <TabPanel>
              <div className="mt-4">
                <Flex>
                  <Title>Monthly Performance</Title>
                  <Button size="xs" variant="secondary" onClick={exportMonthlyReport}>
                    Download CSV
                  </Button>
                </Flex>
                <Table className="mt-4">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Month</TableHeaderCell>
                      <TableHeaderCell className="text-right">Revenue</TableHeaderCell>
                      <TableHeaderCell className="text-right">Units</TableHeaderCell>
                      <TableHeaderCell className="text-right">Transactions</TableHeaderCell>
                      <TableHeaderCell className="text-right">Avg/Txn</TableHeaderCell>
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
                          <Text>{formatCurrency(month.revenue / month.transactions)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge color={month.growth >= 0 ? 'emerald' : 'red'}>
                            {month.growth >= 0 ? '+' : ''}{month.growth.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Monthly Totals */}
                <div className="mt-4 p-4 bg-teal-50 rounded-lg">
                  <Flex>
                    <Text className="font-semibold">Period Summary</Text>
                    <Text className="font-semibold">
                      {formatCurrency(revenueTrend.reduce((sum, m) => sum + m.revenue, 0))} Total
                    </Text>
                  </Flex>
                </div>
              </div>
            </TabPanel>

            {/* Product Report */}
            <TabPanel>
              <div className="mt-4">
                <Flex>
                  <Title>Product Performance</Title>
                  <Button size="xs" variant="secondary" onClick={exportProductReport}>
                    Download CSV
                  </Button>
                </Flex>
                <div className="max-h-96 overflow-y-auto mt-4">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Rank</TableHeaderCell>
                        <TableHeaderCell>Product</TableHeaderCell>
                        <TableHeaderCell className="text-right">Revenue</TableHeaderCell>
                        <TableHeaderCell className="text-right">Units</TableHeaderCell>
                        <TableHeaderCell className="text-right">Txns</TableHeaderCell>
                        <TableHeaderCell className="text-right">Avg Qty</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProducts.map((product, index) => (
                        <TableRow key={product.name}>
                          <TableCell>
                            <Badge color={index < 10 ? 'emerald' : index < 25 ? 'blue' : 'gray'}>
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Text className="font-medium truncate max-w-[250px]" title={product.name}>
                              {product.name}
                            </Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{formatCurrency(product.revenue)}</Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{formatNumber(product.units)}</Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{formatNumber(product.transactions)}</Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{product.avgQtyPerTxn.toFixed(1)}</Text>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabPanel>

            {/* Category Report */}
            <TabPanel>
              <div className="mt-4">
                <Flex>
                  <Title>Category Analysis</Title>
                  <Button size="xs" variant="secondary" onClick={exportCategoryReport}>
                    Download CSV
                  </Button>
                </Flex>
                <Table className="mt-4">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell className="text-right">Revenue</TableHeaderCell>
                      <TableHeaderCell className="text-right">% Share</TableHeaderCell>
                      <TableHeaderCell className="text-right">Products</TableHeaderCell>
                      <TableHeaderCell className="text-right">Suggested Markup</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.category}>
                        <TableCell>
                          <div>
                            <Text className="font-medium">{cat.label}</Text>
                            <Text className="text-xs text-gray-500">{cat.category}</Text>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatCurrency(cat.revenue)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{cat.percentage.toFixed(1)}%</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{cat.products}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge color="blue">{cat.suggestedMarkup}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Markup Strategy Note */}
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <Text className="font-semibold text-amber-800">💡 Markup Recommendations</Text>
                  <Text className="text-sm text-amber-700 mt-2">
                    These markup suggestions are based on customer buying behavior. 
                    <strong> Acute</strong> items command higher margins (urgent need), while 
                    <strong> Chronic</strong> items require competitive pricing (monthly purchase, price comparison).
                  </Text>
                </div>
              </div>
            </TabPanel>

            {/* ABC Report */}
            <TabPanel>
              <div className="mt-4">
                <Flex>
                  <Title>ABC Classification Report</Title>
                  <Button size="xs" variant="secondary" onClick={exportABCReport}>
                    Download CSV
                  </Button>
                </Flex>
                
                {/* ABC Summary */}
                <Grid numItemsSm={3} className="gap-4 mt-4">
                  {abcAnalysis?.summary.map((item) => (
                    <Card key={item.class} decoration="left" decorationColor={
                      item.class === 'A' ? 'emerald' : item.class === 'B' ? 'amber' : 'gray'
                    }>
                      <Flex>
                        <div>
                          <Badge color={item.class === 'A' ? 'emerald' : item.class === 'B' ? 'amber' : 'gray'}>
                            Class {item.class}
                          </Badge>
                          <Metric className="mt-2">{item.count}</Metric>
                          <Text>products</Text>
                        </div>
                        <div className="text-right">
                          <Text>{formatCurrency(item.revenue)}</Text>
                          <Text className="text-sm text-gray-500">{item.percentage.toFixed(0)}%</Text>
                        </div>
                      </Flex>
                    </Card>
                  ))}
                </Grid>
                
                {/* ABC Details */}
                <div className="max-h-80 overflow-y-auto mt-4">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Product</TableHeaderCell>
                        <TableHeaderCell className="text-right">Revenue</TableHeaderCell>
                        <TableHeaderCell className="text-right">Cumulative %</TableHeaderCell>
                        <TableHeaderCell>Class</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {abcAnalysis?.details?.slice(0, 50).map((item) => (
                        <TableRow key={item.product}>
                          <TableCell>
                            <Text className="truncate max-w-[300px]" title={item.product}>
                              {item.product}
                            </Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{formatCurrency(item.revenue)}</Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{(item.cumulative_pct * 100).toFixed(1)}%</Text>
                          </TableCell>
                          <TableCell>
                            <Badge color={
                              item.class === 'A' ? 'emerald' : item.class === 'B' ? 'amber' : 'gray'
                            }>
                              {item.class}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>

      {/* Print-friendly Summary */}
      <Card className="print:block hidden">
        <Title>PharmaInsight Report</Title>
        <Text>Generated: {new Date().toLocaleDateString()}</Text>
      </Card>
    </div>
  );
}

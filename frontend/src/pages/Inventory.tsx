import { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Grid,
  Metric,
  Flex,
  Badge,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  TextInput,
  Button,
} from '@tremor/react';
import {
  BoltIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { getInventoryAlerts, getAllDeadStock, getAllFastMovers, getDeadStockExportUrl, InventoryAlerts, DeadStockItem, FastMoverItem } from '../api';
import { formatCurrency, formatNumber } from '../utils';

interface InventoryProps {
  sessionId: string;
}

export default function Inventory({ sessionId }: InventoryProps) {
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showDeadStockModal, setShowDeadStockModal] = useState(false);
  const [showFastMoversModal, setShowFastMoversModal] = useState(false);
  const [allDeadStock, setAllDeadStock] = useState<DeadStockItem[]>([]);
  const [allFastMovers, setAllFastMovers] = useState<FastMoverItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getInventoryAlerts(sessionId);
        setAlerts(data);
      } catch (error) {
        console.error('Failed to fetch inventory alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [sessionId]);

  const handleViewAllDeadStock = async () => {
    setShowDeadStockModal(true);
    setModalLoading(true);
    try {
      const data = await getAllDeadStock(sessionId);
      setAllDeadStock(data);
    } catch (error) {
      console.error('Failed to fetch all dead stock:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewAllFastMovers = async () => {
    setShowFastMoversModal(true);
    setModalLoading(true);
    try {
      const data = await getAllFastMovers(sessionId);
      setAllFastMovers(data);
    } catch (error) {
      console.error('Failed to fetch all fast movers:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadDeadStock = () => {
    const url = getDeadStockExportUrl(sessionId);
    window.open(url, '_blank');
  };

  // Filter dead stock by search term
  const filteredDeadStock = allDeadStock.filter(item =>
    item.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter fast movers by search term
  const filteredFastMovers = allFastMovers.filter(item =>
    item.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Alerts</h1>
        <p className="text-gray-500 mt-1">Monitor stock levels and identify issues</p>
      </div>

      {/* Summary Cards */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-4">
        <Card decoration="top" decorationColor="emerald">
          <Flex>
            <div>
              <Text>Fast Movers</Text>
              <Metric>{alerts?.fastMoversCount || 0}</Metric>
              <Text className="text-xs text-gray-500 mt-1">Top 10% by velocity</Text>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <BoltIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="red">
          <Flex>
            <div>
              <Text>Dead Stock</Text>
              <Metric>{alerts?.deadStockCount || 0}</Metric>
              <Text className="text-xs text-gray-500 mt-1">60+ days no sales</Text>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="amber">
          <Flex>
            <div>
              <Text>Action Required</Text>
              <Metric>{(alerts?.deadStockCount || 0) > 0 ? 'Yes' : 'No'}</Metric>
              <Text className="text-xs text-gray-500 mt-1">Review dead stock</Text>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="blue">
          <Flex>
            <div>
              <Text>Stock Health</Text>
              <Metric>
                {(alerts?.deadStockCount || 0) < 10 ? 'Good' :
                 (alerts?.deadStockCount || 0) < 30 ? 'Fair' : 'Poor'}
              </Metric>
              <Text className="text-xs text-gray-500 mt-1">Overall status</Text>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArchiveBoxIcon className="w-6 h-6 text-blue-600" />
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* Tabs for Fast Movers and Dead Stock */}
      <Card>
        <TabGroup>
          <TabList>
            <Tab>
              <Flex className="gap-2">
                <BoltIcon className="w-4 h-4" />
                Fast Movers
                <Badge color="emerald">{alerts?.fastMovers.length || 0}</Badge>
              </Flex>
            </Tab>
            <Tab>
              <Flex className="gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Dead Stock
                <Badge color="red">{alerts?.deadStock.length || 0}</Badge>
              </Flex>
            </Tab>
          </TabList>

          <TabPanels>
            {/* Fast Movers Panel */}
            <TabPanel>
              <div className="mt-4">
                <Flex justifyContent="between" alignItems="center" className="mb-4">
                  <Text className="text-gray-600">
                    Products with the highest sales velocity. Keep these in stock to avoid lost sales.
                  </Text>
                  {(alerts?.fastMoversCount || 0) > 10 && (
                    <Button
                      size="xs"
                      variant="secondary"
                      icon={EyeIcon}
                      onClick={handleViewAllFastMovers}
                    >
                      View All {alerts?.fastMoversCount}
                    </Button>
                  )}
                </Flex>

                {alerts?.fastMovers && alerts.fastMovers.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Product</TableHeaderCell>
                        <TableHeaderCell className="text-right">Monthly Revenue</TableHeaderCell>
                        <TableHeaderCell className="text-right">Monthly Units</TableHeaderCell>
                        <TableHeaderCell>Priority</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alerts.fastMovers.map((product, index) => (
                        <TableRow key={product.product}>
                          <TableCell>
                            <Text className="font-medium">
                              {product.product.length > 40
                                ? product.product.slice(0, 40) + '...'
                                : product.product}
                            </Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{formatCurrency(product.monthly_revenue)}</Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{formatNumber(product.monthly_units)}</Text>
                          </TableCell>
                          <TableCell>
                            <Badge color={index < 3 ? 'red' : index < 7 ? 'amber' : 'emerald'}>
                              {index < 3 ? 'Critical' : index < 7 ? 'High' : 'Medium'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No fast movers identified yet
                  </div>
                )}

                <Card className="mt-4 bg-emerald-50 border-emerald-200">
                  <Title className="text-emerald-900">Recommendations</Title>
                  <ul className="mt-2 space-y-1 text-emerald-800 text-sm">
                    <li>✓ Maintain higher safety stock levels for these items</li>
                    <li>✓ Set up automatic reorder alerts</li>
                    <li>✓ Negotiate better supplier terms for volume</li>
                    <li>✓ Consider featuring these in prominent display areas</li>
                  </ul>
                </Card>
              </div>
            </TabPanel>

            {/* Dead Stock Panel */}
            <TabPanel>
              <div className="mt-4">
                <Flex justifyContent="between" alignItems="center" className="mb-4">
                  <Text className="text-gray-600">
                    Products with no sales in 60+ days. Consider clearance or removal.
                  </Text>
                  {(alerts?.deadStockCount || 0) > 0 && (
                    <Flex className="gap-2">
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={EyeIcon}
                        onClick={handleViewAllDeadStock}
                      >
                        View All {alerts?.deadStockCount}
                      </Button>
                      <Button
                        size="xs"
                        variant="primary"
                        icon={ArrowDownTrayIcon}
                        onClick={handleDownloadDeadStock}
                      >
                        Download CSV
                      </Button>
                    </Flex>
                  )}
                </Flex>

                {alerts?.deadStock && alerts.deadStock.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Product</TableHeaderCell>
                        <TableHeaderCell className="text-right">Days Inactive</TableHeaderCell>
                        <TableHeaderCell className="text-right">Historical Revenue</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {alerts.deadStock.map((product) => (
                        <TableRow key={product.product}>
                          <TableCell>
                            <Text className="font-medium">
                              {product.product.length > 40
                                ? product.product.slice(0, 40) + '...'
                                : product.product}
                            </Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{product.days_since_last_sale} days</Text>
                          </TableCell>
                          <TableCell className="text-right">
                            <Text>{formatCurrency(product.revenue)}</Text>
                          </TableCell>
                          <TableCell>
                            <Badge color={product.days_since_last_sale > 90 ? 'red' : 'amber'}>
                              {product.days_since_last_sale > 90 ? 'Critical' : 'Warning'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <ArchiveBoxIcon className="w-8 h-8 text-emerald-600" />
                    </div>
                    <Text className="text-emerald-600 font-medium">
                      No dead stock identified!
                    </Text>
                    <Text className="text-gray-500 mt-1">
                      All products have recent sales activity
                    </Text>
                  </div>
                )}

                {alerts?.deadStock && alerts.deadStock.length > 0 && (
                  <Card className="mt-4 bg-amber-50 border-amber-200">
                    <Title className="text-amber-900">Recommendations</Title>
                    <ul className="mt-2 space-y-1 text-amber-800 text-sm">
                      <li>🏷️ Consider clearance pricing</li>
                      <li>🔄 Return to supplier if possible</li>
                      <li>📦 Bundle with popular items</li>
                      <li>❌ Remove from future orders</li>
                      <li>📊 Analyze why these stopped selling</li>
                    </ul>
                  </Card>
                )}
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>

      {/* Action Items Summary */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <Flex>
          <div>
            <Title className="text-white">Inventory Action Items</Title>
            <div className="mt-4 space-y-2">
              <Flex justifyContent="start" className="gap-2">
                <Badge color="emerald">Priority</Badge>
                <Text className="text-white">
                  Keep {alerts?.fastMoversCount || 0} fast-moving products well stocked
                </Text>
              </Flex>
              {(alerts?.deadStockCount || 0) > 0 && (
                <Flex justifyContent="start" className="gap-2">
                  <Badge color="red">Action</Badge>
                  <Text className="text-white">
                    Review {alerts?.deadStockCount} products with no recent sales
                  </Text>
                </Flex>
              )}
            </div>
          </div>
        </Flex>
      </Card>

      {/* Dead Stock Modal */}
      {showDeadStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-red-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">All Dead Stock Items</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {allDeadStock.length} products with no sales in 60+ days
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  icon={ArrowDownTrayIcon}
                  onClick={handleDownloadDeadStock}
                >
                  Download CSV
                </Button>
                <button
                  onClick={() => setShowDeadStockModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100">
              <TextInput
                icon={MagnifyingGlassIcon}
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[60vh]">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>#</TableHeaderCell>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell className="text-right">Days Inactive</TableHeaderCell>
                      <TableHeaderCell className="text-right">Total Revenue</TableHeaderCell>
                      <TableHeaderCell className="text-right">Units Sold</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDeadStock.map((product, index) => (
                      <TableRow key={product.product}>
                        <TableCell>
                          <Text className="text-gray-400">{index + 1}</Text>
                        </TableCell>
                        <TableCell>
                          <Text className="font-medium">{product.product}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{product.days_since_last_sale} days</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatCurrency(product.revenue)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatNumber(product.units)}</Text>
                        </TableCell>
                        <TableCell>
                          <Badge color={product.days_since_last_sale > 180 ? 'red' : product.days_since_last_sale > 90 ? 'orange' : 'amber'}>
                            {product.days_since_last_sale > 180 ? 'Critical' : product.days_since_last_sale > 90 ? 'High' : 'Warning'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <Text className="text-gray-500">
                Showing {filteredDeadStock.length} of {allDeadStock.length} items
              </Text>
              <Button variant="secondary" onClick={() => setShowDeadStockModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fast Movers Modal */}
      {showFastMoversModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-emerald-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">All Fast Moving Products</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {allFastMovers.length} products in top 10% by sales velocity
                </p>
              </div>
              <button
                onClick={() => setShowFastMoversModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100">
              <TextInput
                icon={MagnifyingGlassIcon}
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[60vh]">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>#</TableHeaderCell>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell className="text-right">Monthly Revenue</TableHeaderCell>
                      <TableHeaderCell className="text-right">Monthly Units</TableHeaderCell>
                      <TableHeaderCell className="text-right">Total Revenue</TableHeaderCell>
                      <TableHeaderCell>Priority</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFastMovers.map((product, index) => (
                      <TableRow key={product.product}>
                        <TableCell>
                          <Text className="text-gray-400">{index + 1}</Text>
                        </TableCell>
                        <TableCell>
                          <Text className="font-medium">{product.product}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatCurrency(product.monthly_revenue)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatNumber(product.monthly_units)}</Text>
                        </TableCell>
                        <TableCell className="text-right">
                          <Text>{formatCurrency(product.revenue)}</Text>
                        </TableCell>
                        <TableCell>
                          <Badge color={index < 10 ? 'red' : index < 30 ? 'amber' : 'emerald'}>
                            {index < 10 ? 'Critical' : index < 30 ? 'High' : 'Medium'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <Text className="text-gray-500">
                Showing {filteredFastMovers.length} of {allFastMovers.length} items
              </Text>
              <Button variant="secondary" onClick={() => setShowFastMoversModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
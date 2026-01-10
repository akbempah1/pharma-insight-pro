import { useState, useEffect } from 'react';
import {
  Card,
  Title,
  Text,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  AreaChart,
  Flex,
  Metric,
  Grid,
} from '@tremor/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  getTopProducts,
  searchProducts,
  getProductDetails,
  TopProduct,
  ProductDetails,
  ProductSearchResult,
} from '../api';
import { formatCurrency, formatNumber } from '../utils';

interface ProductsProps {
  sessionId: string;
}

export default function Products({ sessionId }: ProductsProps) {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!sessionId) return;

      setLoading(true);
      try {
        const data = await getTopProducts(sessionId, 50);
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [sessionId]);

  useEffect(() => {
    const search = async () => {
      if (!sessionId) return;

      const q = searchQuery.trim();
      if (q.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const results = await searchProducts(sessionId, q);
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, sessionId]);

  const handleSelectProduct = async (productName: string) => {
    if (!sessionId) return;

    try {
      const details = await getProductDetails(sessionId, productName);
      setSelectedProduct(details);
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
    } catch (error) {
      console.error('Failed to fetch product details:', error);
    }
  };

  const getCategoryBadge = (category: string): 'red' | 'blue' | 'amber' | 'violet' | 'gray' => {
    const colors: Record<string, 'red' | 'blue' | 'amber' | 'violet' | 'gray'> = {
      acute: 'red',
      chronic: 'blue',
      convenience: 'amber',
      recurring: 'violet',
    };
    return colors[category] || 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const showNoResults =
    sessionId &&
    searchQuery.trim().length >= 2 &&
    hasSearched &&
    !isSearching &&
    searchResults.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Explorer</h1>
        <p className="text-gray-500 mt-1">Analyze individual product performance</p>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={`${result.name}-${idx}`}
                  onClick={() => handleSelectProduct(result.name)}
                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 border-b border-gray-100 last:border-0 flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-gray-900">{result.name}</span>
                  <span className="text-sm text-gray-500">{formatCurrency(result.revenue)}</span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {showNoResults && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
              <Text className="text-gray-500">No products found for “{searchQuery.trim()}”</Text>
            </div>
          )}
        </div>
      </Card>

      {/* Selected Product Details */}
      {selectedProduct && (
        <Card className="animate-fade-in">
          <Flex>
            <div>
              <Text className="text-gray-500">Selected Product</Text>
              <Title className="mt-1">{selectedProduct.name}</Title>
            </div>
            <Badge color={getCategoryBadge(selectedProduct.category)} size="lg">
              {selectedProduct.categoryLabel}
            </Badge>
          </Flex>

          <Grid numItemsSm={2} numItemsLg={4} className="gap-4 mt-6">
            <Card decoration="left" decorationColor="indigo">
              <Text>Total Revenue</Text>
              <Metric>{formatCurrency(selectedProduct.totalRevenue)}</Metric>
            </Card>
            <Card decoration="left" decorationColor="emerald">
              <Text>Units Sold</Text>
              <Metric>{formatNumber(selectedProduct.totalUnits)}</Metric>
            </Card>
            <Card decoration="left" decorationColor="amber">
              <Text>Transactions</Text>
              <Metric>{formatNumber(selectedProduct.totalTransactions)}</Metric>
            </Card>
            <Card decoration="left" decorationColor="violet">
              <Text>Suggested Markup</Text>
              <Metric>{selectedProduct.suggestedMarkup.toFixed(0)}%</Metric>
            </Card>
          </Grid>

          <div className="mt-6">
            <Title>Monthly Trend</Title>

            {/* Prevent Tremor 0x0 container warning */}
            <div className="h-60 min-h-[240px]">
              <AreaChart
                className="h-full mt-4"
                data={selectedProduct.monthlyTrend}
                index="period"
                categories={['revenue']}
                colors={['indigo']}
                valueFormatter={(value) => formatCurrency(value)}
                showLegend={false}
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <Title>Price Sensitivity Analysis</Title>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <Text className="text-gray-500">Avg Qty/Transaction</Text>
                <Text className="text-lg font-semibold mt-1">
                  {selectedProduct.avgQtyPerTransaction.toFixed(1)} units
                </Text>
              </div>
              <div>
                <Text className="text-gray-500">Purchase Pattern</Text>
                <Text className="text-lg font-semibold mt-1">
                  {selectedProduct.avgQtyPerTransaction < 2
                    ? 'Urgent/Impulse'
                    : selectedProduct.avgQtyPerTransaction < 10
                    ? 'Regular'
                    : 'Bulk/Monthly'}
                </Text>
              </div>
              <div>
                <Text className="text-gray-500">Price Sensitivity</Text>
                <Badge
                  color={
                    selectedProduct.avgQtyPerTransaction < 2
                      ? 'emerald'
                      : selectedProduct.avgQtyPerTransaction < 10
                      ? 'amber'
                      : 'red'
                  }
                  size="lg"
                >
                  {selectedProduct.avgQtyPerTransaction < 2
                    ? 'Low'
                    : selectedProduct.avgQtyPerTransaction < 10
                    ? 'Medium'
                    : 'High'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <Title>Top Products by Revenue</Title>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Product</TableHeaderCell>
              <TableHeaderCell className="text-right">Revenue</TableHeaderCell>
              <TableHeaderCell className="text-right">Units</TableHeaderCell>
              <TableHeaderCell className="text-right">Transactions</TableHeaderCell>
              <TableHeaderCell className="text-right">Avg Qty/Txn</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.name}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => handleSelectProduct(product.name)}
              >
                <TableCell>
                  <Text className="font-medium">
                    {product.name.length > 40 ? product.name.slice(0, 40) + '...' : product.name}
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
      </Card>
    </div>
  );
}

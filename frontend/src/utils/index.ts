// Format number as currency
export const formatCurrency = (value: number, symbol = 'GHS'): string => {
  if (value >= 1_000_000) {
    return `${symbol} ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${symbol} ${(value / 1_000).toFixed(1)}K`;
  }
  return `${symbol} ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

// Format number with abbreviation
export const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

// Format percentage
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Format change with arrow
export const formatChange = (value: number): { text: string; isPositive: boolean } => {
  const isPositive = value >= 0;
  const text = `${isPositive ? '+' : ''}${value.toFixed(1)}%`;
  return { text, isPositive };
};

// Get category color
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    acute: '#ef4444',
    chronic: '#3b82f6',
    convenience: '#f59e0b',
    recurring: '#8b5cf6',
  };
  return colors[category] || '#6b7280';
};

// Get ABC class color
export const getABCColor = (className: string): string => {
  const colors: Record<string, string> = {
    A: '#10b981',
    B: '#f59e0b',
    C: '#6b7280',
  };
  return colors[className] || '#6b7280';
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

// Class names helper
export const cn = (...classes: (string | boolean | undefined)[]): string => {
  return classes.filter(Boolean).join(' ');
};

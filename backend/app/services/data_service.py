"""
PharmaInsight Pro - Data Processing Service
Enhanced with date filtering, improved search, and better analytics
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta


# Markup categories configuration
MARKUP_CATEGORIES = {
    "acute": {
        "markup": 0.45,
        "margin": 0.31,
        "label": "I need it NOW",
        "description": "Urgent, one-time purchases",
        "keywords": [
            "coartem", "lonart", "lufart", "lariam", "malar", "artesunate", "amatem",
            "amoksiklav", "augmentin", "zithromax", "zinnat", "cipro", "azithro", "flagyl",
            "doreta", "celebrex", "voltfast", "diclo", "ibuprofen", "paracetamol", "tramadol",
            "postpill", "postinor", "klovinal", "fluconazole",
            "vermox", "zentel", "albendazole",
            "calpol", "wellbaby", "abidec", "bonnisan", "infacol",
            "ventolin", "benylin", "piriton", "strepsils", "tixylix",
        ]
    },
    "chronic": {
        "markup": 0.30,
        "margin": 0.231,
        "label": "I buy EVERY month",
        "description": "Long-term conditions, price sensitive",
        "keywords": [
            "metformin", "galvus", "diamicron", "glimepiride", "insulin", "mixtard", "forxiga",
            "amlodipine", "nifecard", "exforge", "lisinopril", "losartan", "atenolol", "crestor",
            "combigan", "xalatan", "timolol", "blusopt", "bluprost",
            "lyrica", "carbamazepine", "epilim",
            "onetouch", "glucometer", "accu-chek",
            "omeprazole", "nexium", "pantoprazole",
        ]
    },
    "convenience": {
        "markup": 0.40,
        "margin": 0.286,
        "label": "I just grabbed it",
        "description": "Impulse, convenience purchases",
        "keywords": [
            "water", "cola", "malt", "drink", "juice",
            "dove", "nivea", "vaseline", "sure", "rexona",
            "always", "sanitary", "pad",
            "toothpaste", "toothbrush", "mouthwash",
            "cotton", "bandage", "plaster",
            "snack", "biscuit", "cookie",
            "condom", "durex",
        ]
    },
    "recurring": {
        "markup": 0.35,
        "margin": 0.259,
        "label": "I buy this regularly",
        "description": "Regular for a period (baby, pregnancy)",
        "keywords": [
            "aptamil", "nan ", "sma ", "lactogen", "cerelac", "similac",
            "pregnacare", "pregna", "folic acid", "ferrous",
            "cocoon", "diaper", "pampers", "huggies",
            "ensure", "glucerna",
        ]
    }
}


class DataProcessor:
    """Handles all data processing operations"""
    
    def __init__(self):
        self.data: Optional[pd.DataFrame] = None
        self.raw_data: Optional[pd.DataFrame] = None
    
    def load_file(self, file_content: bytes, filename: str) -> Tuple[bool, str, Optional[List[str]]]:
        """Load data from uploaded file"""
        try:
            if filename.endswith('.csv'):
                self.raw_data = pd.read_csv(pd.io.common.BytesIO(file_content))
            elif filename.endswith(('.xlsx', '.xls')):
                self.raw_data = pd.read_excel(pd.io.common.BytesIO(file_content))
            else:
                return False, "Unsupported file format", None
            
            if self.raw_data.empty:
                return False, "File is empty", None
            
            columns = list(self.raw_data.columns)
            return True, f"Loaded {len(self.raw_data):,} rows", columns
            
        except Exception as e:
            return False, f"Error loading file: {str(e)}", None
    
    def detect_columns(self) -> Dict[str, Optional[str]]:
        """Auto-detect column mappings"""
        if self.raw_data is None:
            return {}
        
        mappings = {
            'date': ['date', 'invoice_date', 'sale_date', 'transaction_date'],
            'product': ['product', 'item', 'item_description', 'product_name', 'description'],
            'quantity': ['qty', 'quantity', 'units', 'sold_qty'],
            'price': ['price', 'unit_price', 'selling_price', 'amount'],
            'total': ['total', 'line_total', 'amount', 'revenue'],
            'invoice_id': ['invoice', 'invoice_id', 'transaction_id', 'receipt'],
        }
        
        detected = {}
        for field, patterns in mappings.items():
            detected[field] = None
            for pattern in patterns:
                for col in self.raw_data.columns:
                    if pattern in col.lower():
                        detected[field] = col
                        break
                if detected[field]:
                    break
        
        return detected
    
    def process_data(self, column_mapping: Dict[str, str]) -> Tuple[bool, str]:
        """Process and clean data"""
        try:
            df = self.raw_data.copy()
            
            # Rename columns
            rename_map = {v: k for k, v in column_mapping.items() if v}
            df = df.rename(columns=rename_map)
            
            # Process date
            if 'date' in df.columns:
                df['date'] = pd.to_datetime(df['date'], errors='coerce')
                df = df.dropna(subset=['date'])
                df['year'] = df['date'].dt.year
                df['month'] = df['date'].dt.month
                df['month_year'] = df['date'].dt.to_period('M').astype(str)
                df['day_of_week'] = df['date'].dt.day_name()
                df['week'] = df['date'].dt.isocalendar().week
            
            # Clean product names
            if 'product' in df.columns:
                df['product'] = df['product'].astype(str).str.strip().str.upper()
                df = df[df['product'] != '']
                df = df[df['product'] != 'NAN']
            
            # Process numeric columns
            if 'quantity' in df.columns:
                df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce').fillna(0)
                df = df[df['quantity'] > 0]
            
            if 'price' in df.columns:
                df['price'] = pd.to_numeric(df['price'], errors='coerce').fillna(0)
            
            # Calculate total if not present
            if 'total' not in df.columns and 'quantity' in df.columns and 'price' in df.columns:
                df['total'] = df['quantity'] * df['price']
            elif 'total' in df.columns:
                df['total'] = pd.to_numeric(df['total'], errors='coerce').fillna(0)
            
            # Add behavior category
            df['behavior_category'] = df['product'].apply(self._classify_product)
            
            self.data = df
            return True, f"Processed {len(df):,} transactions"
            
        except Exception as e:
            return False, f"Error processing: {str(e)}"
    
    def _classify_product(self, product_name: str) -> str:
        """Classify product into behavior category"""
        product_lower = product_name.lower()
        
        for category, details in MARKUP_CATEGORIES.items():
            for keyword in details['keywords']:
                if keyword in product_lower:
                    return category
        
        return 'convenience'
    
    def get_data(self) -> Optional[pd.DataFrame]:
        return self.data
    
    def get_date_range(self) -> Dict:
        """Get available date range"""
        if self.data is None:
            return {}
        
        return {
            'min': self.data['date'].min().strftime('%Y-%m-%d'),
            'max': self.data['date'].max().strftime('%Y-%m-%d'),
            'months': sorted(self.data['month_year'].unique().tolist()),
        }


class AnalyticsService:
    """Analytics calculations with date filtering support"""
    
    def __init__(self, data: pd.DataFrame, start_date: str = None, end_date: str = None):
        self.full_data = data
        
        # Apply date filter
        if start_date and end_date:
            start = pd.to_datetime(start_date)
            end = pd.to_datetime(end_date)
            self.data = data[(data['date'] >= start) & (data['date'] <= end)]
        else:
            self.data = data
    
    def get_kpis(self) -> Dict:
        """Calculate KPIs for filtered data"""
        df = self.data
        
        if df.empty:
            return {
                'totalRevenue': 0,
                'totalTransactions': 0,
                'totalUnits': 0,
                'uniqueProducts': 0,
                'avgTransactionValue': 0,
                'avgUnitsPerTransaction': 0,
                'momGrowth': 0,
            }
        
        total_revenue = float(df['total'].sum())
        total_transactions = int(df['invoice_id'].nunique()) if 'invoice_id' in df.columns else len(df)
        total_units = float(df['quantity'].sum())
        unique_products = int(df['product'].nunique())
        
        avg_transaction_value = total_revenue / total_transactions if total_transactions > 0 else 0
        avg_units_per_transaction = total_units / total_transactions if total_transactions > 0 else 0
        
        # Month over month growth
        monthly_revenue = df.groupby('month_year')['total'].sum().sort_index()
        if len(monthly_revenue) >= 2:
            current = monthly_revenue.iloc[-1]
            previous = monthly_revenue.iloc[-2]
            mom_growth = ((current - previous) / previous * 100) if previous > 0 else 0
        else:
            mom_growth = 0
        
        return {
            'totalRevenue': total_revenue,
            'totalTransactions': total_transactions,
            'totalUnits': total_units,
            'uniqueProducts': unique_products,
            'avgTransactionValue': avg_transaction_value,
            'avgUnitsPerTransaction': avg_units_per_transaction,
            'momGrowth': mom_growth,
        }
    
    def get_revenue_trend(self) -> List[Dict]:
        """Get monthly revenue trend with units"""
        df = self.data
        
        if df.empty:
            return []
        
        monthly = df.groupby('month_year').agg({
            'total': 'sum',
            'quantity': 'sum',
            'invoice_id': 'nunique' if 'invoice_id' in df.columns else 'count',
        }).reset_index()
        
        monthly.columns = ['period', 'revenue', 'units', 'transactions']
        monthly = monthly.sort_values('period')
        monthly['growth'] = monthly['revenue'].pct_change() * 100
        
        return monthly.fillna(0).to_dict('records')
    
    def get_top_products(self, n: int = 10) -> List[Dict]:
        """Get top products by revenue"""
        df = self.data
        
        if df.empty:
            return []
        
        products = df.groupby('product').agg({
            'total': 'sum',
            'quantity': 'sum',
            'invoice_id': 'nunique' if 'invoice_id' in df.columns else 'count',
        }).reset_index()
        
        products.columns = ['name', 'revenue', 'units', 'transactions']
        products = products.sort_values('revenue', ascending=False).head(n)
        products['avgQtyPerTxn'] = products['units'] / products['transactions']
        
        return products.to_dict('records')
    
    def get_category_performance(self) -> List[Dict]:
        """Get performance by category"""
        df = self.data
        
        if df.empty:
            return []
        
        category = df.groupby('behavior_category').agg({
            'total': 'sum',
            'quantity': 'sum',
            'product': 'nunique',
        }).reset_index()
        
        category.columns = ['category', 'revenue', 'units', 'products']
        total_revenue = category['revenue'].sum()
        category['percentage'] = (category['revenue'] / total_revenue * 100).round(1)
        
        # Add labels and suggested markup
        category['label'] = category['category'].map({
            'acute': 'I need it NOW',
            'chronic': 'I buy EVERY month',
            'convenience': 'I just grabbed it',
            'recurring': 'I buy this regularly',
        })
        
        category['suggestedMarkup'] = category['category'].map({
            'acute': 45,
            'chronic': 30,
            'convenience': 40,
            'recurring': 35,
        })
        
        return category.sort_values('revenue', ascending=False).to_dict('records')
    
    def get_abc_analysis(self) -> Dict:
        """Perform ABC analysis"""
        df = self.data
        
        if df.empty:
            return {'summary': [], 'details': []}
        
        products = df.groupby('product').agg({
            'total': 'sum',
            'quantity': 'sum',
        }).reset_index()
        
        products.columns = ['product', 'revenue', 'units']
        products = products.sort_values('revenue', ascending=False)
        
        total_revenue = products['revenue'].sum()
        products['cumulative_pct'] = (products['revenue'].cumsum() / total_revenue)
        
        products['class'] = products['cumulative_pct'].apply(
            lambda x: 'A' if x <= 0.8 else ('B' if x <= 0.95 else 'C')
        )
        
        summary = products.groupby('class').agg({
            'product': 'count',
            'revenue': 'sum',
        }).reset_index()
        
        summary.columns = ['class', 'count', 'revenue']
        summary['percentage'] = (summary['revenue'] / total_revenue * 100).round(1)
        
        return {
            'summary': summary.to_dict('records'),
            'details': products.head(100).to_dict('records'),
        }
    
    def get_day_of_week_analysis(self) -> List[Dict]:
        """Analyze sales by day of week"""
        df = self.data
        
        if df.empty:
            return []
        
        dow = df.groupby('day_of_week').agg({
            'total': 'sum',
            'quantity': 'sum',
        }).reset_index()
        
        dow.columns = ['day', 'revenue', 'units']
        
        # Order days
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        dow['day'] = pd.Categorical(dow['day'], categories=day_order, ordered=True)
        dow = dow.sort_values('day')
        
        return dow.to_dict('records')
    
    def get_product_details(self, product_name: str) -> Dict:
        """Get detailed analysis for a product"""
        df = self.data
        product_df = df[df['product'] == product_name]
        
        if product_df.empty:
            return None
        
        # Monthly trend
        monthly = product_df.groupby('month_year').agg({
            'total': 'sum',
            'quantity': 'sum',
            'invoice_id': 'nunique' if 'invoice_id' in product_df.columns else 'count',
        }).reset_index()
        
        monthly.columns = ['period', 'revenue', 'units', 'transactions']
        monthly = monthly.sort_values('period')
        
        # Basic stats
        total_revenue = float(product_df['total'].sum())
        total_units = float(product_df['quantity'].sum())
        total_txns = int(product_df['invoice_id'].nunique()) if 'invoice_id' in product_df.columns else len(product_df)
        avg_qty = total_units / total_txns if total_txns > 0 else 0
        
        # Category
        category = product_df['behavior_category'].iloc[0]
        
        return {
            'name': product_name,
            'totalRevenue': total_revenue,
            'totalUnits': total_units,
            'totalTransactions': total_txns,
            'avgQtyPerTransaction': avg_qty,
            'category': category,
            'categoryLabel': MARKUP_CATEGORIES.get(category, {}).get('label', 'Unknown'),
            'suggestedMarkup': MARKUP_CATEGORIES.get(category, {}).get('markup', 0.35) * 100,
            'monthlyTrend': monthly.to_dict('records'),
        }
    
    def search_products(self, query: str, limit: int = 20) -> List[Dict]:
        """Search products by name - improved with fuzzy matching"""
        products = self.full_data['product'].unique()
        query_upper = query.upper().strip()
        
        # Exact matches first
        exact_matches = [p for p in products if query_upper in p]
        
        # If no exact matches, try partial matching
        if not exact_matches:
            # Split query into parts and match any
            query_parts = query_upper.split()
            partial_matches = []
            for p in products:
                if any(part in p for part in query_parts):
                    partial_matches.append(p)
            matches = partial_matches
        else:
            matches = exact_matches
        
        # Get revenue for each product for sorting
        product_revenue = self.full_data.groupby('product')['total'].sum()
        
        results = []
        for p in sorted(matches, key=lambda x: product_revenue.get(x, 0), reverse=True)[:limit]:
            results.append({
                'name': p,
                'revenue': float(product_revenue.get(p, 0)),
            })
        
        return results
    
    def compare_products(self, products: List[str]) -> Dict:
        """Compare multiple products"""
        df = self.data
        
        results = []
        for product in products:
            product_df = df[df['product'] == product]
            if product_df.empty:
                continue
            
            monthly = product_df.groupby('month_year').agg({
                'total': 'sum',
                'quantity': 'sum',
            }).reset_index()
            monthly.columns = ['period', 'revenue', 'units']
            
            results.append({
                'name': product,
                'totalRevenue': float(product_df['total'].sum()),
                'totalUnits': float(product_df['quantity'].sum()),
                'avgQtyPerTxn': float(product_df['quantity'].sum() / product_df['invoice_id'].nunique() if 'invoice_id' in product_df.columns else len(product_df)),
                'monthlyTrend': monthly.to_dict('records'),
            })
        
        return {'products': results}
    
    def get_inventory_alerts(self) -> Dict:
        """Get inventory alerts"""
        df = self.data
        
        if df.empty:
            return {
                'fastMovers': [],
                'deadStock': [],
                'fastMoversCount': 0,
                'deadStockCount': 0,
            }
        
        # Calculate velocity
        date_range = (df['date'].max() - df['date'].min()).days
        months = max(date_range / 30, 1)
        
        velocity = df.groupby('product').agg({
            'total': 'sum',
            'quantity': 'sum',
            'date': ['min', 'max'],
        })
        
        velocity.columns = ['revenue', 'units', 'first_sale', 'last_sale']
        velocity = velocity.reset_index()
        
        velocity['monthly_revenue'] = velocity['revenue'] / months
        velocity['monthly_units'] = velocity['units'] / months
        velocity['days_since_last_sale'] = (df['date'].max() - velocity['last_sale']).dt.days
        
        # Fast movers (top 10%)
        threshold = velocity['monthly_revenue'].quantile(0.9)
        fast_movers = velocity[velocity['monthly_revenue'] >= threshold].head(10)
        
        # Dead stock (60+ days)
        dead_stock = velocity[velocity['days_since_last_sale'] >= 60].sort_values('days_since_last_sale', ascending=False).head(10)
        
        return {
            'fastMovers': fast_movers[['product', 'monthly_revenue', 'monthly_units']].to_dict('records'),
            'deadStock': dead_stock[['product', 'days_since_last_sale', 'revenue']].to_dict('records'),
            'fastMoversCount': len(velocity[velocity['monthly_revenue'] >= threshold]),
            'deadStockCount': len(velocity[velocity['days_since_last_sale'] >= 60]),
        }
    
    def get_reorder_suggestions(self, forecast_months: int = 1) -> List[Dict]:
        """Get reorder suggestions based on velocity and forecast"""
        df = self.data
        
        if df.empty:
            return []
        
        # Calculate monthly velocity for each product
        date_range = (df['date'].max() - df['date'].min()).days
        months = max(date_range / 30, 1)
        
        velocity = df.groupby('product').agg({
            'quantity': 'sum',
            'total': 'sum',
        }).reset_index()
        
        velocity['monthly_units'] = velocity['quantity'] / months
        velocity['monthly_revenue'] = velocity['total'] / months
        
        # Get category for each product
        product_categories = df.groupby('product')['behavior_category'].first()
        velocity['category'] = velocity['product'].map(product_categories)
        
        # Calculate suggested reorder quantity (monthly units * forecast months * 1.2 safety factor)
        velocity['suggested_reorder'] = (velocity['monthly_units'] * forecast_months * 1.2).round(0)
        
        # Sort by revenue (most important first)
        velocity = velocity.sort_values('monthly_revenue', ascending=False)
        
        # Top 50 products
        top_products = velocity.head(50)
        
        return top_products[['product', 'monthly_units', 'monthly_revenue', 'category', 'suggested_reorder']].to_dict('records')
    
    def get_seasonality_analysis(self) -> Dict:
        """Analyze seasonality patterns"""
        df = self.data
        
        if df.empty or len(df['month_year'].unique()) < 3:
            return {'hasSeasonality': False, 'patterns': []}
        
        # Monthly totals
        monthly = df.groupby('month').agg({
            'total': 'sum',
            'quantity': 'sum',
        }).reset_index()
        
        monthly.columns = ['month', 'revenue', 'units']
        overall_avg = monthly['revenue'].mean()
        
        # Calculate seasonal indices
        monthly['index'] = (monthly['revenue'] / overall_avg * 100).round(1)
        monthly['month_name'] = monthly['month'].map({
            1: 'January', 2: 'February', 3: 'March', 4: 'April',
            5: 'May', 6: 'June', 7: 'July', 8: 'August',
            9: 'September', 10: 'October', 11: 'November', 12: 'December'
        })
        
        # Determine peak and low seasons
        peak_month = monthly.loc[monthly['index'].idxmax()]
        low_month = monthly.loc[monthly['index'].idxmin()]
        
        return {
            'hasSeasonality': True,
            'patterns': monthly[['month_name', 'revenue', 'index']].to_dict('records'),
            'peakMonth': peak_month['month_name'],
            'peakIndex': float(peak_month['index']),
            'lowMonth': low_month['month_name'],
            'lowIndex': float(low_month['index']),
        }
    
    def generate_preliminary_analysis(self) -> Dict:
        """Generate preliminary analysis summary for AI module"""
        df = self.data
        
        if df.empty:
            return {'error': 'No data available'}
        
        # Basic stats
        total_revenue = df['total'].sum()
        total_transactions = df['invoice_id'].nunique() if 'invoice_id' in df.columns else len(df)
        unique_products = df['product'].nunique()
        date_range_days = (df['date'].max() - df['date'].min()).days
        
        # Monthly trend
        monthly = df.groupby('month_year')['total'].sum().sort_index()
        
        # Identify trends
        if len(monthly) >= 2:
            recent_growth = ((monthly.iloc[-1] - monthly.iloc[-2]) / monthly.iloc[-2] * 100) if monthly.iloc[-2] > 0 else 0
            overall_trend = 'growing' if monthly.iloc[-1] > monthly.iloc[0] else 'declining'
        else:
            recent_growth = 0
            overall_trend = 'stable'
        
        # Top products
        top_products = df.groupby('product')['total'].sum().nlargest(10).to_dict()
        
        # Category breakdown
        category_revenue = df.groupby('behavior_category')['total'].sum().to_dict()
        
        # ABC summary
        products_by_revenue = df.groupby('product')['total'].sum().sort_values(ascending=False)
        cumsum = products_by_revenue.cumsum() / products_by_revenue.sum()
        class_a_count = (cumsum <= 0.8).sum()
        class_b_count = ((cumsum > 0.8) & (cumsum <= 0.95)).sum()
        class_c_count = (cumsum > 0.95).sum()
        
        # Dead stock
        last_sale = df.groupby('product')['date'].max()
        days_since_sale = (df['date'].max() - last_sale).dt.days
        dead_stock_count = (days_since_sale >= 60).sum()
        
        # Issues identified
        issues = []
        if recent_growth < -10:
            issues.append(f"Revenue declined by {abs(recent_growth):.1f}% last month - needs attention")
        if dead_stock_count > 50:
            issues.append(f"{dead_stock_count} products haven't sold in 60+ days - review for clearance")
        if class_c_count > unique_products * 0.5:
            issues.append(f"Over 50% of products are Class C (low revenue) - consider SKU rationalization")
        
        # Recommendations
        recommendations = []
        recommendations.append(f"Focus on your top {class_a_count} products (Class A) - they drive 80% of revenue")
        if dead_stock_count > 0:
            recommendations.append(f"Review {dead_stock_count} dead stock items for clearance or return")
        
        return {
            'summary': {
                'totalRevenue': total_revenue,
                'totalTransactions': total_transactions,
                'uniqueProducts': unique_products,
                'periodDays': date_range_days,
                'recentGrowth': recent_growth,
                'overallTrend': overall_trend,
            },
            'topProducts': top_products,
            'categoryBreakdown': category_revenue,
            'abcSummary': {
                'classA': class_a_count,
                'classB': class_b_count,
                'classC': class_c_count,
            },
            'deadStockCount': dead_stock_count,
            'issues': issues,
            'recommendations': recommendations,
        }


# Global data store (in production, use Redis or database)
data_store: Dict[str, DataProcessor] = {}

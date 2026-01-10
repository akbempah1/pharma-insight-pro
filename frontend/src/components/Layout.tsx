import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  CubeIcon,
  ChartPieIcon,
  ArchiveBoxIcon,
  ArrowLeftOnRectangleIcon,
  DocumentChartBarIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../utils';

interface LayoutProps {
  sessionId: string;
  onReset: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartBarIcon },
  { name: 'Products', href: '/products', icon: CubeIcon },
  { name: 'Forecasting', href: '/forecasting', icon: ChartPieIcon },
  { name: 'Inventory', href: '/inventory', icon: ArchiveBoxIcon },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  { name: 'AI Intelligence', href: '/intelligence', icon: SparklesIcon },
];

export default function Layout({ onReset }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <span className="text-white text-lg">💊</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">PharmaInsight</h1>
            <p className="text-xs text-gray-500">Pharmacy Intelligence</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Analytics
          </p>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-teal-50 text-teal-700 border-l-4 border-teal-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('w-5 h-5', isActive ? 'text-teal-600' : 'text-gray-400')} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={onReset}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 text-gray-400" />
            Load New Data
          </button>
          
          <div className="mt-4 px-4 py-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-100">
            <p className="text-xs font-semibold text-teal-800">PharmaInsight Pro</p>
            <p className="text-xs text-teal-600 mt-1">Built for pharmacy excellence</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64">
        <div className="p-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  CubeIcon,
  ChartPieIcon,
  ArchiveBoxIcon,
  ArrowLeftOnRectangleIcon,
  DocumentChartBarIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../utils';
import { getUser, logout } from '../api/auth';

interface LayoutProps {
  sessionId: string;
  onReset: () => void;
  onLogout?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: ChartBarIcon },
  { name: 'Products', href: '/products', icon: CubeIcon },
  { name: 'Forecasting', href: '/forecasting', icon: ChartPieIcon },
  { name: 'Inventory', href: '/inventory', icon: ArchiveBoxIcon },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon },
  { name: 'AI Intelligence', href: '/intelligence', icon: SparklesIcon },
];

export default function Layout({ onReset, onLogout }: LayoutProps) {
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    if (onLogout) onLogout();
    logout();
  };

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
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-gray-50 rounded-lg">
              <UserCircleIcon className="w-8 h-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.pharmacy_name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              {user.is_premium && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  Pro
                </span>
              )}
            </div>
          )}

          <button
            onClick={onReset}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 text-gray-400" />
            Load New Data
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all mt-1"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-400" />
            Logout
          </button>

          <div className="mt-4 px-4 py-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-100">
            <p className="text-xs font-semibold text-teal-800">Aduru Analytics</p>
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
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Calendar, BarChart3, ShieldCheck, Moon, Sun,
  LogOut, Menu, X, Pill, Clock, FileText, UserCheck, Settings,
  AlertTriangle, Sparkles, HeartHandshake
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isDemo, logout, darkMode, toggleDarkMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Activity },
    { name: 'Journal', path: '/journal', icon: Sparkles },
    { name: 'Timeline', path: '/timeline', icon: Clock },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Data Quality', path: '/data-quality', icon: ShieldCheck },
    { name: 'Cycles', path: '/cycles', icon: Calendar },
    { name: 'Medications', path: '/medications', icon: Pill },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Appointments', path: '/appointments', icon: UserCheck },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const showAuthNav = isAuthenticated && !(isDemo && location.pathname === '/');

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Top Demo Banner only when inside demo exploration and not on landing page */}
      {isDemo && location.pathname !== '/' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-300">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wider bg-amber-200 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-[10px]">
                Demo Mode
              </span>
              <span>
                You are exploring a read-only demo account with 90 days of synthetic demonstration data.
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 transition cursor-pointer"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <Link to={showAuthNav ? "/dashboard" : "/"} className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-brand-700 via-brand-600 to-plum-600 dark:from-brand-300 dark:to-plum-300 bg-clip-text text-transparent">
                  SignalBridge
                </span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline -mt-1">
                  Evidence-First Health Journal
                </span>
              </div>
            </Link>

            {/* Non-diagnostic badge */}
            <span className="hidden md:inline-flex items-center gap-1 ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Non-Diagnostic
            </span>
          </div>

          {/* Desktop Navigation Links */}
          {showAuthNav ? (
            <nav className="hidden lg:flex items-center space-x-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
              >
                Create Account
              </Link>
            </div>
          )}

          {/* Right utility items */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDarkMode();
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Toggle dark mode"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
            </button>

            {isAuthenticated && (
              <>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 transition font-medium"
                    title="System Administration"
                  >
                    Admin
                  </Link>
                )}

                <Link
                  to="/settings"
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Settings & Privacy"
                  aria-label="Settings and Privacy"
                >
                  <Settings className="w-4 h-4" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1 p-2 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {showAuthNav ? (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Logged in as {user?.full_name}
              </div>
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      active
                        ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Settings className="w-4 h-4" />
                  Settings & Privacy
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-purple-600 dark:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Theme</span>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
                  <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-medium rounded-lg bg-brand-600 text-white"
              >
                Create Account
              </Link>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Theme</span>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
                  <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { api } from '../api/client';
import { LANGUAGE_FLAGS, LANGUAGE_LABELS } from '@dls/shared';
import type { Language } from '@dls/shared';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/missions', label: 'Missions', icon: '🎯' },
  { path: '/mistakes', label: 'Mistakes', icon: '📝' },
  { path: '/conversations', label: 'History', icon: '💬' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingLang, setSwitchingLang] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const switchLanguage = async (lang: Language) => {
    if (lang === user?.activeLanguage || switchingLang) return;
    setSwitchingLang(true);
    try {
      await api.patch('/auth/language', { language: lang });
      await refreshUser();
      window.location.reload();
    } catch {
      // ignore
    } finally {
      setSwitchingLang(false);
    }
  };

  // Initialize dark mode
  useState(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  });

  const currentLang = user?.activeLanguage || 'da';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-danish-dark text-gray-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-danish-dark/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">{currentLang === 'es' ? '🇪🇸' : '🇩🇰'}</span>
              <span className="font-display font-bold text-lg text-gray-900 dark:text-white">
                {currentLang === 'es' ? 'Spanish Life' : 'Danish Life'}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-danish-red/10 text-danish-red dark:bg-danish-red/20 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {/* Language switcher */}
              {user && (
                <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {(['da', 'es'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => switchLanguage(lang)}
                      disabled={switchingLang}
                      className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                        currentLang === lang
                          ? 'bg-danish-red text-white'
                          : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                    </button>
                  ))}
                </div>
              )}

              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {user && (
                <button
                  onClick={logout}
                  className="hidden md:flex btn-ghost text-sm"
                >
                  Log out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-danish-card">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-danish-red/10 text-danish-red'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full"
              >
                <span>🚪</span>
                Log out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}

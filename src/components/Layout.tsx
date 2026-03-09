import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">{t('appTitle')}</h1>

        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
            className="glass rounded-lg px-3 py-1.5 text-sm font-medium
                       hover:opacity-80 transition-opacity cursor-pointer"
          >
            {language === 'en' ? 'PT' : 'EN'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="glass rounded-lg px-3 py-1.5 text-sm
                       hover:opacity-80 transition-opacity cursor-pointer"
            aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
          >
            {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>

          {/* User menu */}
          {user && (
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm opacity-70">{user.display_name}</span>
              <button
                onClick={logout}
                className="glass rounded-lg px-3 py-1.5 text-sm font-medium
                           hover:opacity-80 transition-opacity cursor-pointer"
              >
                {t('logout')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

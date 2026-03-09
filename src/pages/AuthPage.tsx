import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/useI18n';
import { useTheme } from '../hooks/useTheme';
import GlassCard from '../components/GlassCard';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      navigate('/');
    } catch {
      setError(t('authError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-blobs min-h-screen flex items-center justify-center px-4">
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
          className="glass rounded-lg px-3 py-1.5 text-sm font-medium
                     hover:opacity-80 transition-opacity cursor-pointer"
        >
          {language === 'en' ? 'PT' : 'EN'}
        </button>
        <button
          onClick={toggleTheme}
          className="glass rounded-lg px-3 py-1.5 text-sm
                     hover:opacity-80 transition-opacity cursor-pointer"
          aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
        >
          {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
        </button>
      </div>

      {/* Auth card */}
      <GlassCard
        variant="strong"
        className="relative z-[1] w-full max-w-md p-8"
      >
        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-1">
          {t('appTitle')}
        </h1>
        <h2 className="text-lg text-center mb-6 opacity-60">
          {mode === 'login' ? t('loginTitle') : t('registerTitle')}
        </h2>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/30 px-4 py-2 text-sm text-red-300 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium mb-1 opacity-80"
              >
                {t('displayName')}
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="glass w-full rounded-lg px-4 py-2.5 text-sm
                           outline-none placeholder:opacity-40
                           focus:ring-2 focus:ring-violet-500/50 transition"
                placeholder={t('displayName')}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1 opacity-80"
            >
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass w-full rounded-lg px-4 py-2.5 text-sm
                         outline-none placeholder:opacity-40
                         focus:ring-2 focus:ring-violet-500/50 transition"
              placeholder={t('email')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1 opacity-80"
            >
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="glass w-full rounded-lg px-4 py-2.5 text-sm
                         outline-none placeholder:opacity-40
                         focus:ring-2 focus:ring-violet-500/50 transition"
              placeholder={t('password')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       px-4 py-2.5 text-sm font-semibold text-white
                       transition cursor-pointer"
          >
            {isSubmitting
              ? t('loading')
              : mode === 'login'
                ? t('loginSubmit')
                : t('registerSubmit')}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="mt-6 text-center text-sm opacity-60">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="hover:underline hover:opacity-100 transition-opacity cursor-pointer"
          >
            {mode === 'login' ? t('switchToRegister') : t('switchToLogin')}
          </button>
        </p>
      </GlassCard>
    </div>
  );
}

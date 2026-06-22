import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Language } from '@dls/shared';

const TEXT: Record<string, Record<string, string>> = {
  title: { da: 'Danish Life Simulator', es: 'Spanish Life Simulator' },
  subtitle: { da: 'Begynd dit danske læringseventyr', es: 'Comienza tu aventura de aprendizaje de español' },
  create: { da: 'Opret konto', es: 'Crear cuenta' },
  name: { da: 'Dit navn', es: 'Tu nombre' },
  email: { da: 'Email', es: 'Correo electrónico' },
  password: { da: 'Adgangskode', es: 'Contraseña' },
  namePlaceholder: { da: 'Jane Hansen', es: 'María García' },
  emailPlaceholder: { da: 'dig@eksempel.dk', es: 'tu@ejemplo.com' },
  passwordHint: { da: 'Mindst 8 tegn', es: 'Mínimo 8 caracteres' },
  creating: { da: 'Opretter konto...', es: 'Creando cuenta...' },
  hasAccount: { da: 'Har du allerede en konto?', es: '¿Ya tienes una cuenta?' },
  logIn: { da: 'Log ind', es: 'Iniciar sesión' },
  start: { da: 'Start på', es: 'Empezar en' },
  flag: { da: '🇩🇰', es: '🇪🇸' },
  langLabel: { da: 'Dansk', es: 'Español' },
};

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('preferredLang') as Language) || 'da');
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('preferredLang', lang);
  }, [lang]);

  const t = (key: string) => TEXT[key]?.[lang] || key;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, lang);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-danish-red/5 via-white to-danish-accent/10 dark:from-danish-dark dark:via-danish-card dark:to-danish-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {(['da', 'es'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  lang === l
                    ? 'bg-danish-red text-white'
                    : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {TEXT.flag[l]} {TEXT.langLabel[l]}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <span className="text-6xl block mb-4 animate-float">{lang === 'es' ? '🇪🇸' : '🇩🇰'}</span>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{t('subtitle')}</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">{t('create')}</h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={t('namePlaceholder')} required />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('email')}</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder={t('emailPlaceholder')} required />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder={t('passwordHint')} required minLength={8} />
            </div>
            <div className="text-xs text-gray-400 text-center">
              {t('start')}: <strong>{lang === 'es' ? 'Español (A1)' : 'Dansk (A1)'}</strong>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('creating') : t('create')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('hasAccount')}{' '}
            <Link to="/login" className="text-danish-red hover:text-red-700 font-medium">{t('logIn')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, 'da');
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
        <div className="text-center mb-8">
          <span className="text-6xl block mb-4 animate-float">🇩🇰</span>
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Danish Life Simulator</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Begynd dit danske læringseventyr</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Opret konto</h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dit navn</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Jane Hansen" required />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="dig@eksempel.dk" required />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adgangskode</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Mindst 8 tegn" required minLength={8} />
            </div>
            <div className="text-xs text-gray-400 text-center">
              Start på: <strong>Dansk (A1)</strong>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Opretter konto...' : 'Opret konto'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Har du allerede en konto?{' '}
            <Link to="/login" className="text-danish-red hover:text-red-700 font-medium">Log ind</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getActiveLevel, type CEFRLevel, CEFR_LEVELS } from '@dls/shared';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) return null;

  const activeLevel = getActiveLevel(user, user.activeLanguage);

  async function handleOverrideLevel(level: CEFRLevel) {
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/auth/level', { level });
      await refreshUser();
      setMessage(`Level set to ${level}`);
    } catch {
      setMessage('Failed to update level');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile 👤</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your learning profile
        </p>
      </div>

      {/* User info */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-danish-red/10 flex items-center justify-center text-2xl font-bold text-danish-red">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-gray-500 dark:text-gray-400">Active Level</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">{activeLevel}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-gray-500 dark:text-gray-400">Language</p>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">{user.activeLanguage === 'es' ? 'Español' : 'Dansk'}</p>
          </div>
        </div>
      </div>

      {/* Set Level */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Choose Your Level</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          You start at A1. You can freely set a different level — this determines which missions you see.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CEFR_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => handleOverrideLevel(level)}
              disabled={saving}
              className={`btn text-sm ${
                activeLevel === level
                  ? 'bg-danish-red text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Missions are completed in order within each level. Finish all missions at your current level to auto-advance to the next.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-xl text-sm">
          {message}
        </div>
      )}
    </div>
  );
}

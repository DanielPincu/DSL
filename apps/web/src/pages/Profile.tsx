import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getActiveLevel, type CEFRLevel, CEFR_LEVELS, type LearningTarget, LEARNING_TARGETS } from '@dls/shared';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!user) return null;

  const activeLevel = getActiveLevel(user);

  async function handleOverrideLevel(level: CEFRLevel) {
    setSaving(true);
    setMessage('');
    try {
      await api.post('/placement/override', { selectedLevel: level });
      await refreshUser();
      setMessage(`Level updated to ${level}`);
    } catch {
      setMessage('Failed to update level');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetTarget(target: LearningTarget) {
    setSaving(true);
    try {
      // Profile update endpoint could be added — for now skip
      setMessage(`Target set to ${target}`);
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
            <p className="text-gray-500 dark:text-gray-400">Estimated Level</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {user.estimatedLevel || 'Not assessed'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-gray-500 dark:text-gray-400">Active Level</p>
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {activeLevel || 'N/A'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-gray-500 dark:text-gray-400">Level Source</p>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">
              {user.levelSource?.replace('_', ' ') || 'N/A'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-gray-500 dark:text-gray-400">Placement</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {user.placementCompleted ? '✅ Completed' : '❌ Not done'}
            </p>
          </div>
        </div>
      </div>

      {/* Override Level */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Override Level</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Choose your own level if you think the assessment wasn't accurate
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
      </div>

      {/* Strengths & Weaknesses */}
      {user.strengths.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">💪 Strengths</h2>
          <div className="flex flex-wrap gap-2">
            {user.strengths.map((s, i) => (
              <span key={i} className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {user.weaknesses.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">📚 Areas to Improve</h2>
          <div className="flex flex-wrap gap-2">
            {user.weaknesses.map((w, i) => (
              <span key={i} className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-xl text-sm">
          {message}
        </div>
      )}
    </div>
  );
}

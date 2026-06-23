import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getActiveLevel, type CEFRLevel, CEFR_LEVELS } from '../types';

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Reset state
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Delete account state
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const activeLevel = getActiveLevel(user, user.activeLanguage);

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage(text);
    setMessageType(type);
  }

  async function handleOverrideLevel(level: CEFRLevel) {
    setSaving(true);
    showMsg('');
    try {
      await api.patch('/auth/level', { level });
      await refreshUser();
      showMsg(`Level set to ${level}`);
    } catch {
      showMsg('Failed to update level', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!resetPassword) return;
    setResetting(true);
    showMsg('');
    try {
      await api.post('/auth/reset', { password: resetPassword });
      await refreshUser();
      setShowReset(false);
      setResetPassword('');
      showMsg('Profile has been reset to A1! All progress cleared.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset profile';
      showMsg(msg, 'error');
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!deletePassword) return;
    setDeleting(true);
    showMsg('');
    try {
      await api.post('/auth/delete-account', { password: deletePassword });
      logout();
      navigate('/login');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      showMsg(msg, 'error');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
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
            <p className="font-semibold text-gray-900 dark:text-white capitalize">Dansk</p>
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

      {/* Danger Zone */}
      <div className="card border-2 border-red-200 dark:border-red-900/50 space-y-6">
        <h2 className="font-semibold text-red-600 dark:text-red-400">⚠️ Danger Zone</h2>

        {/* Reset Profile */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Reset Profile</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Reset to A1 and delete all conversations, attempts, and mistakes. Your account stays.
          </p>

          {!showReset ? (
            <button
              onClick={() => setShowReset(true)}
              className="btn bg-red-600 text-white hover:bg-red-700"
            >
              Reset Profile
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Enter your password to confirm reset:
              </p>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Your password"
                className="input"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={!resetPassword || resetting}
                  className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
                <button
                  onClick={() => { setShowReset(false); setResetPassword(''); }}
                  disabled={resetting}
                  className="btn bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Delete Account */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-1">Delete Account</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="btn bg-red-600 text-white hover:bg-red-700"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Enter your password to confirm deletion:
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                className="input"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={!deletePassword || deleting}
                  className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDeletePassword(''); }}
                  disabled={deleting}
                  className="btn bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm ${
          messageType === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}

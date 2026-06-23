import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { DashboardData } from '../types';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />;
  if (!data) return <p className="text-center text-gray-500">Failed to load dashboard.</p>;

  const levelColor = data.activeLevel
    ? { A1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        A2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        B1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        B2: 'bg-danish-accent/20 text-yellow-800 dark:text-yellow-200',
        C1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }[data.activeLevel]
    : '';

  return (
    <div className="space-y-6">
      {/* Welcome + Level */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hej, {user?.name}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Ready to practice Danish today?
          </p>
        </div>
        {data.activeLevel && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${levelColor}`}>
            <span className="text-lg font-bold">{data.activeLevel}</span>
            <span className="text-xs opacity-75">
              {data.levelSource === 'assessment' ? 'Assessed' : 'Selected'}
            </span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Missions Done', value: data.completedMissions, icon: '✅', color: 'border-l-green-500' },
          { label: 'Conversations', value: data.conversationsCount, icon: '💬', color: 'border-l-blue-500' },
          { label: 'Mistakes Saved', value: data.savedMistakes, icon: '📝', color: 'border-l-orange-500' },
          { label: 'Day Streak', value: data.currentStreak, icon: '🔥', color: 'border-l-red-500' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`card border-l-4 ${stat.color}`}
          >
            <span className="text-2xl">{stat.icon}</span>
            <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Level progress */}
      {data.levelProgress && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {data.levelProgress.level} Progress
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {data.levelProgress.completed}/{data.levelProgress.total} missions
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${data.levelProgress.total > 0 ? (data.levelProgress.completed / data.levelProgress.total) * 100 : 0}%` }}
            />
          </div>
          {data.levelProgress.allDone && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              🎉 All {data.levelProgress.level} missions complete! Start any mission and say "farvel" to advance.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths & Weaknesses */}
        <div className="space-y-4">
          {data.strengths.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">💪 Strengths</h3>
              <div className="flex flex-wrap gap-2">
                {data.strengths.map((s, i) => (
                  <span key={i} className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.weaknesses.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📚 Areas to Improve</h3>
              <div className="flex flex-wrap gap-2">
                {data.weaknesses.map((w, i) => (
                  <span key={i} className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.weakestCategories.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🎯 Weakest Categories</h3>
              <div className="space-y-2">
                {data.weakestCategories.map((wc) => (
                  <div key={wc.category} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 capitalize">{wc.category}</span>
                    <span className="font-medium text-danish-red">{wc.count} mistakes</span>
                  </div>
                ))}
              </div>
              <Link to="/mistakes" className="mt-3 inline-block text-sm text-danish-red hover:text-red-700 font-medium">
                View all mistakes →
              </Link>
            </div>
          )}
        </div>

        {/* Suggested Mission + Recent Activity */}
        <div className="space-y-4">
          {data.suggestedMission && (
            <div className="card bg-gradient-to-br from-danish-red/5 to-danish-accent/10 dark:from-danish-red/10 dark:to-danish-accent/5 border-danish-red/20">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{data.suggestedMissionConversationId ? '💬' : '🎯'}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-danish-red uppercase tracking-wide">
                    {data.suggestedMissionConversationId ? 'Continue Conversation' : 'Suggested Mission'}
                  </p>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mt-1">
                    {data.suggestedMission.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {data.suggestedMission.description}
                  </p>
                  {data.suggestedMissionConversationId ? (
                    <Link
                      to={`/missions/${data.suggestedMission.slug}/conversation/${data.suggestedMissionConversationId}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-danish-red hover:text-red-700"
                    >
                      Continue →
                    </Link>
                  ) : (
                    <Link
                      to={`/missions/${data.suggestedMission.slug}`}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-danish-red hover:text-red-700"
                    >
                      Start mission →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {data.recentActivity.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📋 Recent Activity</h3>
              <div className="space-y-3">
                {data.recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-lg">💬</span>
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">{a.description}</p>
                      <p className="text-xs text-gray-400">{new Date(a.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/conversations" className="mt-3 inline-block text-sm text-danish-red hover:text-red-700 font-medium">
                View all activity →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick action: Start a mission */}
      <div className="text-center py-4">
        <Link to="/missions" className="btn-primary px-8">
          Browse Missions
        </Link>
      </div>

      {/* Pipeline test */}
      <div className="text-center pb-4">
        <TestButton />
      </div>
    </div>
  );
}

function TestButton() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    setResult(null);
    try {
      const data = await api.get<{ message: string }>('/test');
      setResult(data.message);
    } catch {
      setResult('Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleTest}
        disabled={loading}
        className="btn bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
      >
        {loading ? 'Testing...' : 'Test Pipeline'}
      </button>
      {result && (
        <span className="ml-3 text-sm font-semibold text-green-600 dark:text-green-400">
          {result}
        </span>
      )}
    </div>
  );
}

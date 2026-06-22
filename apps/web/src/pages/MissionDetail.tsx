import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Mission } from '@dls/shared';
import { useAuth } from '../context/AuthContext';
import { getActiveLevel } from '@dls/shared';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORY_ICONS: Record<string, string> = {
  health: '🏥', housing: '🏠', shopping: '🛒', work: '💼',
  social: '🤝', technology: '📱', education: '📚',
  government: '🏛️', finance: '💰', citizenship: '🎫',
};

export default function MissionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    api.get<Mission>(`/missions/${slug}`)
      .then(setMission)
      .catch((err) => {
        setError(err.message);
        // If 403 (wrong level), redirect back after a moment
        if (err.message?.includes('level')) {
          setTimeout(() => navigate('/missions'), 2000);
        }
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  async function handleStart() {
    if (!mission) return;
    setStarting(true);
    try {
      const data = await api.post<{ id: string }>('/conversations/start', {
        missionId: mission.id,
      });
      navigate(`/missions/${mission.slug}/conversation/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start');
      setStarting(false);
    }
  }

  if (loading) return <LoadingSpinner text="Loading mission..." />;

  if (error && !mission) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <span className="text-5xl">🔒</span>
        <p className="mt-4 text-gray-500">{error}</p>
        <button onClick={() => navigate('/missions')} className="btn-primary mt-4">
          Back to Missions
        </button>
      </div>
    );
  }

  if (!mission) return null;

  const activeLevel = user ? getActiveLevel(user) : null;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/missions')}
        className="btn-ghost mb-4 text-sm"
      >
        ← Back to Missions
      </button>

      <div className="card">
        <div className="flex items-start gap-4 mb-6">
          <span className="text-5xl">{CATEGORY_ICONS[mission.category] || '🎯'}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-level">{mission.level}</span>
              <span className="badge-category">{mission.category}</span>
              <span className="text-xs text-gray-400 font-mono">Mission #{mission.order}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{mission.title}</h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* NPC Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center gap-4">
            <span className="text-4xl">👤</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{mission.npcName}</p>
              <p className="text-sm text-gray-500">{mission.npcRole}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2">📖 Scenario</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {mission.description}
            </p>
          </div>

          {/* Scenario Prompt */}
          <div className="bg-danish-accent/5 border border-danish-accent/20 rounded-xl p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2">🎭 Your Role</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
              {mission.scenarioPrompt}
            </p>
          </div>

          {/* Required Phrases */}
          {mission.requiredPhrases.length > 0 && (
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">💡 Useful Phrases</h2>
              <div className="space-y-2">
                {mission.requiredPhrases.map((phrase, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-medium"
                  >
                    {phrase}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={starting}
            className="btn-primary w-full py-4 text-lg"
          >
            {starting ? 'Starting...' : '🎙️ Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

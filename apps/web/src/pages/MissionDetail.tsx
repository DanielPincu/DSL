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

interface MissionDetailData extends Mission {
  locked: boolean;
  lockedReason?: string;
  completed: boolean;
}

export default function MissionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mission, setMission] = useState<MissionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    api.get<MissionDetailData>(`/missions/${slug}`)
      .then((data) => {
        setMission(data);
        if (data.locked) {
          setError(data.lockedReason || 'This mission is locked');
        }
      })
      .catch((err) => {
        setError(err.message);
        if (err.message?.includes('level')) {
          setTimeout(() => navigate('/missions'), 2000);
        }
      })
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  async function handleStart() {
    if (!mission || mission.locked || mission.completed) return;
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
          <span className="text-5xl">
            {mission.locked ? '🔒' : mission.completed ? '✅' : CATEGORY_ICONS[mission.category] || '🎯'}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-level">{mission.level}</span>
              <span className="badge-category">{mission.category}</span>
              <span className="text-xs text-gray-400 font-mono">Mission #{mission.order}</span>
              {mission.locked && (
                <span className="badge bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  Locked 🔒
                </span>
              )}
              {mission.completed && (
                <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  Completed ✅
                </span>
              )}
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

          {/* Locked notice */}
          {mission.locked && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
              <span className="text-4xl block mb-3">🔒</span>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Locked</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mission.lockedReason || 'Complete the previous mission first'}
              </p>
            </div>
          )}

          {error && !mission.locked && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={starting || mission.locked || mission.completed}
            className={`btn w-full py-4 text-lg ${
              mission.locked
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : mission.completed
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'btn-primary'
            }`}
          >
            {mission.locked
              ? '🔒 Locked'
              : mission.completed
                ? '✅ Completed'
                : starting
                  ? 'Starting...'
                  : '🎙️ Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

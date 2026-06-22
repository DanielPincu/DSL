import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { MissionWithProgress } from '@dls/shared';
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
  const [mission, setMission] = useState<MissionWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get<MissionWithProgress>(`/missions/${slug}`)
      .then(setMission)
      .catch(() => navigate('/missions'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  async function handleStart() {
    if (!mission || mission.locked) return;
    setStarting(true);
    try {
      const data = await api.post<{ id: string }>('/conversations/start', {
        missionId: mission.id,
      });
      navigate(`/missions/${mission.slug}/conversation/${data.id}`);
    } catch (err) {
      setStarting(false);
    }
  }

  if (loading) return <LoadingSpinner text="Loading mission..." />;
  if (!mission) return null;

  const activeLevel = user ? getActiveLevel(user) : null;
  const isAppropriateLevel = activeLevel
    ? ['A1', 'A2', 'B1', 'B2'].indexOf(mission.level) <= ['A1', 'A2', 'B1', 'B2'].indexOf(activeLevel)
    : true;

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
          <span className="text-5xl">{mission.locked ? '🔒' : CATEGORY_ICONS[mission.category] || '🎯'}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-level">{mission.level}</span>
              <span className="badge-category">{mission.category}</span>
              {mission.locked && (
                <span className="badge bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                  Locked 🔒
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

          {/* Level warning */}
          {!isAppropriateLevel && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-xl text-sm">
              ⚠️ This mission is level {mission.level}. Your current level is {activeLevel}.
              It might be challenging, but give it a try!
            </div>
          )}

          {/* Locked notice */}
          {mission.locked && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
              <span className="text-4xl block mb-3">🔒</span>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Mission Locked</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mission.lockedReason || 'Complete the previous mission first'}
              </p>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={starting || mission.locked}
            className={`btn w-full py-4 text-lg ${
              mission.locked
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {mission.locked
              ? '🔒 Locked'
              : starting
                ? 'Starting...'
                : '🎙️ Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

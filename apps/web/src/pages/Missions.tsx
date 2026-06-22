import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Mission, CEFRLevel, Conversation, MissionLevelProgress } from '@dls/shared';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { getActiveLevel } from '@dls/shared';

const CATEGORY_ICONS: Record<string, string> = {
  health: '🏥', housing: '🏠', shopping: '🛒', work: '💼',
  social: '🤝', technology: '📱', education: '📚',
  government: '🏛️', finance: '💰', citizenship: '🎫',
};

const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  A2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  B1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  B2: 'bg-danish-accent/20 text-yellow-800 dark:text-yellow-200',
  C1: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

interface MissionsResponse {
  missions: Mission[];
  progress: MissionLevelProgress;
}

export default function Missions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<MissionLevelProgress | null>(null);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [activeConvs, setActiveConvs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<MissionsResponse>('/missions'),
      api.get<Conversation[]>('/conversations/me'),
    ]).then(([missionsData, convsData]) => {
      setMissions(missionsData.missions);
      setProgress(missionsData.progress);

      const completed: Set<string> = new Set();
      const activeMap: Record<string, string> = {};

      for (const conv of convsData) {
        const mId = typeof conv.missionId === 'string'
          ? conv.missionId
          : (conv.missionId as Record<string, string>)?.id || (conv.missionId as Record<string, string>)?._id || '';

        if (conv.status === 'active' && mId) activeMap[mId] = conv.id;
        if (conv.status === 'completed' && mId) completed.add(mId);
      }

      setCompletedSet(completed);
      setActiveConvs(activeMap);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeLevel = user ? getActiveLevel(user) : null;

  if (loading) return <LoadingSpinner text="Loading missions..." />;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Missions 🎯</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Complete all missions at your level to advance to the next
          </p>
        </div>
        {activeLevel && (
          <div className={`badge text-sm px-4 py-2 ${LEVEL_COLORS[activeLevel]}`}>
            Level: <strong className="ml-1">{activeLevel}</strong>
          </div>
        )}
      </div>

      {/* Level Progress */}
      {progress && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progress.level} Progress
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {progress.completed}/{progress.total} completed
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
            />
          </div>
          {progress.allDone && (
            <div className="mt-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-xl text-sm text-center font-medium">
              🎉 All {progress.level} missions complete! Complete a conversation with "farvel" to advance to the next level.
            </div>
          )}
        </div>
      )}

      {/* Mission grid */}
      {missions.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">🔍</span>
          <p className="mt-4 text-gray-500">No missions available at your level.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((mission) => {
            const isCompleted = completedSet.has(mission.id);
            const activeConvId = activeConvs[mission.id];

            return (
            <Link
              key={mission.slug}
              to={activeConvId ? `/missions/${mission.slug}/conversation/${activeConvId}` : `/missions/${mission.slug}`}
              className={`${isCompleted ? 'card opacity-70' : 'card-hover group'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{CATEGORY_ICONS[mission.category] || '🎯'}</span>
                <div className="flex gap-1.5">
                  {isCompleted && (
                    <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                      ✅ Done
                    </span>
                  )}
                  {activeConvId && !isCompleted && (
                    <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                      In Progress 💬
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-mono">#{mission.order}</span>
                <span className={`badge text-xs ${LEVEL_COLORS[mission.level]}`}>
                  {mission.level}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white">
                {mission.title}
              </h3>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                {mission.description}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <span className="text-sm text-gray-400">👤 {mission.npcName}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-sm text-gray-400">{mission.npcRole}</span>
              </div>

              <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium transition-opacity">
                {isCompleted && <span className="text-green-600 dark:text-green-400">View →</span>}
                {activeConvId && !isCompleted && <span className="text-danish-red">Continue →</span>}
                {!activeConvId && !isCompleted && (
                  <span className="text-danish-red opacity-0 group-hover:opacity-100">Start mission →</span>
                )}
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

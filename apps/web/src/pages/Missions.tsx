import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Mission, CEFRLevel } from '@dls/shared';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { getActiveLevel } from '@dls/shared';

const CATEGORY_ICONS: Record<string, string> = {
  health: '🏥',
  housing: '🏠',
  shopping: '🛒',
  work: '💼',
  social: '🤝',
  technology: '📱',
  education: '📚',
  government: '🏛️',
  finance: '💰',
  citizenship: '🎫',
};

const LEVEL_COLORS: Record<CEFRLevel, string> = {
  A1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  A2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  B1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  B2: 'bg-danish-accent/20 text-yellow-800 dark:text-yellow-200',
};

export default function Missions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CEFRLevel | 'all'>('all');

  useEffect(() => {
    api.get<Mission[]>('/missions')
      .then(setMissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeLevel = user ? getActiveLevel(user) : null;
  const filtered = filter === 'all'
    ? missions
    : missions.filter((m) => m.level === filter);

  const levels = ['all', ...new Set(missions.map((m) => m.level))] as (CEFRLevel | 'all')[];

  if (loading) return <LoadingSpinner text="Loading missions..." />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Missions 🎯</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Choose a scenario and practice Danish in real-life situations
          </p>
        </div>
        {activeLevel && (
          <div className="badge-level text-sm px-4 py-2">
            Your level: <strong className="ml-1">{activeLevel}</strong>
          </div>
        )}
      </div>

      {/* Level filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filter === level
                ? 'bg-danish-red text-white shadow-lg shadow-red-500/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {level === 'all' ? 'All Levels' : level}
          </button>
        ))}
      </div>

      {/* Mission grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">🔍</span>
          <p className="mt-4 text-gray-500">No missions found for this level.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mission) => (
            <Link
              key={mission.slug}
              to={`/missions/${mission.slug}`}
              className="card-hover group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{CATEGORY_ICONS[mission.category] || '🎯'}</span>
                <span className={`badge text-xs ${LEVEL_COLORS[mission.level]}`}>
                  {mission.level}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-danish-red transition-colors">
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

              <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-danish-red opacity-0 group-hover:opacity-100 transition-opacity">
                Start mission →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

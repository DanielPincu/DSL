import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Mistake, MistakeType } from '@dls/shared';
import LoadingSpinner from '../components/LoadingSpinner';

const TYPE_ICONS: Record<MistakeType, string> = {
  grammar: '🔤',
  vocabulary: '📖',
  word_order: '📏',
  spelling: '✏️',
  phrase: '💬',
};

const TYPE_LABELS: Record<MistakeType, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  word_order: 'Word Order',
  spelling: 'Spelling',
  phrase: 'Phrase',
};

export default function Mistakes() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<MistakeType | 'all'>('all');
  const [masteredFilter, setMasteredFilter] = useState<'all' | 'mastered' | 'unmastered'>('unmastered');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchMistakes() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (masteredFilter !== 'all') params.set('mastered', masteredFilter === 'mastered' ? 'true' : 'false');
      params.set('page', String(page));
      params.set('limit', '20');

      const data = await api.get<{
        mistakes: Mistake[];
        pagination: { page: number; total: number; pages: number };
      }>(`/mistakes/me?${params}`);

      setMistakes(data.mistakes);
      setTotalPages(data.pagination.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMistakes();
  }, [typeFilter, masteredFilter, page]);

  async function toggleMastered(id: string) {
    try {
      await api.patch(`/mistakes/${id}/mastered`);
      fetchMistakes();
    } catch (e) {
      console.error(e);
    }
  }

  const types = ['all', ...Object.keys(TYPE_LABELS)] as (MistakeType | 'all')[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Mistakes 📝</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Track and review your Danish mistakes. Each mistake is a learning opportunity!
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => { setTypeFilter(type); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === type
                ? 'bg-danish-red text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {type === 'all' ? 'All Types' : TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {(['unmastered', 'all', 'mastered'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setMasteredFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              masteredFilter === f
                ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            {f === 'all' ? 'All' : f === 'mastered' ? 'Mastered ✅' : 'To Review'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading mistakes..." />
      ) : mistakes.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">🎉</span>
          <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg font-medium">
            No mistakes found!
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {masteredFilter === 'unmastered'
              ? 'Great job! Keep practicing to find areas to improve.'
              : 'Keep learning and mistakes will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map((mistake) => (
            <div
              key={mistake.id}
              className={`card ${
                mistake.mastered ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{TYPE_ICONS[mistake.type]}</span>
                    <span className="badge bg-gray-100 dark:bg-gray-700 text-xs">
                      {TYPE_LABELS[mistake.type]}
                    </span>
                    {mistake.mastered && (
                      <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">
                        Mastered ✅
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-red-500 line-through">{mistake.originalText}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{mistake.correctedText}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {mistake.explanation}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(mistake.createdAt).toLocaleDateString()}
                    {mistake.missionId && typeof mistake.missionId === 'object' && 'title' in mistake.missionId && (
                      <> · Mission: {(mistake.missionId as { title: string }).title}</>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => toggleMastered(mistake.id)}
                  className={`shrink-0 p-2 rounded-lg transition-colors ${
                    mistake.mastered
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100'
                  }`}
                  title={mistake.mastered ? 'Mark as unmastered' : 'Mark as mastered'}
                >
                  {mistake.mastered ? '↩️' : '✅'}
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn-secondary text-sm"
              >
                ← Previous
              </button>
              <span className="flex items-center text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="btn-secondary text-sm"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

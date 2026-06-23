import { useState, useEffect } from 'react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { CEFR_LEVELS } from '../types';

interface VocabWord {
  id: string;
  danish: string;
  english: string;
  level: string;
  category: string;
  missionSlug: string;
  missionTitle: string;
  learned: boolean;
}

type Tab = 'browse' | 'flashcards' | 'quiz';

export default function Vocabulary() {
  const [tab, setTab] = useState<Tab>('browse');
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showLearned, setShowLearned] = useState(true);

  // Flashcards state
  const [deckLevel, setDeckLevel] = useState('A1');
  const [deck, setDeck] = useState<VocabWord[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [message, setMessage] = useState('');

  // Quiz state
  const [quizWords, setQuizWords] = useState<VocabWord[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    api.get<{ words: VocabWord[] }>('/vocabulary')
      .then((data) => setWords(data.words))
      .catch(() => setMessage('Failed to load vocabulary'))
      .finally(() => setLoading(false));
  }, []);

  function showMsg(msg: string) { setMessage(msg); setTimeout(() => setMessage(''), 3000); }

  async function toggleLearned(wordId: string, learned: boolean) {
    try {
      await api.patch('/vocabulary/learned', { wordId, learned });
      setWords((prev) => prev.map((w) => w.id === wordId ? { ...w, learned } : w));
    } catch { showMsg('Failed to update'); }
  }

  // ── Categories —─
  const categories = [...new Set(words.map((w) => w.category))].sort();

  // ── Browse ──
  const filtered = words.filter((w) => {
    if (levelFilter !== 'all' && w.level !== levelFilter) return false;
    if (catFilter !== 'all' && w.category !== catFilter) return false;
    if (!showLearned && w.learned) return false;
    return true;
  });

  const totalWords = words.length;
  const learnedCount = words.filter((w) => w.learned).length;

  // ── Flashcards ──
  function startFlashcards(level: string) {
    setDeckLevel(level);
    const pool = words.filter((w) => w.level === level);
    setDeck(pool.sort(() => Math.random() - 0.5));
    setCardIndex(0);
    setFlipped(false);
    setTab('flashcards');
  }

  function nextCard(gotIt: boolean) {
    const word = deck[cardIndex];
    if (gotIt && word && !word.learned) {
      toggleLearned(word.id, true);
    }
    if (cardIndex < deck.length - 1) {
      setCardIndex((i) => i + 1);
      setFlipped(false);
    } else {
      const remaining = deck.filter((w) => !w.learned && !gotIt);
      if (remaining.length > 0 && deck.length > 1) {
        // Reshuffle unlearned
        setDeck(remaining.sort(() => Math.random() - 0.5));
        setCardIndex(0);
        setFlipped(false);
        showMsg(`Round done! ${remaining.length} words to practice`);
      } else {
        setTab('browse');
        showMsg('All words learned! 🎉');
      }
    }
  }

  // ── Quiz ──
  function startQuiz() {
    const pool = words.filter((w) => !w.learned).sort(() => Math.random() - 0.5);
    if (pool.length < 4) {
      showMsg('Learn some words first with Flashcards!');
      return;
    }
    setQuizWords(pool.slice(0, 10));
    setQuizIndex(0);
    setQuizCorrect(0);
    setQuizDone(false);
    setQuizResult(null);
    generateOptions(pool[0], pool);
    setTab('quiz');
  }

  function generateOptions(current: VocabWord, pool: VocabWord[]) {
    const others = pool.filter((w) => w.id !== current.id).sort(() => Math.random() - 0.5);
    const opts = [current.english, ...others.slice(0, 3).map((w) => w.english)].sort(() => Math.random() - 0.5);
    setOptions(opts);
    setQuizResult(null);
  }

  function answerQuiz(selected: string) {
    const correct = quizWords[quizIndex].english;
    const isCorrect = selected === correct;
    setQuizResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setQuizCorrect((c) => c + 1);
    setTimeout(() => {
      if (quizIndex < quizWords.length - 1) {
        const next = quizIndex + 1;
        setQuizIndex(next);
        const pool = words.filter((w) => !w.learned);
        generateOptions(quizWords[next], pool);
      } else {
        setQuizDone(true);
      }
    }, 1200);
  }

  if (loading) return <LoadingSpinner text="Loading vocabulary..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vocabulary 📚</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {learnedCount}/{totalWords} words mastered
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['browse', 'flashcards', 'quiz'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-danish-red text-danish-red'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'browse' && '📖 '}
            {t === 'flashcards' && '🃏 '}
            {t === 'quiz' && '✏️ '}
            {t}
          </button>
        ))}
      </div>

      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* ── Browse Tab ── */}
      {tab === 'browse' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="input text-sm w-auto"
            >
              <option value="all">All Levels</option>
              {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="input text-sm w-auto"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={showLearned}
                onChange={(e) => setShowLearned(e.target.checked)}
                className="rounded"
              />
              Show mastered
            </label>
          </div>

          {/* Word list */}
          <div className="space-y-1">
            {filtered.map((w) => (
              <div
                key={w.id}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                  w.learned
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-white dark:bg-danish-card border border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-white">{w.danish}</span>
                  <span className="text-gray-400 dark:text-gray-500 mx-2">—</span>
                  <span className="text-gray-600 dark:text-gray-400">{w.english}</span>
                  <div className="flex gap-2 mt-0.5">
                    <span className="badge-level text-[10px]">{w.level}</span>
                    <span className="badge-category text-[10px]">{w.category}</span>
                    <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{w.missionTitle}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleLearned(w.id, !w.learned)}
                  className={`ml-3 text-lg shrink-0 ${w.learned ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
                  title={w.learned ? 'Mark unlearned' : 'Mark learned'}
                >
                  {w.learned ? '✅' : '⬜'}
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8">No words match your filters</p>
            )}
          </div>
        </div>
      )}

      {/* ── Flashcards Tab ── */}
      {tab === 'flashcards' && (
        <div className="space-y-6">
          {deck.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-500 dark:text-gray-400">Pick a level to start practicing:</p>
              <div className="flex justify-center gap-2">
                {CEFR_LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => startFlashcards(l)}
                    className={`btn text-sm ${deckLevel === l ? 'bg-danish-red text-white' : 'bg-gray-100 dark:bg-gray-700'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {deckLevel} — {cardIndex + 1}/{deck.length}
                </span>
                <button
                  onClick={() => { setDeck([]); setTab('browse'); }}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  ✕ Close deck
                </button>
              </div>

              {/* Card */}
              <div
                onClick={() => setFlipped(!flipped)}
                className={`cursor-pointer rounded-2xl p-8 text-center min-h-[200px] flex flex-col items-center justify-center transition-all duration-300 ${
                  flipped
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700'
                    : 'bg-white dark:bg-danish-card border-2 border-gray-200 dark:border-gray-700 hover:border-danish-red/30'
                }`}
              >
                <span className="text-4xl mb-4">{flipped ? '🇬🇧' : '🇩🇰'}</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {flipped ? deck[cardIndex]?.english : deck[cardIndex]?.danish}
                </p>
                <p className="text-sm text-gray-400">
                  {flipped ? 'Tap to see Danish' : 'Tap to reveal English'}
                </p>
                {flipped && (
                  <p className="text-xs text-gray-400 mt-1">
                    {deck[cardIndex]?.missionTitle} · {deck[cardIndex]?.category}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => nextCard(false)}
                  className="btn bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-8"
                >
                  Still Learning
                </button>
                <button
                  onClick={() => nextCard(true)}
                  className="btn bg-green-600 text-white hover:bg-green-700 px-8"
                >
                  Got It
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Quiz Tab ── */}
      {tab === 'quiz' && (
        <div className="space-y-6">
          {quizDone ? (
            <div className="text-center py-8 space-y-4">
              <span className="text-6xl block">🎉</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quiz Complete!
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                You got {quizCorrect}/{quizWords.length} correct
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={startQuiz} className="btn-primary">
                  Try Again
                </button>
                <button onClick={() => setTab('browse')} className="btn-secondary">
                  Browse Words
                </button>
              </div>
            </div>
          ) : quizWords.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <span className="text-5xl block">✏️</span>
              <p className="text-gray-500 dark:text-gray-400">
                Test yourself on unmastered words. Start practicing with
                <button onClick={() => setTab('flashcards')} className="text-danish-red hover:underline mx-1">Flashcards</button>
                first, then come back here.
              </p>
              <button onClick={startQuiz} className="btn-primary">
                Start Quiz
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {quizIndex + 1}/{quizWords.length} · {quizCorrect} correct
                </span>
              </div>

              <div className="bg-white dark:bg-danish-card rounded-2xl p-8 text-center border-2 border-gray-200 dark:border-gray-700">
                <span className="text-3xl mb-3 block">🇩🇰</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {quizWords[quizIndex]?.danish}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {options.map((opt, i) => {
                    let cls = 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700';
                    if (quizResult === 'correct' && opt === quizWords[quizIndex]?.english) cls = 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600';
                    if (quizResult === 'wrong' && opt === quizWords[quizIndex]?.english) cls = 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600';
                    if (quizResult === 'wrong' && opt !== quizWords[quizIndex]?.english) cls = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 opacity-50';
                    return (
                      <button
                        key={i}
                        onClick={() => !quizResult && answerQuiz(opt)}
                        disabled={!!quizResult}
                        className={`btn text-sm py-3 ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

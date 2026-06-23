import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { CEFR_LEVELS, type CEFRLevel } from '../types';
import { useAuth } from '../context/AuthContext';
import { getActiveLevel } from '../types';

interface VocabWord {
  id: string;
  danish: string;
  english: string;
  level: string;
  category: string;
  missionSlug: string | null;
  missionTitle: string | null;
  learned: boolean;
}

interface QuizResult {
  danish: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

type Tab = 'browse' | 'flashcards' | 'quiz';

export default function Vocabulary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userLevel = user ? getActiveLevel(user, user.activeLanguage) : 'A1';
  const [tab, setTab] = useState<Tab>('browse');
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showLearned, setShowLearned] = useState(true);
  const [message, setMessage] = useState('');
  const [passedLevels, setPassedLevels] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(50);

  // Flashcards
  const [deckLevel, setDeckLevel] = useState<typeof userLevel>(userLevel);
  const [deck, setDeck] = useState<VocabWord[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Quiz
  const [quizWords, setQuizWords] = useState<VocabWord[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const quizCorrectRef = useRef(0);
  const [quizDone, setQuizDone] = useState(false);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const quizResultsRef = useRef<QuizResult[]>([]);
  const [currentCorrect, setCurrentCorrect] = useState('');
  const [quizLevel, setQuizLevel] = useState<typeof userLevel>(userLevel);
  const [submitting, setSubmitting] = useState(false);
  const [quizPassed, setQuizPassed] = useState<boolean | null>(null);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get<{ words: VocabWord[] }>('/vocabulary'),
      api.get<{ passedLevelQuizzes: string[] }>('/vocabulary/level-status'),
    ])
      .then(([vocabData, levelData]) => {
        setWords(vocabData.words);
        setPassedLevels(levelData.passedLevelQuizzes);
      })
      .catch(() => setMessage('Failed to load vocabulary'))
      .finally(() => setLoading(false));
  }, []);

  // Lazy loading observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastWordRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    if (!node) return;
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 50);
      }
    }, { rootMargin: '200px' });
    observer.current.observe(node);
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [levelFilter, catFilter, showLearned]);

  function showMsg(msg: string) { setMessage(msg); setTimeout(() => setMessage(''), 4000); }

  async function toggleLearned(wordId: string, learned: boolean) {
    try {
      await api.patch('/vocabulary/learned', { wordId, learned });
      setWords((prev) => prev.map((w) => w.id === wordId ? { ...w, learned } : w));
    } catch { showMsg('Failed to update'); }
  }

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
  function startFlashcards(level?: CEFRLevel) {
    const lvl = level || userLevel;
    setDeckLevel(lvl);
    const pool = words.filter((w) => w.level === lvl && !w.learned).sort(() => Math.random() - 0.5);
    if (pool.length === 0) { showMsg('No words for this level'); return; }
    setDeck(pool);
    setCardIndex(0);
    setFlipped(false);
    setTab('flashcards');
  }

  function nextCard(gotIt: boolean) {
    const word = deck[cardIndex];
    if (gotIt && word && !word.learned) toggleLearned(word.id, true);
    if (!gotIt && word && word.learned) toggleLearned(word.id, false);
    if (cardIndex < deck.length - 1) {
      setCardIndex((i) => i + 1);
      setFlipped(false);
    } else {
      // Check actual learned status from the words state (toggleLearned updates it)
      const deckIds = new Set(deck.map((w) => w.id));
      const remaining = words.filter((w) => deckIds.has(w.id) && !w.learned);
      if (remaining.length > 3) {
        setDeck(remaining.sort(() => Math.random() - 0.5));
        setCardIndex(0);
        setFlipped(false);
        showMsg(`Round done! ${remaining.length} words left to practice`);
      } else {
        // Mark the last few as learned
        remaining.forEach((w) => { if (!w.learned) toggleLearned(w.id, true); });
        setDeck([]);
        setTab('browse');
        showMsg('All words learned! 🎉');
      }
    }
  }

  // ── Quiz ──
  function startQuiz() {
    const pool = words.filter((w) => w.level === quizLevel || true).sort(() => Math.random() - 0.5);
    if (pool.length < 20) { showMsg('Not enough words — practice with Flashcards first!'); return; }
    setQuizWords(pool.slice(0, 20));
    setQuizIndex(0);
    setQuizCorrect(0);
    quizCorrectRef.current = 0;
    setQuizDone(false);
    setQuizResult(null);
    setQuizResults([]);
    quizResultsRef.current = [];
    setQuizPassed(null);
    generateOptions(pool[0], pool);
    setTab('quiz');
  }

  function generateOptions(current: VocabWord, pool: VocabWord[]) {
    setCurrentCorrect(current.english);
    const others = pool.filter((w) => w.id !== current.id).sort(() => Math.random() - 0.5);
    const opts = [current.english, ...others.slice(0, 3).map((w) => w.english)].sort(() => Math.random() - 0.5);
    setOptions(opts);
    setQuizResult(null);
  }

  function answerQuiz(selected: string) {
    if (quizResult) return;
    const word = quizWords[quizIndex];
    const correct = word.english;
    const isCorrect = selected === correct;
    setQuizResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) { setQuizCorrect((c) => c + 1); quizCorrectRef.current++; }

    const result = { danish: word.danish, yourAnswer: selected, correctAnswer: correct, isCorrect };
    setQuizResults((prev) => [...prev, result]);
    quizResultsRef.current = [...quizResultsRef.current, result];
  }

  function nextQuestion() {
    if (quizIndex < quizWords.length - 1) {
      const next = quizIndex + 1;
      setQuizIndex(next);
      const pool = words.filter((w) => w.level === quizLevel || true);
      generateOptions(quizWords[next], pool);
    } else {
      finishQuiz();
    }
  }

  async function finishQuiz() {
    const score = Math.round((quizCorrectRef.current / 20) * 100);
    setQuizScore(score);
    setQuizDone(true);
    setQuizPassed(score >= 50);

    if (score >= 50) {
      setSubmitting(true);
      try {
        const answers = quizResultsRef.current.map((r) => ({ danish: r.danish, selectedEnglish: r.yourAnswer }));
        const res = await api.post<{ passed: boolean }>('/vocabulary/level-quiz', { level: quizLevel, answers });
        if (res.passed) {
          setPassedLevels((prev) => prev.includes(quizLevel) ? prev : [...prev, quizLevel]);
        }
      } catch (e) {
        showMsg('Failed to save quiz result — but you passed! Try visiting Missions again.');
        // Still mark locally so the user doesn't get stuck
        setPassedLevels((prev) => prev.includes(quizLevel) ? prev : [...prev, quizLevel]);
      }
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner text="Loading vocabulary..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vocabulary 📚</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {learnedCount}/{totalWords} words mastered · {CEFR_LEVELS.map((l) =>
            `${l}${passedLevels.includes(l) ? ' ✅' : ' 🔒'}`).join(' · ')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['browse', 'flashcards', 'quiz'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-danish-red text-danish-red' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {t === 'browse' && '📖 '}{t === 'flashcards' && '🃏 '}{t === 'quiz' && '✏️ '}{t}
          </button>
        ))}
      </div>

      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-sm">{message}</div>
      )}

      {/* ── Browse ── */}
      {tab === 'browse' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="input text-sm w-auto">
              <option value="all">All Levels</option>
              {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input text-sm w-auto">
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={showLearned} onChange={(e) => setShowLearned(e.target.checked)} className="rounded" />
              Show mastered
            </label>
          </div>

          <div className="space-y-1">
            {filtered.slice(0, visibleCount).map((w, i) => (
              <div key={w.id} ref={i === visibleCount - 1 && i < filtered.length - 1 ? lastWordRef : null}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                w.learned ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-danish-card border border-gray-100 dark:border-gray-800'
              }`}>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-white">{w.danish}</span>
                  <span className="text-gray-400 dark:text-gray-500 mx-2">—</span>
                  <span className="text-gray-600 dark:text-gray-400">{w.english}</span>
                  <div className="flex gap-2 mt-0.5">
                    <span className="badge-level text-[10px]">{w.level}</span>
                    <span className="badge-category text-[10px]">{w.category}</span>
                    {w.missionTitle && <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{w.missionTitle}</span>}
                  </div>
                </div>
                <button onClick={() => toggleLearned(w.id, !w.learned)}
                  className={`ml-3 shrink-0 flex items-center gap-1.5 text-xs ${
                    w.learned ? 'text-green-600 dark:text-green-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                  title={w.learned ? 'Mark unlearned' : 'Mark learned'}>
                  {w.learned ? '✅' : '⬜'}
                  <span className="hidden sm:inline">{w.learned ? 'Learned' : 'Mark learned'}</span>
                </button>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No words match your filters</p>}
            {visibleCount < filtered.length && (
              <div ref={lastWordRef} className="text-center py-4 text-sm text-gray-400">
                Scrolling for more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Flashcards ── */}
      {tab === 'flashcards' && (
        <div className="space-y-6">
          {deck.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <span className="text-6xl block">🃏</span>
              {words.filter((w) => w.level === userLevel && !w.learned).length === 0 ? (
                <>
                  <p className="text-green-600 dark:text-green-400 font-semibold text-lg">All {userLevel} words learned! 🎉</p>
                  <button onClick={() => window.location.reload()} className="btn-primary">Refresh</button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 dark:text-gray-400">
                    {words.filter((w) => w.level === userLevel && !w.learned).length} words to practice for {userLevel}
                  </p>
                  <button onClick={() => startFlashcards()} className="btn-primary px-8 py-3 text-lg">
                    Play {userLevel} Flash
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{deckLevel} — {cardIndex + 1}/{deck.length}</span>
                <button onClick={() => { setDeck([]); }} className="text-sm text-gray-400 hover:text-gray-600">✕ Close deck</button>
              </div>

              <div onClick={() => setFlipped(!flipped)}
                className={`cursor-pointer rounded-2xl p-8 text-center min-h-[260px] flex flex-col items-center justify-center transition-all duration-300 ${
                  flipped ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700' : 'bg-white dark:bg-danish-card border-2 border-gray-200 dark:border-gray-700 hover:border-danish-red/30'
                }`}>
                <span className="text-4xl mb-4">{flipped ? '🇬🇧' : '🇩🇰'}</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {flipped ? deck[cardIndex]?.english : deck[cardIndex]?.danish}
                </p>
                <p className="text-sm text-gray-400">{flipped ? 'Tap to see Danish' : 'Tap to reveal English'}</p>
                {flipped && <p className="text-xs text-gray-400 mt-1">{deck[cardIndex]?.missionTitle || 'Level word'} · {deck[cardIndex]?.category}</p>}
              </div>

              <div className="flex justify-center gap-4">
                <button onClick={() => nextCard(false)}
                  className="btn bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-8">Still Learning</button>
                <button onClick={() => nextCard(true)}
                  className="btn bg-green-600 text-white hover:bg-green-700 px-8">Got It</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Quiz ── */}
      {tab === 'quiz' && (
        <div className="space-y-6">
          {quizDone ? (
            <div className="text-center py-8 space-y-4">
              <span className="text-6xl block">{quizPassed ? '🎉' : '💪'}</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Complete!</h2>
              <p className="text-gray-500 dark:text-gray-400">You got {quizCorrect}/20 correct ({quizScore}%)</p>
              {quizPassed ? (
                <p className="text-green-600 dark:text-green-400 font-semibold">✅ {quizLevel} level unlocked!</p>
              ) : (
                <p className="text-yellow-600 dark:text-yellow-400 font-semibold">You need 50% to pass. Keep practicing!</p>
              )}

              {/* Results breakdown */}
              <div className="max-w-lg mx-auto text-left space-y-1 max-h-60 overflow-y-auto">
                {quizResults.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                    r.isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <span>{r.isCorrect ? '✅' : '❌'}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{r.danish}</span>
                    <span className="text-gray-400">→</span>
                    {r.isCorrect ? (
                      <span className="text-green-600 dark:text-green-400">{r.correctAnswer}</span>
                    ) : (
                      <>
                        <span className="text-red-500 line-through">{r.yourAnswer}</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">{r.correctAnswer}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-3">
                <button onClick={startQuiz} className="btn-primary">Try Again</button>
                <button onClick={() => setTab('browse')} className="btn-secondary">Browse Words</button>
              </div>
            </div>
          ) : quizWords.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <span className="text-5xl block">✏️</span>
              <p className="text-gray-500 dark:text-gray-400">
                Test your {userLevel} vocabulary knowledge
              </p>
              <p className="text-xs text-gray-400">20 questions · 50% to pass and unlock missions</p>
              <button onClick={() => { setQuizLevel(userLevel); startQuiz(); }} className="btn-primary px-8 py-3 text-lg">
                Start {userLevel} Quiz
              </button>
              {passedLevels.includes(userLevel) && (
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">✅ {userLevel} already passed</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{quizIndex + 1}/20 · {quizCorrect} correct</span>
                <span className="text-xs text-gray-400">Level: {quizLevel}</span>
              </div>

              <div className="bg-white dark:bg-danish-card rounded-2xl p-8 text-center border-2 border-gray-200 dark:border-gray-700 min-h-[280px] flex flex-col items-center justify-center">
                <span className="text-3xl mb-3 block">🇩🇰</span>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{quizWords[quizIndex]?.danish}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto w-full">
                  {options.map((opt, i) => {
                    const isCorrectAnswer = opt === currentCorrect;
                    const isUserPick = opt === (quizResults[quizResults.length-1]?.yourAnswer ?? '');
                    let cls = 'bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700';
                    if (!quizResult) cls += ' hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
                    if (quizResult && isCorrectAnswer) cls = 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400 text-green-800 dark:text-green-200 font-bold';
                    if (quizResult && isUserPick && !isCorrectAnswer) cls = 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-400 text-red-700 dark:text-red-300';
                    if (quizResult && !isCorrectAnswer && !isUserPick) cls = 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600';
                    return (
                      <div key={i} onClick={() => !quizResult && answerQuiz(opt)}
                        className={`btn text-sm py-3 flex items-center justify-center ${cls}`}>
                        {opt}
                        {quizResult && isCorrectAnswer && ' ✅'}
                        {quizResult && isUserPick && !isCorrectAnswer && ' ❌'}
                      </div>
                    );
                  })}
                </div>

                {/* Feedback and Next button */}
                {quizResult && (
                  <div className="mt-6 space-y-3">
                    {(() => {
                      const last = quizResults[quizResults.length-1];
                      if (!last) return null;
                      return (
                        <div className={`text-sm ${last.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {last.isCorrect
                            ? `✅ Correct! "${last.correctAnswer}"`
                            : `❌ You answered "${last.yourAnswer}" — correct answer is "${last.correctAnswer}"`
                          }
                        </div>
                      );
                    })()}
                    <button onClick={nextQuestion} className="btn-primary px-8 text-lg">
                      {quizIndex < 19 ? 'Next →' : 'See Results'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

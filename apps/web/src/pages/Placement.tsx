import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { CEFRLevel } from '@dls/shared';

interface PlacementMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PlacementResult {
  completed: boolean;
  estimatedLevel?: CEFRLevel;
  confidence?: number;
  strengths?: string[];
  weaknesses?: string[];
  explanation?: string;
  message?: string;
}

const CEFR_DESCRIPTIONS: Record<CEFRLevel, string> = {
  A1: 'Beginner - Can understand and use basic phrases. Can introduce yourself.',
  A2: 'Elementary - Can communicate in simple, routine tasks. Can describe your background.',
  B1: 'Intermediate - Can handle most situations while traveling. Can produce simple connected text.',
  B2: 'Upper Intermediate - Can interact with fluency. Can understand complex texts.',
};

export default function Placement() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<PlacementMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Redirect if already completed
    if (user?.placementCompleted) {
      navigate('/dashboard');
      return;
    }

    // Start placement
    api.post<{ messages: PlacementMessage[] }>('/placement/start')
      .then((data) => {
        setMessages(data.messages);
      })
      .catch(() => {
        setMessages([{
          role: 'assistant',
          content: 'Hej! Velkommen til Danish Life Simulator. Jeg vil gerne lære dig at kende. Hvad hedder du?',
        }]);
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const data = await api.post<PlacementResult>('/placement/message', { message: userMessage });

      if (data.completed) {
        setResult(data);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Tak! Jeg har nu nok information til at vurdere dit niveau.`,
          },
        ]);
        await refreshUser();
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.message || 'Fortæl mig mere.' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Undskyld, kan du sige det igen?' },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleAccept() {
    navigate('/dashboard');
  }

  async function handleOverride(level: CEFRLevel) {
    try {
      await api.post('/placement/override', { selectedLevel: level });
      await refreshUser();
      navigate('/dashboard');
    } catch {
      // Handle error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-danish-dark">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-danish-red border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Starting placement...</p>
        </div>
      </div>
    );
  }

  // Show result
  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-danish-dark flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <span className="text-5xl">🎉</span>
            <h1 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">
              Placement Complete!
            </h1>
          </div>

          <div className="card space-y-6">
            {/* Level display */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-danish-accent/20 border-4 border-danish-accent mb-4">
                <span className="text-3xl font-bold text-danish-accent">{result.estimatedLevel}</span>
              </div>
              <p className="text-sm text-gray-500">
                {result.estimatedLevel && CEFR_DESCRIPTIONS[result.estimatedLevel]}
              </p>
            </div>

            {/* Confidence */}
            {result.confidence !== undefined && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Confidence</span>
                  <span className="font-medium">{result.confidence}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${result.confidence}%` }} />
                </div>
              </div>
            )}

            {/* Strengths */}
            {result.strengths && result.strengths.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">💪 Strengths</h3>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s, i) => (
                    <span key={i} className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Weaknesses */}
            {result.weaknesses && result.weaknesses.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📚 Areas to improve</h3>
                <div className="flex flex-wrap gap-2">
                  {result.weaknesses.map((w, i) => (
                    <span key={i} className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.explanation && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                {result.explanation}
              </p>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button onClick={handleAccept} className="btn-primary w-full">
                Accept Result
              </button>
              <button onClick={() => setShowOverride(!showOverride)} className="btn-secondary w-full">
                {showOverride ? 'Cancel' : 'Choose My Own Level'}
              </button>

              {showOverride && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {(['A1', 'A2', 'B1', 'B2'] as CEFRLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => handleOverride(level)}
                      className="btn bg-gray-100 dark:bg-gray-700 hover:bg-danish-red hover:text-white transition-all"
                    >
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-danish-dark flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-danish-card border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">Level Assessment</h1>
            <p className="text-sm text-gray-500">Answer a few questions in Danish so we can find your level</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-danish-red text-white rounded-br-md'
                    : 'bg-white dark:bg-danish-card border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-danish-card border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-danish-card px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv på dansk... (Write in Danish)"
            className="input flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn-primary px-6"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

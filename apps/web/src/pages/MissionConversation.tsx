import { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Message, Correction } from '@dls/shared';
import LoadingSpinner from '../components/LoadingSpinner';

interface ChatMessage {
  role: string;
  content: string;
  corrections?: Correction[];
}

interface ConversationData {
  id: string;
  messages: Message[];
  status: string;
  language?: string;
  missionId: { title: string; slug: string; npcName?: string; npcRole?: string };
}

interface SendMessageResponse {
  aiReply: string;
  corrections: Correction[];
  feedback: string;
  score: number;
  conversationComplete: boolean;
  autoPromoted?: string | null;
  passed?: boolean;
  passedReason?: string;
  reset?: boolean;
  reason?: string;
}

function countMeaningful(messages: ChatMessage[]): number {
  return messages.filter((m) => {
    if (m.role !== 'user') return false;
    const text = m.content.toLowerCase().trim();
    const words = text.split(/[\s]+/).length;
    const isShort = text === 'hej' || text === 'hej!' || text === 'ja' || text === 'nej' || text === 'ok' || words <= 1;
    return !isShort;
  }).length;
}

export default function MissionConversation() {
  const { slug, conversationId } = useParams<{ slug: string; conversationId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [lastFeedback, setLastFeedback] = useState('');
  const [lastScore, setLastScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [notPassedReason, setNotPassedReason] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [promoted, setPromoted] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    api.get<ConversationData>(`/conversations/${conversationId}`)
      .then((data) => {
        setConversation(data);
        const displayMessages = data.messages.filter((m) => m.role !== 'system');
        setMessages(displayMessages);
      })
      .catch(() => {
        // Conversation not found (e.g. was reset) — show empty state instead of redirecting
        setLoading(false);
      })
      .finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending || complete) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);
    setNotPassedReason(null);

    try {
      const data = await api.post<SendMessageResponse>(
        `/conversations/${conversationId}/message`,
        { message: userMsg }
      );

      if (data.reset) {
        setResetMessage(data.reason || 'Prøv igen!');
        setSending(false);
        return;
      }

      // Attach corrections to the last user message
      const corrections = data.corrections || [];
      if (corrections.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].role === 'user') {
              updated[i] = { ...updated[i], corrections };
              break;
            }
          }
          return [...updated, { role: 'assistant', content: data.aiReply }];
        });
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.aiReply }]);
      }

      setLastFeedback(data.feedback || '');
      setLastScore(data.score || 0);

      if (data.autoPromoted) {
        setPromoted(data.autoPromoted);
      }

      if (data.conversationComplete) {
        setComplete(true);
      } else if (data.passed === false) {
        setNotPassedReason(data.passedReason || null);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Undskyld, noget gik galt. Prøv igen.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingSpinner text="Loading conversation..." />;
  if (!conversation && !resetMessage) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center -mx-4 sm:-mx-6">
        <div className="text-center">
          <span className="text-5xl block mb-4">🔍</span>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Conversation not found</p>
          <button onClick={() => navigate('/missions')} className="btn-primary">
            Back to Missions
          </button>
        </div>
      </div>
    );
  }

  // Fallback values when conversation is null (e.g. after reset)
  const convMission = conversation?.missionId;
  const missionTitle = convMission && typeof convMission === 'object' ? (convMission as { title: string }).title : 'Conversation';
  const missionRole = convMission && typeof convMission === 'object' ? (convMission as { npcRole: string }).npcRole : '';
  const missionName = convMission && typeof convMission === 'object' ? (convMission as { npcName: string }).npcName : '';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-4 sm:-mx-6">
      {/* Header */}
      <div className="bg-white dark:bg-danish-card border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(`/missions/${slug}`)}
          className="btn-ghost p-1 text-lg"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 dark:text-white truncate">{missionTitle}</h1>
          <p className="text-xs text-gray-500">
            {missionRole ? `Speaking with ${missionName}` : 'Conversation'}
          </p>
        </div>
        {complete && (
          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            Completed
          </span>
        )}
      </div>

      {/* Starter tip — shown when conversation is empty */}
      {!complete && !resetMessage && messages.length === 0 && (
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-danish-dark/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-center">
            <span className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              💡 Say <kbd className="px-2 py-0.5 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm font-semibold text-danish-red border-2 border-danish-red/30 dark:border-danish-red/50 shadow-sm">{conversation?.language === "es" ? "Hola" : "Hej"}</kbd> to start the conversation
            </span>
          </div>
        </div>
      )}

      {/* Sticky counter + hint bar */}
      {!complete && !resetMessage && messages.length > 0 && (
        <div className="sticky top-0 z-10 bg-white/90 dark:bg-danish-dark/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 py-2">
          <div className="flex items-center justify-center gap-3">
            {(() => {
              const msgCount = countMeaningful(messages);
              return (
                <span className={"inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium " + (msgCount >= 5 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400")}>
                  📝 {Math.min(msgCount, 5)}/5 messages
                </span>
              );
            })()}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
              💡 Say <kbd className="px-1 py-0.5 rounded bg-white dark:bg-gray-700 font-mono text-[10px] border border-gray-300 dark:border-gray-600">farvel</kbd> to finish
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="space-y-1.5">
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-danish-red text-white rounded-br-md'
                    : 'bg-white dark:bg-danish-card border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
            {/* Inline corrections under user messages */}
            {msg.role === 'user' && msg.corrections && msg.corrections.length > 0 && (
              <div className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[70%] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5 space-y-1.5">
                  <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide">💡 rettelser (corrections)</p>
                  {msg.corrections.map((c, ci) => (
                    <div key={ci} className="text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="text-red-500 line-through">{c.original}</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">→ {c.corrected}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 ml-1">
                        {c.explanation}
                        <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                          {c.type}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Feedback banner */}
        {lastFeedback && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{lastFeedback}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Score:</span>
              <div className="flex-1 max-w-[200px] progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${lastScore}%` }}
                />
              </div>
              <span className="text-sm font-bold text-danish-red">{lastScore}%</span>
            </div>
          </div>
        )}

        {/* Not passed notice — keep practicing */}
        {notPassedReason && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 text-center">
            <span className="text-3xl block mb-2">💪</span>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Not quite there yet
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              {notPassedReason}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Keep practicing and try "farvel" again when you're ready!
            </p>
          </div>
        )}

        {/* Level promotion banner */}
        {promoted && (
          <div className="bg-gradient-to-r from-danish-accent/20 to-green-100 dark:from-danish-accent/10 dark:to-green-900/20 border border-danish-accent/30 dark:border-green-800 rounded-2xl p-5 text-center">
            <span className="text-4xl block mb-2">🎉</span>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
              Level Up! {promoted}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You completed all missions and advanced to the next level!
            </p>
          </div>
        )}

        {/* Typing indicator */}
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

      {/* Complete state */}
      {complete && (
        <div className="bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800 px-4 py-4 text-center">
          <p className="text-green-700 dark:text-green-300 font-semibold mb-2">
            🎉 Conversation complete! Great practice!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/missions/${slug}`)}
              className="btn-secondary text-sm"
            >
              Back to Mission
            </button>
            <button
              onClick={() => navigate('/missions')}
              className="btn-primary text-sm"
            >
              Try Another Mission
            </button>
          </div>
        </div>
      )}

      {/* Reset banner — always visible above input */}
      {resetMessage && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-t-2 border-yellow-300 dark:border-yellow-700 px-4 py-6">
          <div className="max-w-lg mx-auto text-center">
            <span className="text-5xl block mb-3">💪</span>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Not quite there yet</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4 leading-relaxed">
              {resetMessage}
            </p>
            <button
              onClick={() => navigate(`/missions/${slug}`)}
              className="btn bg-danish-red text-white hover:bg-red-700 shadow-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!complete && !resetMessage && (
        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-danish-card px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={conversation?.language === "es" ? "Escribe en español... (Write in Spanish)" : "Skriv på dansk... (Write in Danish)"}
              className="input flex-1"
              disabled={sending}
              autoFocus
              enterKeyHint="send"
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
      )}
    </div>
  );
}

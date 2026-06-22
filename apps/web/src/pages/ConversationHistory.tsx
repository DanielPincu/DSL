import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Conversation, Mission } from '@dls/shared';
import LoadingSpinner from '../components/LoadingSpinner';

interface PopulatedConversation extends Omit<Conversation, 'missionId'> {
  missionId: Pick<Mission, 'title' | 'slug' | 'category' | 'level'>;
}

export default function ConversationHistory() {
  const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PopulatedConversation[]>('/conversations/me')
      .then(setConversations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading conversation history..." />;

  const activeConversations = conversations.filter((c) => c.status === 'active');
  const completedConversations = conversations.filter((c) => c.status === 'completed');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversation History 💬</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          All your Danish practice conversations
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">🎯</span>
          <p className="mt-4 text-gray-500 text-lg">No conversations yet</p>
          <Link to="/missions" className="mt-3 inline-block btn-primary">
            Start your first mission
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active conversations */}
          {activeConversations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                🟢 Active Conversations
              </h2>
              <div className="space-y-3">
                {activeConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/missions/${conv.missionId.slug}/conversation/${conv.id}`}
                    className="card-hover flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {conv.missionId.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {conv.messages.filter((m) => m.role !== 'system').length} messages
                        · Started {new Date(conv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-danish-red text-sm font-medium">Continue →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Completed conversations */}
          {completedConversations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                ✅ Completed
              </h2>
              <div className="space-y-3">
                {completedConversations.map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/missions/${conv.missionId.slug}/conversation/${conv.id}`}
                    className="card flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {conv.missionId.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {conv.messages.filter((m) => m.role !== 'system').length} messages
                        · {new Date(conv.createdAt).toLocaleDateString()}
                        {conv.finalScore !== undefined && ` · Score: ${conv.finalScore}%`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">Review →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

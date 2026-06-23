import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Missions from './pages/Missions';
import MissionDetail from './pages/MissionDetail';
import MissionConversation from './pages/MissionConversation';
import Mistakes from './pages/Mistakes';
import ConversationHistory from './pages/ConversationHistory';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import LoadingSpinner from './components/LoadingSpinner';

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) return <Navigate to="/login" replace />;

  

  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Placement (needs auth but no layouts) */}
      {/* Protected routes with layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions"
        element={
          <ProtectedRoute>
            <Layout>
              <Missions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions/:slug"
        element={
          <ProtectedRoute>
            <Layout>
              <MissionDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions/:slug/conversation/:conversationId"
        element={
          <ProtectedRoute>
            <MissionConversation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mistakes"
        element={
          <ProtectedRoute>
            <Layout>
              <Mistakes />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/conversations"
        element={
          <ProtectedRoute>
            <Layout>
              <ConversationHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<HomeRedirect />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

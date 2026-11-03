import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { apiRequest } from './api';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminTestsPage from './pages/AdminTestsPage';
import TestEditorPage from './pages/TestEditorPage';
import TestsListPage from './pages/TestsListPage';
import TakeTestPage from './pages/TakeTestPage';
import AttemptResultPage from './pages/AttemptResultPage';
import MyAttemptsPage from './pages/MyAttemptsPage';
import AdminTestResultsPage from './pages/AdminTestResultsPage';

function RequireAuth({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireAdmin({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/api/me')
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="container mt-5">Загрузка профиля...</div>;
  }

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="container pb-5">
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/" replace /> : <LoginPage setUser={setUser} />
            }
          />
          <Route
            path="/register"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <RegisterPage setUser={setUser} />
              )
            }
          />

          <Route
            path="/"
            element={
              <RequireAuth user={user}>
                <TestsListPage />
              </RequireAuth>
            }
          />

          <Route
            path="/tests/:id/take"
            element={
              <RequireAuth user={user}>
                <TakeTestPage />
              </RequireAuth>
            }
          />

          <Route
            path="/attempts/:id"
            element={
              <RequireAuth user={user}>
                <AttemptResultPage />
              </RequireAuth>
            }
          />

          <Route
            path="/my/attempts"
            element={
              <RequireAuth user={user}>
                <MyAttemptsPage />
              </RequireAuth>
            }
          />

          <Route
            path="/admin/tests"
            element={
              <RequireAdmin user={user}>
                <AdminTestsPage />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/tests/new"
            element={
              <RequireAdmin user={user}>
                <TestEditorPage />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/tests/:id/edit"
            element={
              <RequireAdmin user={user}>
                <TestEditorPage />
              </RequireAdmin>
            }
          />

          <Route
            path="/admin/tests/:id/results"
            element={
              <RequireAdmin user={user}>
                <AdminTestResultsPage />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
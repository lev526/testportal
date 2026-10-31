import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { apiRequest } from './api';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

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
            element={user ? <Navigate to="/" replace /> : <LoginPage setUser={setUser} />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" replace /> : <RegisterPage setUser={setUser} />}
          />

          <Route
            path="/"
            element={
              <RequireAuth user={user}>
                <div className="card p-4">
                  <h4>Доступные тесты</h4>
                  <p className="text-muted mb-0">
                    Добро пожаловать, {user?.login}! Список тестов подключим в следующих сессиях.
                  </p>
                </div>
              </RequireAuth>
            }
          />

          <Route
            path="/my/attempts"
            element={
              <RequireAuth user={user}>
                <div className="card p-4">
                  <h4>Мои попытки</h4>
                  <p className="text-muted mb-0">История попыток появится в 8-й сессии.</p>
                </div>
              </RequireAuth>
            }
          />

          <Route
            path="/admin/tests"
            element={
              <RequireAdmin user={user}>
                <div className="card p-4">
                  <h4>Редактор тестов (Админ-панель)</h4>
                  <p className="text-muted mb-0">Редактор тестов реализуем в 6-й сессии.</p>
                </div>
              </RequireAdmin>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
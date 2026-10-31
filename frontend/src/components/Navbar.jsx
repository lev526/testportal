import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await apiRequest('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      navigate('/login');
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container">
        <Link className="navbar-brand" to="/">
          Тестовый портал
        </Link>

        <div className="collapse navbar-collapse show">
          {user ? (
            <>
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <Link className="nav-link" to="/">
                    Доступные тесты
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/my/attempts">
                    Мои попытки
                  </Link>
                </li>
                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className="nav-link text-warning" to="/admin/tests">
                      Редактор тестов
                    </Link>
                  </li>
                )}
              </ul>

              <div className="d-flex align-items-center gap-3">
                <span className="text-light small">
                  {user.login}{' '}
                  <span className="badge bg-secondary">{user.role}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm"
                  onClick={handleLogout}
                >
                  Выйти
                </button>
              </div>
            </>
          ) : (
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/login">
                  Вход
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/register">
                  Регистрация
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
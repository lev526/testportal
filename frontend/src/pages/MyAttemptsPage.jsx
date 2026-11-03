import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';

export default function MyAttemptsPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/api/my/attempts')
      .then((data) => setAttempts(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="alert alert-info">Загрузка истории попыток...</div>;
  }

  return (
    <div>
      <h3 className="mb-3">Мои попытки</h3>

      {error && <div className="alert alert-danger">{error}</div>}

      {attempts.length === 0 ? (
        <div className="card p-4 text-center text-muted">
          Вы ещё не завершили ни одного теста.
        </div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Тест</th>
                <th>Завершено</th>
                <th>Баллы</th>
                <th>Процент</th>
                <th className="text-end">Детали</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td className="fw-semibold">{a.test_title}</td>
                  <td className="small text-muted">{a.finished_at}</td>
                  <td>
                    {a.score} из {a.max_score}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        a.percentage >= 70
                          ? 'bg-success'
                          : a.percentage >= 40
                          ? 'bg-warning text-dark'
                          : 'bg-danger'
                      }`}
                    >
                      {a.percentage}%
                    </span>
                  </td>
                  <td className="text-end">
                    <Link
                      to={`/attempts/${a.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Результат
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
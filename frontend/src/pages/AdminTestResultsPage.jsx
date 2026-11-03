import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api';

export default function AdminTestResultsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest(`/api/tests/${id}/results`)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="alert alert-info">Загрузка результатов...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="alert alert-danger">{error}</div>
        <Link to="/admin/tests" className="btn btn-outline-secondary">
          Назад к списку тестов
        </Link>
      </div>
    );
  }

  const { test, attempts } = data;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-1">Результаты по тесту</h3>
          <div className="text-muted">
            #{test.id} — {test.title}
          </div>
        </div>
        <Link to="/admin/tests" className="btn btn-outline-secondary">
          Назад к редактору
        </Link>
      </div>

      {attempts.length === 0 ? (
        <div className="card p-4 text-center text-muted">
          По этому тесту пока нет завершённых попыток.
        </div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID попытки</th>
                <th>Пользователь</th>
                <th>Начало</th>
                <th>Завершено</th>
                <th>Баллы</th>
                <th>Итог</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td className="fw-semibold">{a.user_login}</td>
                  <td className="small text-muted">{a.started_at}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
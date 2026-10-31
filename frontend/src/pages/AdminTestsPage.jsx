import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';

export default function AdminTestsPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadTests() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/tests');
      setTests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();
  }, []);

  async function handleDelete(id, title) {
    if (!window.confirm(`Удалить тест «${title}» со всеми вопросами и попытками?`)) {
      return;
    }
    setError('');
    try {
      await apiRequest(`/api/tests/${id}`, { method: 'DELETE' });
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="alert alert-info">Загрузка списка тестов...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Управление тестами</h3>
        <Link to="/admin/tests/new" className="btn btn-primary">
          + Создать тест
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {tests.length === 0 ? (
        <div className="card p-4 text-center text-muted">
          Тестов пока нет. Нажмите «Создать тест», чтобы добавить первый.
        </div>
      ) : (
        <div className="table-responsive card shadow-sm">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>Название</th>
                <th>Вопросов</th>
                <th>Лимит попыток</th>
                <th>Статус</th>
                <th className="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td>{test.id}</td>
                  <td>
                    <div className="fw-semibold">{test.title}</div>
                    {test.description && (
                      <div className="small text-muted">{test.description}</div>
                    )}
                  </td>
                  <td>{test.questions_count}</td>
                  <td>{test.max_attempts}</td>
                  <td>
                    {test.has_attempts ? (
                      <span className="badge bg-warning text-dark">
                        Есть попытки (структура зафиксирована)
                      </span>
                    ) : (
                      <span className="badge bg-success">Можно менять всё</span>
                    )}
                  </td>
                  <td className="text-end">
                    <div className="btn-group btn-group-sm">
                      <Link
                        to={`/admin/tests/${test.id}/edit`}
                        className="btn btn-outline-primary"
                      >
                        Редактировать
                      </Link>
                      <Link
                        to={`/admin/tests/${test.id}/results`}
                        className="btn btn-outline-secondary"
                      >
                        Результаты
                      </Link>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => handleDelete(test.id, test.title)}
                      >
                        Удалить
                      </button>
                    </div>
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
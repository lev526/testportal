import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function TestsListPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest('/api/tests')
      .then((data) => setTests(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(testId) {
    setError('');
    setStartingId(testId);
    try {
      const attemptData = await apiRequest(`/api/tests/${testId}/start`, {
        method: 'POST',
      });
      navigate(`/tests/${testId}/take`, { state: attemptData });
    } catch (err) {
      setError(err.message);
      setStartingId(null);
    }
  }

  if (loading) {
    return <div className="alert alert-info">Загрузка доступных тестов...</div>;
  }

  return (
    <div>
      <h3 className="mb-3">Доступные тесты</h3>

      {error && <div className="alert alert-danger">{error}</div>}

      {tests.length === 0 ? (
        <div className="card p-4 text-center text-muted">
          Доступных тестов пока нет.
        </div>
      ) : (
        <div className="row g-3">
          {tests.map((test) => {
            const canStart =
              test.remaining_attempts > 0 && test.questions_count > 0;

            return (
              <div key={test.id} className="col-md-6">
                <div className="card h-100 shadow-sm">
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{test.title}</h5>
                    {test.description && (
                      <p className="card-text text-muted small">
                        {test.description}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                      <div className="small">
                        <div>Вопросов: {test.questions_count}</div>
                        <div>
                          Осталось попыток:{' '}
                          <span
                            className={
                              test.remaining_attempts > 0
                                ? 'fw-bold text-success'
                                : 'fw-bold text-danger'
                            }
                          >
                            {test.remaining_attempts} из {test.max_attempts}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!canStart || startingId === test.id}
                        onClick={() => handleStart(test.id)}
                      >
                        {startingId === test.id
                          ? 'Запуск...'
                          : test.remaining_attempts === 0
                          ? 'Попытки исчерпаны'
                          : 'Начать тест'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
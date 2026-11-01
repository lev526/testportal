import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api';

export default function AttemptResultPage() {
  const { id } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest(`/api/attempts/${id}`)
      .then((data) => setAttempt(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="alert alert-info">Загрузка результата...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="btn btn-outline-primary">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <div className="card shadow-sm text-center p-4">
          <h3 className="mb-2">Результат прохождения</h3>
          <p className="text-muted mb-4">{attempt.test_title}</p>

          <div className="display-4 fw-bold text-primary mb-2">
            {attempt.percentage}%
          </div>

          <p className="fs-5 mb-4">
            Набрано баллов: <strong>{attempt.score}</strong> из{' '}
            <strong>{attempt.max_score}</strong>
          </p>

          <div className="small text-muted mb-4">
            <div>Начало: {attempt.started_at}</div>
            <div>Завершено: {attempt.finished_at || 'в процессе'}</div>
          </div>

          <div className="d-flex justify-content-center gap-2">
            <Link to="/" className="btn btn-primary">
              К списку тестов
            </Link>
            <Link to="/my/attempts" className="btn btn-outline-secondary">
              Мои попытки
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
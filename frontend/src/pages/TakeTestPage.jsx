import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function TakeTestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const attemptData = location.state;

  const [selected, setSelected] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState('');

  if (!attemptData || !attemptData.attempt_id) {
    return <Navigate to="/" replace />;
  }

  const { attempt_id: attemptId, test, questions } = attemptData;

  function handleSingleChange(questionId, answerId) {
    setSelected((prev) => ({
      ...prev,
      [questionId]: [answerId],
    }));
  }

  function handleMultipleChange(questionId, answerId, checked) {
    setSelected((prev) => {
      const current = prev[questionId] || [];
      const updated = checked
        ? [...current, answerId]
        : current.filter((id) => id !== answerId);

      return {
        ...prev,
        [questionId]: updated,
      };
    });
  }

  async function handleExit() {
    setExiting(true);
    try {
      await apiRequest(`/api/attempts/${attemptId}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    } finally {
      navigate(-1);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await apiRequest(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: { answers: selected },
      });
      navigate(`/attempts/${attemptId}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-1">{test.title}</h3>
          {test.description && (
            <div className="text-muted">{test.description}</div>
          )}
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          disabled={exiting || submitting}
          onClick={handleExit}
        >
          {exiting ? 'Выход...' : 'Выйти без завершения'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        {questions.map((q, index) => {
          const chosen = selected[q.id] || [];

          return (
            <div key={q.id} className="card shadow-sm mb-4">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <span className="fw-semibold">
                  Вопрос №{index + 1}{' '}
                  <span className="text-muted fw-normal small">
                    (
                    {q.type === 'single'
                      ? 'один вариант'
                      : 'несколько вариантов'}
                    )
                  </span>
                </span>
                <span className="badge bg-secondary">Вес: {q.weight}</span>
              </div>

              <div className="card-body">
                <p className="fw-semibold mb-3">{q.text}</p>

                {q.image_path && (
                  <div className="mb-3">
                    <img
                      src={q.image_path}
                      alt={`Иллюстрация к вопросу ${index + 1}`}
                      className="img-fluid rounded border"
                      style={{ maxHeight: '280px' }}
                    />
                  </div>
                )}

                <div className="d-flex flex-column gap-2">
                  {q.answers.map((a) => {
                    const isChecked = chosen.includes(a.id);
                    const inputId = `q_${q.id}_a_${a.id}`;

                    return (
                      <div key={a.id} className="form-check">
                        <input
                          id={inputId}
                          className="form-check-input"
                          type={q.type === 'single' ? 'radio' : 'checkbox'}
                          name={`question_${q.id}`}
                          checked={isChecked}
                          onChange={(e) =>
                            q.type === 'single'
                              ? handleSingleChange(q.id, a.id)
                              : handleMultipleChange(
                                  q.id,
                                  a.id,
                                  e.target.checked
                                )
                          }
                        />
                        <label className="form-check-label" htmlFor={inputId}>
                          {a.text}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <div className="d-flex justify-content-end">
          <button
            type="submit"
            className="btn btn-success btn-lg"
            disabled={submitting || exiting}
          >
            {submitting ? 'Отправка ответов...' : 'Завершить тест'}
          </button>
        </div>
      </form>
    </div>
  );
}
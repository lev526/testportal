import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';

let uidCounter = 1;
function makeUid() {
  return `uid_${Date.now()}_${uidCounter++}`;
}

function createEmptyAnswer(isCorrect = false) {
  return {
    uid: makeUid(),
    text: '',
    is_correct: isCorrect,
  };
}

function createEmptyQuestion() {
  return {
    uid: makeUid(),
    text: '',
    type: 'single',
    weight: 1,
    image_path: '',
    answers: [createEmptyAnswer(true), createEmptyAnswer(false)],
  };
}

export default function TestEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    max_attempts: 1,
    has_attempts: false,
    questions: [createEmptyQuestion()],
  });

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingUid, setUploadingUid] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    apiRequest(`/api/tests/${id}/edit`)
      .then((data) => {
        setForm({
          title: data.title,
          description: data.description || '',
          max_attempts: data.max_attempts,
          has_attempts: Boolean(data.has_attempts),
          questions: (data.questions || []).map((q) => ({
            uid: makeUid(),
            text: q.text,
            type: q.type,
            weight: q.weight,
            image_path: q.image_path || '',
            answers: (q.answers || []).map((a) => ({
              uid: makeUid(),
              text: a.text,
              is_correct: Boolean(a.is_correct),
            })),
          })),
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addQuestion() {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion()],
    }));
  }

  function removeQuestion(qUid) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.uid !== qUid),
    }));
  }

  function updateQuestion(qUid, changes) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.uid !== qUid) return q;
        const updated = { ...q, ...changes };

        // Если переключили тип на single, оставляем максимум один правильный ответ
        if (changes.type === 'single') {
          let foundFirst = false;
          updated.answers = updated.answers.map((a) => {
            if (a.is_correct && !foundFirst) {
              foundFirst = true;
              return a;
            }
            return { ...a, is_correct: false };
          });
        }
        return updated;
      }),
    }));
  }

  function addAnswer(qUid) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.uid === qUid
          ? { ...q, answers: [...q.answers, createEmptyAnswer(false)] }
          : q
      ),
    }));
  }

  function removeAnswer(qUid, aUid) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.uid === qUid
          ? { ...q, answers: q.answers.filter((a) => a.uid !== aUid) }
          : q
      ),
    }));
  }

  function updateAnswerText(qUid, aUid, text) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.uid === qUid
          ? {
              ...q,
              answers: q.answers.map((a) =>
                a.uid === aUid ? { ...a, text } : a
              ),
            }
          : q
      ),
    }));
  }

  function toggleAnswerCorrect(qUid, aUid, checked) {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.uid !== qUid) return q;

        if (q.type === 'single') {
          return {
            ...q,
            answers: q.answers.map((a) => ({
              ...a,
              is_correct: a.uid === aUid,
            })),
          };
        }

        return {
          ...q,
          answers: q.answers.map((a) =>
            a.uid === aUid ? { ...a, is_correct: checked } : a
          ),
        };
      }),
    }));
  }

  async function handleImageUpload(qUid, file) {
    if (!file) return;
    setError('');
    setUploadingUid(qUid);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData,
      });
      updateQuestion(qUid, { image_path: res.path });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingUid(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        max_attempts: Number(form.max_attempts),
      };

      // Если у теста ещё нет попыток, отправляем вопросы и ответы
      if (!form.has_attempts) {
        payload.questions = form.questions.map((q) => ({
          text: q.text,
          type: q.type,
          weight: Number(q.weight),
          image_path: q.image_path || null,
          answers: q.answers.map((a) => ({
            text: a.text,
            is_correct: Boolean(a.is_correct),
          })),
        }));
      }

      if (isEdit) {
        await apiRequest(`/api/tests/${id}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await apiRequest('/api/tests', {
          method: 'POST',
          body: payload,
        });
      }

      navigate('/admin/tests');
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="alert alert-info">Загрузка теста...</div>;
  }

  const questionsLocked = isEdit && form.has_attempts;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">
          {isEdit ? `Редактирование теста #${id}` : 'Создание нового теста'}
        </h3>
        <Link to="/admin/tests" className="btn btn-outline-secondary">
          Назад к списку
        </Link>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {questionsLocked && (
        <div className="alert alert-warning">
          По этому тесту уже есть попытки пользователей. Вопросы и ответы
          заблокированы для изменения, чтобы сохранить историю прохождений, но
          вы можете изменить название, описание и лимит попыток.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label fw-semibold">Название теста</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Лимит попыток</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={form.max_attempts}
                  onChange={(e) => updateField('max_attempts', e.target.value)}
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label fw-semibold">Описание</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <h4 className="mb-3">Вопросы ({form.questions.length})</h4>

        {form.questions.map((q, qIndex) => (
          <div key={q.uid} className="card shadow-sm mb-4">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Вопрос №{qIndex + 1}</span>
              {!questionsLocked && form.questions.length > 1 && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => removeQuestion(q.uid)}
                >
                  Удалить вопрос
                </button>
              )}
            </div>

            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">Текст вопроса</label>
                  <input
                    type="text"
                    className="form-control"
                    value={q.text}
                    disabled={questionsLocked}
                    onChange={(e) =>
                      updateQuestion(q.uid, { text: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Тип вопроса</label>
                  <select
                    className="form-select"
                    value={q.type}
                    disabled={questionsLocked}
                    onChange={(e) =>
                      updateQuestion(q.uid, { type: e.target.value })
                    }
                  >
                    <option value="single">Один вариант (single)</option>
                    <option value="multiple">Несколько (multiple)</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label">Вес (баллы)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={q.weight}
                    disabled={questionsLocked}
                    onChange={(e) =>
                      updateQuestion(q.uid, { weight: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Картинка к вопросу</label>
                {!questionsLocked && (
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="form-control"
                    disabled={uploadingUid === q.uid}
                    onChange={(e) =>
                      handleImageUpload(q.uid, e.target.files?.[0])
                    }
                  />
                )}
                {uploadingUid === q.uid && (
                  <div className="small text-muted mt-1">Загрузка файла...</div>
                )}
                {q.image_path && (
                  <div className="mt-2 d-flex align-items-center gap-3">
                    <img
                      src={q.image_path}
                      alt="Предпросмотр"
                      className="img-thumbnail"
                      style={{ maxHeight: '140px' }}
                    />
                    {!questionsLocked && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() =>
                          updateQuestion(q.uid, { image_path: '' })
                        }
                      >
                        Убрать картинку
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-2 fw-semibold">
                Варианты ответов (отметьте правильные):
              </div>

              {q.answers.map((a, aIndex) => (
                <div key={a.uid} className="input-group mb-2">
                  <div className="input-group-text">
                    <input
                      className="form-check-input mt-0"
                      type={q.type === 'single' ? 'radio' : 'checkbox'}
                      name={`correct_${q.uid}`}
                      checked={a.is_correct}
                      disabled={questionsLocked}
                      onChange={(e) =>
                        toggleAnswerCorrect(q.uid, a.uid, e.target.checked)
                      }
                      title="Правильный ответ"
                    />
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Ответ №${aIndex + 1}`}
                    value={a.text}
                    disabled={questionsLocked}
                    onChange={(e) =>
                      updateAnswerText(q.uid, a.uid, e.target.value)
                    }
                    required
                  />
                  {!questionsLocked && q.answers.length > 2 && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => removeAnswer(q.uid, a.uid)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {!questionsLocked && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm mt-1"
                  onClick={() => addAnswer(q.uid)}
                >
                  + Добавить вариант ответа
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="d-flex justify-content-between align-items-center mt-4">
          {!questionsLocked ? (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={addQuestion}
            >
              + Добавить вопрос
            </button>
          ) : (
            <div />
          )}

          <button type="submit" className="btn btn-success btn-lg" disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить тест'}
          </button>
        </div>
      </form>
    </div>
  );
}
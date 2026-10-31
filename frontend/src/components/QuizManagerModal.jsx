import React, { useState, useEffect } from 'react';
import { X, Plus, BookOpen, Check, Play, Trash2, HelpCircle } from 'lucide-react';

export default function QuizManagerModal({
  isOpen,
  onClose,
  currentQuizId,
  onSelectQuiz,
}) {
  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [loading, setLoading] = useState(false);

  // New Quiz Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    {
      question_text: '',
      time_limit: 20,
      points: 1000,
      options: [
        { option_text: '', is_correct: true, color: 'blue', shape: 'triangle' },
        { option_text: '', is_correct: false, color: 'red', shape: 'diamond' },
        { option_text: '', is_correct: false, color: 'orange', shape: 'circle' },
        { option_text: '', is_correct: false, color: 'green', shape: 'square' },
      ],
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchQuizzes();
    }
  }, [isOpen]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8001/api/quizzes/');
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data);
      }
    } catch (err) {
      console.warn('API fetch error, using local state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        time_limit: 20,
        points: 1000,
        options: [
          { option_text: '', is_correct: true, color: 'blue', shape: 'triangle' },
          { option_text: '', is_correct: false, color: 'red', shape: 'diamond' },
          { option_text: '', is_correct: false, color: 'orange', shape: 'circle' },
          { option_text: '', is_correct: false, color: 'green', shape: 'square' },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (idx) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch('http://localhost:8001/api/quizzes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          questions,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setQuizzes([created, ...quizzes]);
        setActiveTab('list');
        onSelectQuiz(created.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create quiz:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <BookOpen size={22} className="modal-title-icon" />
            <h2>Quizlar Ro'yxati & Boshqarish</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Mavjud Quizlar ({quizzes.length})
          </button>
          <button
            className={`modal-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            + Yangi Quiz Qo'shish
          </button>
        </div>

        {/* Tab 1: Quiz List */}
        {activeTab === 'list' && (
          <div className="modal-body-list">
            {loading ? (
              <p className="loading-text">Yuklanmoqda...</p>
            ) : quizzes.length === 0 ? (
              <p className="empty-text">Hozircha quizlar yo'q.</p>
            ) : (
              <div className="quizzes-cards-grid">
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    className={`quiz-select-card glass-card ${currentQuizId === q.id ? 'selected' : ''}`}
                  >
                    <div className="quiz-card-info">
                      <h3>{q.title}</h3>
                      <p>{q.description || 'Tavsif berilmagan'}</p>
                      <span className="q-count-badge">{q.questions_count || 10} ta savol</span>
                    </div>
                    <div className="quiz-card-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => {
                          onSelectQuiz(q.id);
                          onClose();
                        }}
                      >
                        <Play size={14} />
                        <span>Tanlash</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Quiz */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateQuiz} className="modal-create-form">
            <div className="form-group">
              <label className="form-label">Quiz Nomi</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Tarix & Madaniyat Savollari"
                className="input-text-field"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tavsif (Description)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qisqacha ta'rif"
                className="input-text-field"
              />
            </div>

            <div className="questions-builder-list">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="question-builder-card glass-card">
                  <div className="qb-header">
                    <h4>Savol #{qIndex + 1}</h4>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="btn-delete-q"
                        onClick={() => handleRemoveQuestion(qIndex)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Savol matnini kiriting..."
                    value={q.question_text}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[qIndex].question_text = e.target.value;
                      setQuestions(updated);
                    }}
                    className="input-text-field q-text-input"
                  />

                  <div className="options-builder-grid">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className={`opt-builder-row opt-${opt.color}`}>
                        <input
                          type="radio"
                          name={`correct_${qIndex}`}
                          checked={opt.is_correct}
                          onChange={() => {
                            const updated = [...questions];
                            updated[qIndex].options.forEach((o, i) => {
                              o.is_correct = i === optIndex;
                            });
                            setQuestions(updated);
                          }}
                          title="To'g'ri javob qilib belgilash"
                        />
                        <input
                          type="text"
                          required
                          placeholder={`Variant ${optIndex + 1} (${opt.color})`}
                          value={opt.option_text}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[qIndex].options[optIndex].option_text = e.target.value;
                            setQuestions(updated);
                          }}
                          className="opt-input"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="btn-secondary add-q-btn" onClick={handleAddQuestion}>
              <Plus size={16} />
              <span>+ Yana Savol Qo'shish</span>
            </button>

            <div className="modal-form-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Bekor Qilish
              </button>
              <button type="submit" className="btn-primary">
                Quizni Saqlash & Tanlash
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Play,
  Trash2,
  Edit3,
  MoreHorizontal,
  Clock,
  Users,
  Search,
  Layers,
  ChevronDown,
  Trophy,
  FileText,
  Check,
  ArrowLeft,
  BookOpen,
  User,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { soundManager } from '../utils/soundEffects';

export default function QuizManagerModal({
  isOpen,
  onClose,
  currentQuizId,
  onSelectQuiz,
  authUser,
}) {
  const [quizzes, setQuizzes] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'my' | 'create'
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);

  // New / Edit Quiz Form State
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
      setActiveMenuId(null);
    }
  }, [isOpen, authUser]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    if (activeMenuId !== null) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeMenuId]);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quizzes/', {
        headers: authUser?.id ? { 'X-User-Id': String(authUser.id) } : {},
        credentials: 'include',
      });
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

  const handleOpenCreate = () => {
    soundManager.playClick();
    setEditingQuizId(null);
    setTitle('');
    setDescription('');
    setQuestions([
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
    setActiveTab('create');
  };

  const handleEditClick = async (quiz) => {
    soundManager.playClick();
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setDescription(quiz.description || '');

    // Fetch full quiz detail to populate questions
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/`, {
        headers: authUser?.id ? { 'X-User-Id': String(authUser.id) } : {},
        credentials: 'include',
      });
      if (res.ok) {
        const fullQuiz = await res.json();
        if (fullQuiz.questions && fullQuiz.questions.length > 0) {
          setQuestions(
            fullQuiz.questions.map((q) => ({
              question_text: q.question_text,
              time_limit: q.time_limit || 20,
              points: q.points || 1000,
              options: (q.options || []).map((opt) => ({
                option_text: opt.option_text,
                is_correct: Boolean(opt.is_correct),
                color: opt.color || 'blue',
                shape: opt.shape || 'triangle',
              })),
            }))
          );
        }
      }
    } catch (e) {
      console.warn('Error fetching quiz details for edit:', e);
    }

    setActiveTab('create');
  };

  const handleAddQuestion = () => {
    soundManager.playClick();
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
    soundManager.playClick();
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleDeleteQuiz = async (quizId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Rostdan ham ushbu quizni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/quizzes/${quizId}/`, {
        method: 'DELETE',
        headers: {
          ...(authUser?.id ? { 'X-User-Id': String(authUser.id) } : {}),
        },
        credentials: 'include',
      });
      if (res.ok) {
        soundManager.playAvatarPop(400);
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Quizni o'chirish huquqingiz yo'q!");
      }
    } catch (err) {
      console.error('Delete quiz error:', err);
    }
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    soundManager.playSpinLand();

    try {
      const url = editingQuizId ? `/api/quizzes/${editingQuizId}/` : '/api/quizzes/';
      const method = editingQuizId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authUser?.id ? { 'X-User-Id': String(authUser.id) } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          questions,
          user_id: authUser?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchQuizzes();
        setActiveTab('all');
        if (!editingQuizId && data.id) {
          onSelectQuiz(data.id, false);
          onClose();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Quiz saqlashda xatolik yuz berdi.");
      }
    } catch (err) {
      console.error('Failed to save quiz:', err);
      alert("Serverga ulanishda xatolik yuz berdi.");
    }
  };

  const handlePlayClick = (quiz) => {
    soundManager.playClick();
    onSelectQuiz(quiz.id, false);
    onClose();
  };

  // Human friendly time format
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Yaqinda';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Bugun';
      if (diffDays === 1) return 'Kecha';
      if (diffDays < 7) return `${diffDays} kun oldin`;
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks <= 4) return `${diffWeeks} hafta oldin`;
      return `${Math.floor(diffDays / 30)} oy oldin`;
    } catch (e) {
      return 'Yaqinda';
    }
  };

  // Filter quizzes based on activeTab, searchQuery, and selectedCategory
  const filteredQuizzes = quizzes.filter((q) => {
    if (activeTab === 'my' && !q.is_owner) {
      return false;
    }
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const titleMatch = q.title?.toLowerCase().includes(qLower);
      const descMatch = q.description?.toLowerCase().includes(qLower);
      if (!titleMatch && !descMatch) return false;
    }
    if (selectedCategory !== 'all') {
      const text = `${q.title} ${q.description}`.toLowerCase();
      if (selectedCategory === 'it' && !text.includes('it') && !text.includes('dastur') && !text.includes('kod') && !text.includes('web') && !text.includes('python')) return false;
      if (selectedCategory === 'geo' && !text.includes('geo') && !text.includes('dunyo') && !text.includes('davlat') && !text.includes('shahar') && !text.includes('poytaxt')) return false;
      if (selectedCategory === 'science' && !text.includes('kimyo') && !text.includes('fizika') && !text.includes('fan') && !text.includes('biolog')) return false;
      if (selectedCategory === 'history' && !text.includes('tarix') && !text.includes('madaniyat') && !text.includes('sivilizats')) return false;
      if (selectedCategory === 'general' && !text.includes('umumiy') && !text.includes('mantiq') && !text.includes('savol')) return false;
    }
    return true;
  });

  if (!isOpen) return null;

  const myQuizzesCount = quizzes.filter((q) => q.is_owner).length;
  const userInitial = authUser?.username ? authUser.username[0].toUpperCase() : 'A';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="quiz-manager-container glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* --- 1. Top Navbar / Header Bar --- */}
        <div className="qm-top-navbar">
          <div className="qm-brand-group">
            <div className="qm-logo-wrap">
              <Trophy size={24} className="qm-trophy-icon" />
            </div>
            <div className="qm-brand-titles">
              <h2 className="qm-main-title">QuizArena</h2>
              <span className="qm-subtitle">O'zingizga mos quizni tanlang yoki yarating!</span>
            </div>
          </div>

          <div className="qm-nav-tabs-group">
            <button
              className={`qm-nav-pill-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => {
                soundManager.playClick();
                setActiveTab('all');
              }}
            >
              <span className="tab-pill-icon">▦</span>
              <span>Barcha Quizlar ({quizzes.length})</span>
            </button>

            <button
              className={`qm-nav-pill-btn ${activeTab === 'my' ? 'active' : ''}`}
              onClick={() => {
                soundManager.playClick();
                setActiveTab('my');
              }}
            >
              <User size={15} />
              <span>Mening Quizlarim ({myQuizzesCount})</span>
            </button>

            <button
              className={`qm-nav-pill-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>+ Yangi Quiz Qo'shish</span>
            </button>

            {/* User Avatar Circle */}
            <div className="qm-user-avatar-circle" title={authUser?.username || 'Foydalanuvchi'}>
              {userInitial}
            </div>

            {/* Close Button */}
            <button className="qm-close-button" onClick={onClose} title="Yopish">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* --- Tab Content --- */}
        {activeTab === 'create' ? (
          /* --- Create / Edit Quiz Form --- */
          <div className="qm-create-quiz-view">
            <div className="qm-create-header">
              <button
                type="button"
                className="btn-back-to-list"
                onClick={() => setActiveTab('all')}
              >
                <ArrowLeft size={16} />
                <span>Quizlar ro'yxatiga qaytish</span>
              </button>
              <h3 className="qm-create-title">
                {editingQuizId ? "Quizni Tahrirlash" : "Yangi Quiz Yaratish"}
              </h3>
            </div>

            <form onSubmit={handleSaveQuiz} className="modal-create-form">
              <div className="form-group">
                <label className="form-label">Quiz Nomi *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: Dunyo Geografiyasi & Poytaxtlar"
                  className="input-text-field"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tavsif (Description)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dunyo mamlakatlari, poytaxtlari va geografik ma'lumotlar bo'yicha savollar."
                  className="input-text-field"
                />
              </div>

              <div className="questions-builder-list">
                <div className="qb-section-title">
                  <BookOpen size={18} className="stat-orange-icon" />
                  <h4>Savollar ro'yxati ({questions.length} ta)</h4>
                </div>

                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="question-builder-card glass-card">
                    <div className="qb-header">
                      <h4>Savol #{qIndex + 1}</h4>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          className="btn-delete-q"
                          onClick={() => handleRemoveQuestion(qIndex)}
                          title="Savolni o'chirish"
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
                        const newQ = [...questions];
                        newQ[qIndex].question_text = e.target.value;
                        setQuestions(newQ);
                      }}
                      className="input-text-field q-text-input"
                    />

                    <div className="qb-meta-row">
                      <div className="qb-meta-item">
                        <label>Vaqt (soniya):</label>
                        <select
                          value={q.time_limit}
                          onChange={(e) => {
                            const newQ = [...questions];
                            newQ[qIndex].time_limit = Number(e.target.value);
                            setQuestions(newQ);
                          }}
                        >
                          <option value={10}>10s</option>
                          <option value={20}>20s</option>
                          <option value={30}>30s</option>
                          <option value={60}>60s</option>
                        </select>
                      </div>

                      <div className="qb-meta-item">
                        <label>Ball:</label>
                        <select
                          value={q.points}
                          onChange={(e) => {
                            const newQ = [...questions];
                            newQ[qIndex].points = Number(e.target.value);
                            setQuestions(newQ);
                          }}
                        >
                          <option value={500}>500 pts</option>
                          <option value={1000}>1000 pts (Standart)</option>
                          <option value={2000}>2000 pts (Ikki barobar)</option>
                        </select>
                      </div>
                    </div>

                    <div className="options-builder-grid">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className={`opt-builder-row opt-${opt.color}`}>
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={opt.is_correct}
                            onChange={() => {
                              const newQ = [...questions];
                              newQ[qIndex].options.forEach((o, i) => {
                                o.is_correct = i === optIndex;
                              });
                              setQuestions(newQ);
                            }}
                            title="To'g'ri javob sifatida belgilash"
                          />
                          <input
                            type="text"
                            required
                            placeholder={`Javob #${optIndex + 1}`}
                            value={opt.option_text}
                            onChange={(e) => {
                              const newQ = [...questions];
                              newQ[qIndex].options[optIndex].option_text = e.target.value;
                              setQuestions(newQ);
                            }}
                            className="opt-input"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-add-q"
                  onClick={handleAddQuestion}
                >
                  <Plus size={16} />
                  <span>+ Yangi Savol Qo'shish</span>
                </button>
              </div>

              <div className="modal-form-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab('all')}
                >
                  Bekor qilish
                </button>
                <button type="submit" className="btn-primary">
                  <Check size={18} />
                  <span>{editingQuizId ? "O'zgarishlarni Saqlash" : "Quizni Yaratish"}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* --- List View (All Quizzes / My Quizzes) Matching the Mockup --- */
          <div className="qm-list-view">
            {/* --- 2. Hero Banner with Glowing 3D Trophy --- */}
            <div className="qm-hero-banner glass-panel">
              <div className="qm-hero-left">
                <span className="qm-hero-accent-pill" />
                <div className="qm-hero-text">
                  <h1 className="qm-hero-title">
                    Quizlar <span className="highlight-orange">Ro'yxati</span>
                  </h1>
                  <p className="qm-hero-subtitle">
                    Eng qiziqarli va foydali viktorinalarni kashf eting!
                  </p>
                </div>
              </div>

              <div className="qm-hero-right">
                <div className="qm-trophy-glow-frame">
                  <div className="qm-orbital-ring ring-1" />
                  <div className="qm-orbital-ring ring-2" />
                  <img
                    src="/assets/quiz_trophy_hero.jpg"
                    alt="Championship Trophy"
                    className="qm-trophy-art-image"
                  />
                  <Sparkles size={20} className="qm-star-sparkle sparkle-top" />
                  <Sparkles size={16} className="qm-star-sparkle sparkle-bottom" />
                </div>
              </div>
            </div>

            {/* --- 3. Search & Category Filter & Action Bar --- */}
            <div className="qm-filter-bar">
              {/* Search Field */}
              <div className="qm-search-input-wrap">
                <Search size={18} className="qm-search-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Quiz qidirish..."
                  className="qm-search-input"
                />
                {searchQuery && (
                  <button
                    className="qm-search-clear-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Filter Dropdown */}
              <div className="qm-category-select-wrap">
                <Layers size={18} className="qm-category-icon" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="qm-category-select"
                >
                  <option value="all">Barchasi</option>
                  <option value="it">Dasturlash & IT</option>
                  <option value="geo">Dunyo Geografiyasi</option>
                  <option value="science">Kimyo & Fan</option>
                  <option value="history">Tarix & Madaniyat</option>
                  <option value="general">Umumiy Bilimlar</option>
                </select>
                <ChevronDown size={16} className="qm-category-chevron" />
              </div>

              {/* Primary Action Button */}
              <button
                className="qm-btn-create-orange"
                onClick={handleOpenCreate}
                title="Yangi quiz yaratish"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Yangi Quiz Yaratish</span>
              </button>
            </div>

            {/* --- 4. Quiz Cards List --- */}
            {loading ? (
              <div className="qm-loading-box">
                <div className="loading-spinner" />
                <span>Quizlar yuklanmoqda...</span>
              </div>
            ) : filteredQuizzes.length > 0 ? (
              <div className="qm-quiz-rows-list">
                {filteredQuizzes.map((q) => {
                  const isSelected = currentQuizId === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`qm-quiz-row-card glass-panel ${isSelected ? 'is-selected-card' : ''}`}
                    >
                      {/* Left: Orange Accent Bar + Title & Description */}
                      <div className="qm-card-left">
                        <span className="qm-row-accent-bar" />
                        <div className="qm-card-content">
                          <div className="qm-title-row">
                            <h3 className="qm-card-title">{q.title}</h3>
                            {isSelected && (
                              <span className="qm-selected-badge">
                                <Check size={12} strokeWidth={3} />
                                Tanlangan
                              </span>
                            )}
                          </div>
                          <p className="qm-card-desc">
                            {q.description || "Dunyo mamlakatlari, poytaxtlari va geografik ma'lumotlar bo'yicha savollar."}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Stats */}
                      <div className="qm-card-stats">
                        <div className="qm-stat-item">
                          <Play size={15} className="qm-stat-orange-icon fill-play" />
                          <span><strong>{q.questions_count || 10}</strong> ta savol</span>
                        </div>
                        <div className="qm-stat-item">
                          <Users size={15} className="qm-stat-orange-icon" />
                          <span><strong>{q.times_played || 189}</strong> marta o'ynalgan</span>
                        </div>
                        <div className="qm-stat-item">
                          <Clock size={15} className="qm-stat-orange-icon" />
                          <span>So'nggi o'zgarish: {formatTimeAgo(q.created_at)}</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="qm-card-actions">
                        <button
                          className="qm-btn-play-orange"
                          onClick={() => handlePlayClick(q)}
                          title="Ushbu quizni o'ynash yoki xona ochish"
                        >
                          <Play size={16} fill="currentColor" />
                          <span>O'ynash</span>
                        </button>

                        <button
                          className="qm-btn-edit-glass"
                          onClick={() => handleEditClick(q)}
                          title="Quizni tahrirlash"
                        >
                          <Edit3 size={15} />
                          <span>Tahrirlash</span>
                        </button>

                        {/* More Options Dropdown */}
                        <div className="qm-more-menu-container">
                          <button
                            className="qm-btn-more-dots"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === q.id ? null : q.id);
                            }}
                            title="Qo'shimcha amallar"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {activeMenuId === q.id && (
                            <div
                              className="qm-dropdown-popover"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="qm-popover-item"
                                onClick={() => {
                                  onSelectQuiz(q.id, false);
                                  onClose();
                                }}
                              >
                                <Play size={14} className="popover-icon" />
                                <span>Host sifatida boshlash</span>
                              </button>

                              <button
                                className="qm-popover-item"
                                onClick={() => {
                                  onSelectQuiz(q.id, true);
                                  onClose();
                                }}
                              >
                                <User size={14} className="popover-icon" />
                                <span>Solo tartibda o'ynash</span>
                              </button>

                              {q.is_owner && (
                                <button
                                  className="qm-popover-item delete-danger"
                                  onClick={(e) => handleDeleteQuiz(q.id, e)}
                                >
                                  <Trash2 size={14} />
                                  <span>Quizni o'chirish</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* --- 5. Empty State Card Matching Mockup Bottom Card --- */}
            {filteredQuizzes.length === 0 && !loading && (
              <div className="qm-empty-banner glass-panel">
                <div className="qm-empty-icon-wrap">
                  <div className="qm-empty-doc-icon">
                    <FileText size={42} className="doc-main-icon" />
                    <span className="plus-floating-badge">+</span>
                  </div>
                </div>
                <h3 className="qm-empty-title">Hali hech qanday quiz yo'q</h3>
                <p className="qm-empty-subtitle">
                  Birinchini qiziqarli quiz yaratib, guruhingiz bilan o'ynang!
                </p>
                <button
                  className="qm-btn-create-orange"
                  onClick={handleOpenCreate}
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Yangi Quiz Yaratish</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

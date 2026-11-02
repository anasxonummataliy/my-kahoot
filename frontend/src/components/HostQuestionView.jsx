import React from 'react';
import { Clock, CheckCircle2, XCircle, ArrowRight, BarChart2, Users, FastForward, StopCircle } from 'lucide-react';

export default function HostQuestionView({
  question,
  timeLeft,
  timeLimit = 20,
  status = 'question', // 'question' or 'review'
  answeredCount = 0,
  totalPlayers = 0,
  answerStats = null,
  correctOptionId = null,
  onEndQuestion,
  onShowLeaderboard,
  onNextQuestion,
  onLeaveGame = null,
  onStopCompetition = null,
}) {
  if (!question) return null;

  // Shapes & Colors mapper
  const shapeIcons = {
    triangle: '▲',
    diamond: '◆',
    circle: '●',
    square: '■',
  };

  const colorClasses = {
    blue: 'option-blue',
    red: 'option-red',
    orange: 'option-orange',
    green: 'option-green',
  };

  // Timer ring stroke math
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, timeLeft / timeLimit);
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="host-question-container glass-panel">
      {/* Top Header Bar */}
      <div className="host-q-header">
        <div className="host-q-indicator">
          <span className="q-badge">Question {question.index || 1} / {question.total || 10}</span>
          <span className="points-badge">{question.points || 1000} pts</span>
        </div>

        {/* Live Answered Tracker */}
        <div className="answered-tracker-pill">
          <Users size={16} />
          <span>
            Javob berildi: <strong>{answeredCount}</strong> / {totalPlayers || 1}
          </span>
        </div>

        {/* Host Quick Skip / Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status === 'question' ? (
            <button className="btn-secondary btn-sm" onClick={onEndQuestion} title="Vaqt tugashini kutmasdan natijani ko'rsatish">
              <FastForward size={16} />
              <span>Vaqtni to'xtatish</span>
            </button>
          ) : (
            <div className="review-auto-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 107, 0, 0.15)', border: '1px solid rgba(255, 107, 0, 0.35)', padding: '6px 12px', borderRadius: '999px', fontSize: '0.82rem', color: '#fed7aa', fontWeight: '700' }}>
              <span className="live-pulse-dot" />
              <span>Reyting ochilmoqda...</span>
            </div>
          )}

          {onStopCompetition && (
            <button
              className="btn-danger-soft btn-sm btn-stop-competition"
              onClick={onStopCompetition}
              title="Musobaqani to'xtatish va lobbiga qaytish yoki o'yinni tugatish"
            >
              <StopCircle size={15} />
              <span>Musobaqani to'xtatish</span>
            </button>
          )}


        </div>
      </div>

      {/* Center Countdown Ring */}
      <div className="timer-ring-wrapper">
        <svg className="timer-svg" width="104" height="104" viewBox="0 0 104 104">
          <circle
            className="timer-track"
            cx="52"
            cy="52"
            r={radius}
            strokeWidth="8"
          />
          <circle
            className={`timer-progress ${timeLeft <= 5 ? 'timer-urgent' : ''}`}
            cx="52"
            cy="52"
            r={radius}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className={`timer-number ${timeLeft <= 5 ? 'urgent-pulse' : ''}`}>
          {status === 'question' ? timeLeft : '✓'}
        </div>
      </div>

      {/* Main Question Display */}
      <div className="host-question-text-box">
        <h2 className="host-main-question">{question.question_text}</h2>
      </div>

      {/* 4 Answer Cards Grid (Matching screenshot layout) */}
      <div className="host-answers-grid">
        {(question.options || []).map((opt) => {
          const isCorrect = status === 'review' && (opt.is_correct || opt.id === correctOptionId);
          const isIncorrect = status === 'review' && !isCorrect;
          const voteCount = answerStats?.counts_by_color?.[opt.color] ?? answerStats?.option_counts?.[opt.id] ?? 0;
          const totalAnswers = answerStats?.total_answers || answerStats?.answered_count || 1;
          const percentage = Math.round((voteCount / Math.max(1, totalAnswers)) * 100);

          return (
            <div
              key={opt.id}
              className={`host-answer-card ${colorClasses[opt.color] || 'option-blue'} ${
                isCorrect ? 'is-revealed-correct' : isIncorrect ? 'is-revealed-dimmed' : ''
              }`}
            >
              <div className="card-shape-icon">{shapeIcons[opt.shape] || '▲'}</div>
              <div className="card-answer-text">{opt.option_text}</div>

              {/* Status Review Checkmark / Distribution Bar */}
              {status === 'review' && (
                <div className="answer-review-stats">
                  {isCorrect && (
                    <span className="correct-tag">
                      <CheckCircle2 size={18} />
                      To'g'ri
                    </span>
                  )}
                  <div className="stat-vote-pill">
                    <strong>{voteCount}</strong> ta ({percentage}%)
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer for Host */}
      {status === 'review' && (
        <div className="host-review-actions-bar">
          <div className="review-status-text">
            <span className="live-pulse-dot" style={{ display: 'inline-block', marginRight: '8px' }} />
            <span>Savol yakunlandi. <strong>Reyting avtomatik ochilmoqda...</strong></span>
          </div>
          <div className="review-buttons-group">
            <button className="btn-primary" onClick={onNextQuestion} title="Kutmasdan darhol keyingi savolga o'tish">
              <span>Keyingi Savol</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

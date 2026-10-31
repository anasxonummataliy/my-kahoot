import React, { useState, useEffect } from 'react';
import { Trophy, Check, X, Flame, Shield, Users, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import KahootAvatar from './KahootAvatar';

export default function PlayerGameView({
  question,
  timeLeft = 20,
  timeLimit = 20,
  status = 'question', // 'question' | 'review'
  player,
  selectedOptionId = null,
  onSelectOption,
  answerResult = null,
  correctOptionId = null,
  isTeamMode = true,
}) {
  const [selectedId, setSelectedId] = useState(selectedOptionId);

  useEffect(() => {
    setSelectedId(selectedOptionId);
  }, [selectedOptionId]);

  // Fire confetti if player answered correctly
  useEffect(() => {
    if (answerResult?.is_correct) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#8b5cf6', '#3b82f6', '#f59e0b'],
      });
    }
  }, [answerResult]);

  if (!question) {
    return (
      <div className="player-waiting-view glass-panel">
        <div className="waiting-spinner-glow" />
        {player ? (
          <div className="waiting-avatar-wrap">
            <KahootAvatar avatar={player.customAvatar || player.avatar} size={100} isInteractive={true} />
          </div>
        ) : (
          <Trophy size={48} className="waiting-trophy" />
        )}
        <h2>Keyingi savol kutilmoqda...</h2>
        <p>Boshlovchi savolni boshlaguncha tayyor turing!</p>
        {player && (
          <div className="player-card-mini">
            <span className="player-avatar">{player.avatar}</span>
            <span className="player-nick">{player.nickname}</span>
            {isTeamMode && player.team_name && (
              <span className="player-team-tag" style={{ borderColor: player.team_color }}>
                {player.team_name}
              </span>
            )}
            <span className="player-score-tag">{player.score} ball</span>
          </div>
        )}
      </div>
    );
  }

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

  const handleOptionClick = (opt) => {
    if (status !== 'question' || selectedId) return;
    setSelectedId(opt.id);
    if (onSelectOption) {
      onSelectOption(opt.id);
    }
  };

  // Timer ring calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, timeLeft / timeLimit);
  const strokeDashoffset = circumference - progressRatio * circumference;

  return (
    <div className="player-game-container">
      {/* Top Player Screen Bar */}
      <div className="player-top-bar">
        <div className="player-brand-badge">
          <Trophy size={18} className="top-trophy-icon" />
          <span className="top-brand-name">QuizArena</span>
        </div>

        <div className="player-identity-pill">
          <KahootAvatar avatar={player?.customAvatar || player?.avatar} size={28} />
          <span className="p-nick">{player?.nickname || 'Player #12'}</span>
          {isTeamMode && player?.team_name && (
            <span className="p-team" style={{ backgroundColor: player.team_color || '#8b5cf6' }}>
              {player.team_name}
            </span>
          )}
        </div>

        <div className="player-progress-counter">
          <span>{question.index || 1} / {question.total || 10}</span>
        </div>
      </div>

      {/* Purple Glowing Progress Track */}
      <div className="player-progress-bar-track">
        <div
          className="player-progress-bar-fill"
          style={{ width: `${((question.index || 1) / (question.total || 10)) * 100}%` }}
        />
      </div>

      {/* Circular Timer Ring (As featured in Laptop, Tablet, and Mobile mockups!) */}
      <div className="player-timer-container">
        <svg className="player-timer-svg" width="90" height="90" viewBox="0 0 90 90">
          <circle
            className="player-timer-track"
            cx="45"
            cy="45"
            r={radius}
            strokeWidth="7"
          />
          <circle
            className={`player-timer-progress ${timeLeft <= 5 ? 'timer-urgent' : ''}`}
            cx="45"
            cy="45"
            r={radius}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className={`player-timer-number ${timeLeft <= 5 ? 'urgent-pulse' : ''}`}>
          {timeLeft}
        </div>
      </div>

      {/* The Crucial Requirement: The Question is clearly visible on Player's device! */}
      <div className="player-question-box">
        <h2 className="player-question-text">{question.question_text}</h2>
      </div>

      {/* Answer feedback banner if answered */}
      {selectedId && status === 'question' && (
        <div className="player-locked-banner">
          <Check size={18} />
          <span>Javobingiz qabul qilindi! Boshqalar kutilyapti...</span>
        </div>
      )}

      {/* Review Feedback Banner with animated avatar reaction! */}
      {status === 'review' && answerResult && (
        <div className={`player-feedback-card ${answerResult.is_correct ? 'correct' : 'wrong'}`}>
          <div className="feedback-avatar-col">
            <KahootAvatar
              avatar={player?.customAvatar || player?.avatar}
              size={58}
              reaction={answerResult.is_correct ? 'celebrate' : 'wrong'}
            />
          </div>
          <div className="feedback-content">
            <h3>{answerResult.is_correct ? "To'g'ri! Barakalla!" : "Noto'g'ri!"}</h3>
            <div className="feedback-details">
              {answerResult.is_correct ? (
                <>
                  <span className="pts-won">+{answerResult.points_awarded} Ball</span>
                  {answerResult.streak > 1 && (
                    <span className="streak-pill">
                      <Flame size={16} /> Streak: {answerResult.streak}
                    </span>
                  )}
                </>
              ) : (
                <span className="wrong-hint">Keyingi savolda omad!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4 Large Vibrant Kahoot Answer Cards With Text AND Shapes */}
      <div className="player-answers-grid">
        {(question.options || []).map((opt) => {
          const isSelected = selectedId === opt.id;
          const isCorrect = status === 'review' && (opt.is_correct || opt.id === correctOptionId);
          const isWrongSelection = status === 'review' && isSelected && !isCorrect;
          const isDimmed = (selectedId && !isSelected && status === 'question') || (status === 'review' && !isCorrect);

          return (
            <button
              key={opt.id}
              disabled={status !== 'question' || Boolean(selectedId)}
              onClick={() => handleOptionClick(opt)}
              className={`player-answer-btn ${colorClasses[opt.color] || 'option-blue'} ${
                isSelected ? 'is-selected' : ''
              } ${isCorrect ? 'is-correct-reveal' : ''} ${isWrongSelection ? 'is-wrong-reveal' : ''} ${
                isDimmed ? 'is-dimmed' : ''
              }`}
            >
              <div className="answer-shape-symbol">{shapeIcons[opt.shape] || '▲'}</div>
              <div className="answer-title-text">{opt.option_text}</div>

              {isSelected && (
                <div className="selected-indicator-dot">
                  <Check size={14} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Player Footer Info */}
      <div className="player-bottom-footer">
        <div className="footer-score-pill">
          <span>Umumiy Ball:</span>
          <strong>{player?.score || 0}</strong>
        </div>
        {player?.streak > 0 && (
          <div className="footer-streak-pill">
            <Flame size={16} color="#f97316" />
            <span>{player.streak} ketma-ket!</span>
          </div>
        )}
      </div>
    </div>
  );
}

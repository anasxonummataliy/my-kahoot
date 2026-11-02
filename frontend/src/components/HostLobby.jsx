import React, { useState } from 'react';
import {
  Copy,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  UserPlus,
  Shield,
  Users,
  RefreshCw,
  UserCheck,
  LogOut,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  QrCode,
} from 'lucide-react';
import CrowdTrophyIllustration from './CrowdTrophyIllustration';
import KahootAvatar from './KahootAvatar';

export default function HostLobby({
  quizTitle = 'General Knowledge Challenge',
  quizDescription = 'Answer as fast and correctly as you can!',
  pin = '482719',
  players = [],
  currentQuestionIndex = 0,
  totalQuestions = 10,
  timePerQuestion = 20,
  isTeamMode = true,
  allQuestions = [],
  onStartQuestion,
  onAddBotPlayers,
  onToggleTeamMode,
  onJoinAsPlayer,
  onLeaveGame,
  onKickPlayer,
  onOpenQuizModal,
}) {
  const [copied, setCopied] = useState(false);
  const [showQuestionsList, setShowQuestionsList] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?pin=${pin}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Copy error:', e);
    }
  };

  // Group players by team if team mode is enabled
  const teams = {};
  if (isTeamMode) {
    players.forEach((p) => {
      const tName = p.team_name || 'Independent';
      if (!teams[tName]) teams[tName] = [];
      teams[tName].push(p);
    });
  }

  return (
    <div className="host-lobby-grid">
      {/* Center Main Stage Card */}
      <div className="lobby-center-stage glass-panel">
        {/* Title & Sparkles */}
        <div className="lobby-heading-block">
          <div className="sparkle-title-row">
            <Sparkles className="sparkle-left" size={20} />
            <h2 className="lobby-quiz-title">{quizTitle}</h2>
            <Sparkles className="sparkle-right" size={20} />
          </div>
          <p className="lobby-quiz-subtitle">{quizDescription}</p>

          {/* Quick Quiz Switcher Action right in Lobby */}
          {onOpenQuizModal && (
            <div className="lobby-switch-quiz-bar">
              <button
                type="button"
                className="btn-lobby-switch-quiz"
                onClick={onOpenQuizModal}
                title="Boshqa mavzu tanlash yoki yangi savollar yaratish"
              >
                <BookOpen size={16} />
                <span>📚 Quizni almashtirish / Mavzularni ko'rish</span>
              </button>
            </div>
          )}
        </div>

        {/* Central Game PIN Card */}
        <div className="game-pin-card pulsing-glow">
          <span className="game-pin-label">O'yin PIN Kodi</span>
          <div className="game-pin-number">{pin}</div>
          <div className="pin-actions-row" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
            <button className="copy-link-btn" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check size={16} color="#4ade80" />
                  <span style={{ color: '#4ade80' }}>Nusxalandi!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Havolani nusxalash</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="copy-link-btn btn-qr-toggle"
              onClick={() => setShowQR(!showQR)}
              style={{ background: showQR ? 'rgba(139, 92, 246, 0.4)' : undefined }}
              title="Telefon kamerasi orqali darhol ulanish"
            >
              <QrCode size={16} />
              <span>{showQR ? "Yopish" : "📱 QR Kod"}</span>
            </button>
          </div>

          {showQR && (
            <div className="lobby-qr-preview" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#ffffff', padding: '14px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${window.location.origin}/?pin=${pin}`)}`}
                alt={`QR Code PIN ${pin}`}
                style={{ width: '150px', height: '150px', borderRadius: '8px' }}
              />
              <span style={{ color: '#1e293b', fontSize: '12px', fontWeight: '600', marginTop: '6px' }}>Kamerani yo'naltiring va o'yinga kiring!</span>
            </div>
          )}
        </div>

        {/* Quick Join as Player CTA for hosts */}
        {onJoinAsPlayer && (
          <div className="lobby-host-join-bar">
            <button
              className="btn-host-join-self"
              onClick={onJoinAsPlayer}
              title="O'zingiz ham ushbu testda o'yinchi bo'lib qatnashish"
            >
              <UserCheck size={16} />
              <span>🎮 O'zim ham o'yinchi sifatida qatnashish</span>
            </button>
          </div>
        )}

        {/* Cheering Crowd Silhouette with Radiant Golden Trophy */}
        <CrowdTrophyIllustration />

        {/* Questions Preview for Host */}
        <div className="lobby-questions-preview-card">
          <div
            className="questions-preview-toggle-bar"
            onClick={() => setShowQuestionsList(!showQuestionsList)}
          >
            <div className="preview-toggle-left">
              <HelpCircle size={17} className="preview-help-icon" />
              <span>
                Ushbu Quizdagi savollar: <strong>{totalQuestions} ta savol</strong>
              </span>
            </div>
            <button type="button" className="btn-toggle-preview-pill">
              {showQuestionsList ? 'Savollarni yashirish ▲' : 'Savollarni ko\'rish ▼'}
            </button>
          </div>

          {showQuestionsList && (
            <div className="lobby-questions-list-body">
              {allQuestions && allQuestions.length > 0 ? (
                allQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="lobby-question-row">
                    <span className="q-badge-number">Q{idx + 1}</span>
                    <div className="q-row-info">
                      <div className="q-row-question-text">{q.question_text}</div>
                      <div className="q-row-meta-chips">
                        <span className="q-meta-chip">⏱ {q.time_limit || 20}s</span>
                        <span className="q-meta-chip">⭐ {q.points || 1000} ball</span>
                        {q.options && q.options.length > 0 && (
                          <span className="q-meta-chip">🔘 {q.options.length} ta javob varianti</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="lobby-no-questions-notice">
                  <p>Savollar ro'yxati yuklanmoqda...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time Players / Teams Display */}
        <div className="lobby-players-footer">
          <div className="lobby-players-header">
            <div className="players-header-left">
              <Users size={18} />
              <span>
                {isTeamMode ? 'Jamoalar & Qatnashchilar' : 'Yakkaxon Qatnashchilar'}:{' '}
                <strong>{players.length}</strong>
              </span>
            </div>

            <div className="players-header-actions">
              {onAddBotPlayers && (
                <button
                  type="button"
                  className="btn-ghost-dev-test"
                  onClick={onAddBotPlayers}
                  title="Test o'yinchilarni qo'shish (ixtiyoriy)"
                >
                  <UserPlus size={13} />
                  <span>+ Test O'yinchi</span>
                </button>
              )}
            </div>
          </div>

          {players.length === 0 ? (
            <div className="empty-players-notice">
              <p>
                {isTeamMode
                  ? "O'yinchilar ulanishini kuting! Jamoalar avtomatik taqsimlanadi."
                  : "O'yinchilar ulanishini kuting! Har bir o'yinchi yakkaxon tartibda bellashadi."}
              </p>
              <small>O'yinchilar Game PIN: <strong>{pin}</strong> orqali qo'shiladi</small>
            </div>
          ) : isTeamMode ? (
            <div className="teams-roster-grid">
              {Object.entries(teams).map(([teamName, teamPlayers]) => (
                <div key={teamName} className="team-roster-card">
                  <div className="team-roster-header">
                    <span className="team-color-indicator" style={{ backgroundColor: teamPlayers[0]?.team_color || '#ff6b00' }} />
                    <span className="team-title-name">{teamName}</span>
                    <span className="team-count-badge">{teamPlayers.length}</span>
                  </div>
                  <div className="team-members-list">
                    {teamPlayers.map((p) => (
                      <span key={p.id} className="player-chip">
                        <KahootAvatar avatar={p.customAvatar || p.avatar} size={24} />
                        <span className="player-nick">{p.nickname}</span>
                        {onKickPlayer && (
                          <button
                            type="button"
                            className="btn-kick-player"
                            onClick={(e) => {
                              e.stopPropagation();
                              onKickPlayer(p.id);
                            }}
                            title={`Chiqarib yuborish: ${p.nickname}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="players-chip-wrap">
              {players.map((p) => (
                <div key={p.id} className="player-chip single-mode">
                  <KahootAvatar avatar={p.customAvatar || p.avatar} size={28} />
                  <span className="player-nick">{p.nickname}</span>
                  {onKickPlayer && (
                    <button
                      type="button"
                      className="btn-kick-player"
                      onClick={(e) => {
                        e.stopPropagation();
                        onKickPlayer(p.id);
                      }}
                      title={`Chiqarib yuborish: ${p.nickname}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Progress & Action Card (Matching Screenshot exactly) */}
      <div className="lobby-right-card glass-panel">
        {/* Selected Quiz Info & Quick Switch */}
        <div className="lobby-selected-quiz-box">
          <span className="selected-quiz-label">Faol Quiz:</span>
          <h4 className="selected-quiz-title-text">{quizTitle}</h4>
          {onOpenQuizModal && (
            <button
              type="button"
              className="btn-select-different-quiz"
              onClick={onOpenQuizModal}
            >
              <BookOpen size={13} />
              <span>Boshqa quiz tanlash →</span>
            </button>
          )}
        </div>

        {/* Game Progress */}
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-title">Game Progress</span>
            <span className="progress-fraction">
              {Math.min(currentQuestionIndex + 1, totalQuestions)} / {totalQuestions}
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Time per question */}
        <div className="time-info-section">
          <div className="time-icon-wrapper">
            <Clock size={22} className="clock-icon" />
          </div>
          <div className="time-details">
            <span className="time-label">Time per question</span>
            <span className="time-value">{timePerQuestion}s</span>
          </div>
        </div>

        {/* Team Mode Status indicator */}
        <button
          type="button"
          className="mode-pill-card"
          onClick={() => onToggleTeamMode && onToggleTeamMode()}
          title="Rejimni almashtirish uchun bosing (Jamoviy <-> Yakkaxon)"
        >
          <div className="mode-pill-left">
            <Users size={16} />
            <span>Rejim: <strong>{isTeamMode ? 'Jamoviy (Teams)' : 'Yakkaxon (Solo)'}</strong></span>
          </div>
          <RefreshCw size={14} className="mode-toggle-icon" />
        </button>

        {/* Start Question Button */}
        <button className="btn-primary start-question-btn" onClick={onStartQuestion}>
          <span>Start Question</span>
          <ArrowRight size={20} />
        </button>

        {onLeaveGame && (
          <button
            className="btn-secondary btn-sm"
            onClick={onLeaveGame}
            title="O'yin zalini yopish va chiqish"
            style={{ marginTop: '10px', width: '100%', justifyContent: 'center', color: '#fca5a5' }}
          >
            <LogOut size={15} />
            <span>Zalni yopish / Chiqish</span>
          </button>
        )}
      </div>
    </div>
  );
}

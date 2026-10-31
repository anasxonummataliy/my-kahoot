import React, { useState } from 'react';
import { Copy, Check, Clock, Sparkles, ArrowRight, UserPlus, Shield, Users, RefreshCw } from 'lucide-react';
import CrowdTrophyIllustration from './CrowdTrophyIllustration';

export default function HostLobby({
  quizTitle = 'General Knowledge Challenge',
  quizDescription = 'Answer as fast and correctly as you can!',
  pin = '482719',
  players = [],
  currentQuestionIndex = 0,
  totalQuestions = 10,
  timePerQuestion = 20,
  isTeamMode = true,
  onStartQuestion,
  onAddBotPlayers,
  onToggleTeamMode,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?pin=${pin}`;
    navigator.clipboard?.writeText?.(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
        </div>

        {/* Central Game PIN Card */}
        <div className="game-pin-card pulsing-glow">
          <span className="game-pin-label">Game PIN</span>
          <div className="game-pin-number">{pin}</div>
          <button className="copy-link-btn" onClick={handleCopyLink}>
            {copied ? (
              <>
                <Check size={16} color="#4ade80" />
                <span style={{ color: '#4ade80' }}>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {/* Cheering Crowd Silhouette with Radiant Golden Trophy */}
        <CrowdTrophyIllustration />

        {/* Real-time Players / Teams Display */}
        <div className="lobby-players-footer">
          <div className="lobby-players-header">
            <div className="players-header-left">
              <Users size={18} />
              <span>
                {isTeamMode ? 'Jamoalar & Qatnashchilar' : 'Qatnashchilar'}:{' '}
                <strong>{players.length}</strong>
              </span>
            </div>

            <div className="players-header-actions">
              <button
                className="btn-secondary btn-sm"
                onClick={onAddBotPlayers}
                title="Add 4 simulated players with team assignments for instant live testing"
              >
                <UserPlus size={15} />
                <span>+ Test O'yinchilarni qo'shish</span>
              </button>
            </div>
          </div>

          {players.length === 0 ? (
            <div className="empty-players-notice">
              <p>O'yinchilar ulanishini kuting yoki <strong>Test O'yinchilarni qo'shish</strong> tugmasini bosing!</p>
              <small>O'yinchilar Game PIN: <strong>{pin}</strong> orqali qo'shiladi</small>
            </div>
          ) : isTeamMode ? (
            <div className="teams-roster-grid">
              {Object.entries(teams).map(([teamName, teamPlayers]) => (
                <div key={teamName} className="team-roster-card">
                  <div className="team-roster-header">
                    <span className="team-color-indicator" style={{ backgroundColor: teamPlayers[0]?.team_color || '#8b5cf6' }} />
                    <span className="team-title-name">{teamName}</span>
                    <span className="team-count-badge">{teamPlayers.length}</span>
                  </div>
                  <div className="team-members-list">
                    {teamPlayers.map((p) => (
                      <span key={p.id} className="player-chip">
                        <span className="player-avatar">{p.avatar}</span>
                        <span className="player-nick">{p.nickname}</span>
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
                  <span className="player-avatar">{p.avatar}</span>
                  <span className="player-nick">{p.nickname}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Progress & Action Card (Matching Screenshot exactly) */}
      <div className="lobby-right-card glass-panel">
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
        <div className="mode-pill-card" onClick={onToggleTeamMode} style={{ cursor: 'pointer' }}>
          <div className="mode-pill-left">
            <Users size={16} />
            <span>Rejim: <strong>{isTeamMode ? 'Jamoviy Musobaqa' : 'Yakkama-yakka'}</strong></span>
          </div>
          <RefreshCw size={14} className="mode-toggle-icon" />
        </div>

        {/* Start Question Button */}
        <button className="btn-primary start-question-btn" onClick={onStartQuestion}>
          <span>Start Question</span>
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

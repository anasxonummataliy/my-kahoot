import React, { useState } from 'react';
import { Trophy, Medal, Flame, Users, ArrowRight, Flag } from 'lucide-react';

export default function LeaderboardView({
  players = [],
  teams = [],
  isTeamMode = true,
  currentQuestionIndex = 1,
  totalQuestions = 10,
  onNextQuestion,
  onFinishGame,
  isHost = true,
}) {
  const [activeTab, setActiveTab] = useState(isTeamMode ? 'teams' : 'individual');

  const getRankBadge = (idx) => {
    if (idx === 0) return <span className="rank-badge gold">🥇 1</span>;
    if (idx === 1) return <span className="rank-badge silver">🥈 2</span>;
    if (idx === 2) return <span className="rank-badge bronze">🥉 3</span>;
    return <span className="rank-badge default">{idx + 1}</span>;
  };

  const isFinalQuestion = currentQuestionIndex >= totalQuestions;

  return (
    <div className="leaderboard-container glass-panel">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="leaderboard-title-group">
          <Trophy size={32} className="trophy-gold-glow" />
          <h2>Musobaqa Natijalari</h2>
          <span className="q-progress-tag">
            Savol {currentQuestionIndex} / {totalQuestions}
          </span>
        </div>

        {/* Tab switch between Teams and Individual if team mode */}
        {isTeamMode && (
          <div className="tab-pill-switcher">
            <button
              className={`tab-pill-btn ${activeTab === 'teams' ? 'active' : ''}`}
              onClick={() => setActiveTab('teams')}
            >
              <Users size={16} />
              <span>Jamoalar Reytingi</span>
            </button>
            <button
              className={`tab-pill-btn ${activeTab === 'individual' ? 'active' : ''}`}
              onClick={() => setActiveTab('individual')}
            >
              <Medal size={16} />
              <span>Yakkaxon Reyting</span>
            </button>
          </div>
        )}
      </div>

      {/* Team Standings View */}
      {isTeamMode && activeTab === 'teams' ? (
        <div className="teams-leaderboard-grid">
          {teams.map((team, idx) => (
            <div
              key={team.team_name}
              className={`team-standing-card glass-card ${idx === 0 ? 'leader-team' : ''}`}
              style={{ '--team-accent': team.team_color }}
            >
              <div className="team-standing-left">
                <div className="team-rank-pos">{getRankBadge(idx)}</div>
                <div className="team-info-box">
                  <h3 className="team-headline" style={{ color: team.team_color }}>
                    {team.team_name}
                  </h3>
                  <span className="team-sub-stat">
                    {team.player_count} nafar a'zo | O'rtacha: {team.avg_score || 0} ball
                  </span>
                </div>
              </div>
              <div className="team-total-score">
                <span className="score-num">{team.total_score}</span>
                <span className="score-sub">Jami Ball</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Individual Players Standings View */
        <div className="individual-leaderboard-list">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className={`player-standing-row glass-card ${idx === 0 ? 'first-row' : ''}`}
            >
              <div className="standing-rank-col">{getRankBadge(idx)}</div>
              <div className="standing-player-col">
                <span className="standing-avatar">{p.avatar}</span>
                <div className="standing-nick-info">
                  <span className="standing-nick">{p.nickname}</span>
                  {p.team_name && (
                    <span className="standing-team-pill" style={{ backgroundColor: p.team_color }}>
                      {p.team_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="standing-streak-col">
                {p.streak > 1 && (
                  <span className="streak-badge">
                    <Flame size={15} color="#f97316" />
                    {p.streak}
                  </span>
                )}
              </div>
              <div className="standing-score-col">
                <strong>{p.score}</strong>
                <span>ball</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Host Navigation controls */}
      {isHost && (
        <div className="leaderboard-bottom-controls">
          {isFinalQuestion ? (
            <button className="btn-primary" onClick={onFinishGame}>
              <Flag size={18} />
              <span>G'oliblarni Taqdim Etish (Podium)</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <button className="btn-primary" onClick={onNextQuestion}>
              <span>Keyingi Savolga O'tish</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

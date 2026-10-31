import React, { useEffect } from 'react';
import { Trophy, Crown, Sparkles, RotateCcw, Home, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../utils/soundEffects';
import KahootAvatar from './KahootAvatar';

export default function PodiumView({
  players = [],
  teams = [],
  isTeamMode = true,
  onRestart,
  onGoHome,
}) {
  useEffect(() => {
    soundManager.playPodium();

    // Fire fireworks / confetti burst loop
    const duration = 4.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#fbbf24', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#fbbf24', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const first = players[0];
  const second = players[1];
  const third = players[2];

  const winningTeam = teams[0];

  return (
    <div className="podium-view-container glass-panel">
      {/* Title */}
      <div className="podium-header">
        <div className="crown-wrap">
          <Crown size={48} className="crown-icon" />
        </div>
        <h2 className="podium-title">Musobaqa G'oliblari!</h2>
        <p className="podium-subtitle">Barcha ishtirokchilarga ajoyib o'yin uchun rahmat!</p>
      </div>

      {/* Winning Team Banner if Team Mode */}
      {isTeamMode && winningTeam && (
        <div
          className="winning-team-card pulsing-glow"
          style={{ borderColor: winningTeam.team_color }}
        >
          <div className="team-banner-left">
            <Trophy size={28} color="#fbbf24" />
            <div>
              <span className="banner-sub">G'olib Jamoa:</span>
              <h3 className="banner-team-name" style={{ color: winningTeam.team_color }}>
                {winningTeam.team_name}
              </h3>
            </div>
          </div>
          <div className="team-banner-right">
            <span className="banner-score">{winningTeam.total_score} Ball</span>
            <small>({winningTeam.player_count} a'zo)</small>
          </div>
        </div>
      )}

      {/* 3D-style Podium Stand with Animated Kahoot Avatars */}
      <div className="podium-stage">
        {/* 2nd Place (Silver - Left) */}
        {second ? (
          <div className="podium-col second-place">
            <div className="podium-player-card">
              <KahootAvatar avatar={second.customAvatar || second.avatar} size={76} reaction="celebrate" />
              <span className="nick-text">{second.nickname}</span>
              <span className="score-pill">{second.score} ball</span>
            </div>
            <div className="podium-pedestal pedestal-2">
              <span className="pedestal-rank">2</span>
              <span className="pedestal-label">Silver</span>
            </div>
          </div>
        ) : (
          <div className="podium-col empty-col" />
        )}

        {/* 1st Place (Gold - Center) */}
        {first && (
          <div className="podium-col first-place">
            <div className="winner-crown-floating">
              <Crown size={32} />
            </div>
            <div className="podium-player-card champion">
              <KahootAvatar avatar={first.customAvatar || first.avatar} size={94} reaction="celebrate" />
              <span className="nick-text champion-nick">{first.nickname}</span>
              <span className="score-pill champion-score">{first.score} ball</span>
            </div>
            <div className="podium-pedestal pedestal-1">
              <span className="pedestal-rank">1</span>
              <span className="pedestal-label">Champion</span>
            </div>
          </div>
        )}

        {/* 3rd Place (Bronze - Right) */}
        {third ? (
          <div className="podium-col third-place">
            <div className="podium-player-card">
              <KahootAvatar avatar={third.customAvatar || third.avatar} size={68} reaction="celebrate" />
              <span className="nick-text">{third.nickname}</span>
              <span className="score-pill">{third.score} ball</span>
            </div>
            <div className="podium-pedestal pedestal-3">
              <span className="pedestal-rank">3</span>
              <span className="pedestal-label">Bronze</span>
            </div>
          </div>
        ) : (
          <div className="podium-col empty-col" />
        )}
      </div>

      {/* Remaining Top Players list */}
      {players.length > 3 && (
        <div className="runners-up-section">
          <h4>Boshqa O'rinlar</h4>
          <div className="runners-up-chips">
            {players.slice(3, 8).map((p, i) => (
              <div key={p.id} className="runner-up-chip">
                <span className="runner-rank">#{i + 4}</span>
                <KahootAvatar avatar={p.customAvatar || p.avatar} size={24} />
                <span className="runner-nick">{p.nickname}</span>
                <span className="runner-score">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="podium-actions">
        <button className="btn-secondary" onClick={onGoHome}>
          <Home size={18} />
          <span>Bosh Sahifa</span>
        </button>
        <button className="btn-primary" onClick={onRestart}>
          <RotateCcw size={18} />
          <span>Yana O'ynash</span>
        </button>
      </div>
    </div>
  );
}

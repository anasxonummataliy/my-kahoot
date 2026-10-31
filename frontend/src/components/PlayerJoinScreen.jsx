import React, { useState } from 'react';
import { Trophy, ArrowRight, Shield, Sparkles, Users } from 'lucide-react';

const AVATARS = ['🚀', '⚡', '🐉', '🦅', '💎', '🦁', '👑', '🎯', '🔥', '🐺'];

const DEFAULT_TEAMS = [
  { name: 'Red Dragons', color: '#ef4444', icon: '🐉' },
  { name: 'Blue Titans', color: '#3b82f6', icon: '⚡' },
  { name: 'Golden Eagles', color: '#f59e0b', icon: '🦅' },
  { name: 'Cyber Wolves', color: '#10b981', icon: '🐺' },
];

export default function PlayerJoinScreen({
  initialPin = '',
  isTeamMode = true,
  onJoin,
  onBackToHost,
}) {
  const [pin, setPin] = useState(initialPin || '');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🚀');
  const [selectedTeam, setSelectedTeam] = useState(DEFAULT_TEAMS[0]);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pin.trim() || pin.trim().length !== 6) {
      setError("Iltimos, 6 xonali Game PIN ni kiriting (masalan: 482719)");
      return;
    }
    if (!nickname.trim()) {
      setError("Iltimos, ismingiz yoki taxallusingizni kiriting!");
      return;
    }

    setError('');
    onJoin({
      pin: pin.trim(),
      nickname: nickname.trim(),
      avatar: selectedAvatar,
      team_name: isTeamMode ? selectedTeam.name : '',
      team_color: isTeamMode ? selectedTeam.color : '#8b5cf6',
    });
  };

  return (
    <div className="join-screen-container">
      <div className="join-card glass-panel pulsing-glow">
        {/* Header */}
        <div className="join-header">
          <div className="join-logo-wrap">
            <Trophy size={36} className="join-trophy" />
          </div>
          <h2 className="join-title">QuizArena ga qo'shiling</h2>
          <p className="join-subtitle">
            {isTeamMode ? 'Jamoaviy musobaqada bellashing!' : 'Barcha savollarga tez va aniq javob bering!'}
          </p>
        </div>

        {error && <div className="join-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="join-form">
          {/* PIN Input */}
          <div className="form-group">
            <label className="form-label">Game PIN</label>
            <input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="482719"
              className="input-pin-field"
              autoFocus={!pin}
            />
          </div>

          {/* Nickname Input */}
          <div className="form-group">
            <label className="form-label">Ismingiz / Nikingiz</label>
            <input
              type="text"
              maxLength={25}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Masalan: Sardor"
              className="input-text-field"
              autoFocus={Boolean(pin)}
            />
          </div>

          {/* Avatar Selector */}
          <div className="form-group">
            <label className="form-label">Avatar tanlang</label>
            <div className="avatar-grid">
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av}
                  className={`avatar-pick-btn ${selectedAvatar === av ? 'active' : ''}`}
                  onClick={() => setSelectedAvatar(av)}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Team Selector (Jamoviy musobaqa!) */}
          {isTeamMode && (
            <div className="form-group">
              <label className="form-label">
                <Users size={16} />
                <span>Jamoangizni tanlang:</span>
              </label>
              <div className="team-selector-grid">
                {DEFAULT_TEAMS.map((team) => (
                  <button
                    type="button"
                    key={team.name}
                    className={`team-select-card ${selectedTeam.name === team.name ? 'active' : ''}`}
                    style={{
                      '--team-color': team.color,
                      borderColor: selectedTeam.name === team.name ? team.color : 'rgba(255,255,255,0.1)',
                    }}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <span className="team-emoji">{team.icon}</span>
                    <span className="team-label">{team.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Join CTA */}
          <button type="submit" className="btn-primary join-submit-btn">
            <span>Arena ga Kirish</span>
            <ArrowRight size={20} />
          </button>
        </form>

        {onBackToHost && (
          <div className="join-footer-back">
            <button className="back-link-btn" onClick={onBackToHost}>
              ← Boshlovchi (Host) paneliga qaytish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

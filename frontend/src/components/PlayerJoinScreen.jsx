import React, { useState } from 'react';
import { Trophy, ArrowRight, Dices, Palette, Users, Sparkles } from 'lucide-react';
import KahootAvatar, { getRandomAvatar } from './KahootAvatar';
import AvatarStudio from './AvatarStudio';
import { soundManager } from '../utils/soundEffects';

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
  const [customAvatar, setCustomAvatar] = useState(() => getRandomAvatar());
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(DEFAULT_TEAMS[0]);
  const [error, setError] = useState('');

  const handleRandomize = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    let step = 0;
    const totalSteps = 6;
    const interval = setInterval(() => {
      step++;
      setCustomAvatar(getRandomAvatar());
      soundManager.playSpinTick();

      if (step >= totalSteps) {
        clearInterval(interval);
        const finalOne = getRandomAvatar();
        setCustomAvatar(finalOne);
        setIsSpinning(false);
        soundManager.playSpinLand();
      }
    }, 65);
  };

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
      customAvatar: customAvatar,
      avatar: customAvatar.bodyType, // string fallback
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
            {isTeamMode ? 'Jamoaviy musobaqada o\'z qahramoningiz bilan bellashing!' : 'Barcha savollarga tez va aniq javob bering!'}
          </p>
        </div>

        {error && <div className="join-error-banner">{error}</div>}

        {/* Kahoot Avatar Studio Modal / Expander */}
        {isStudioOpen ? (
          <AvatarStudio
            avatar={customAvatar}
            onChange={(updated) => setCustomAvatar(updated)}
            onDone={() => setIsStudioOpen(false)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="join-form">
            {/* Animated Avatar Showcase & Quick Customizer */}
            <div className="avatar-join-preview-card">
              <div className="join-avatar-box">
                <KahootAvatar
                  avatar={customAvatar}
                  size={100}
                  isInteractive={true}
                  reaction={isSpinning ? 'spin' : 'idle'}
                  className={isSpinning ? 'spin-anim' : ''}
                  onClick={() => soundManager.playAvatarGiggle()}
                />
              </div>

              <div className="avatar-quick-actions">
                <button
                  type="button"
                  className={`btn-spin-quick ${isSpinning ? 'spinning' : ''}`}
                  onClick={handleRandomize}
                  title="Tasodifiy yangi qahramon aylantirish (Spin!)"
                >
                  <Dices size={16} />
                  <span>Aylantirish (Spin)</span>
                </button>

                <button
                  type="button"
                  className="btn-studio-quick"
                  onClick={() => setIsStudioOpen(true)}
                  title="Qahramon ko'rinishini sozlash (ko'zoynak, toj, kiyimlar)"
                >
                  <Palette size={16} />
                  <span>Sozlash (Custom)</span>
                </button>
              </div>
            </div>

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
        )}

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

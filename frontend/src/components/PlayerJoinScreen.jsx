import React, { useState, useEffect } from 'react';
import { Trophy, ArrowRight, Dices, Palette, Users, User, Loader2, Sparkles } from 'lucide-react';
import KahootAvatar, { getRandomAvatar } from './KahootAvatar';
import AvatarStudio from './AvatarStudio';
import { soundManager } from '../utils/soundEffects';
import { apiUrl } from '../config';

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
  onToggleTeamMode,
  joinError = '',
  isJoining = false,
  authUser = null,
  onOpenAuth = null,
}) {
  const [pin, setPin] = useState(initialPin || '');
  const [nickname, setNickname] = useState('');
  const [customAvatar, setCustomAvatar] = useState(() => getRandomAvatar());
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(DEFAULT_TEAMS[0]);
  const [localTeamMode, setLocalTeamMode] = useState(isTeamMode);
  const [detectedRoomMode, setDetectedRoomMode] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPin(initialPin || '');
  }, [initialPin]);

  useEffect(() => {
    if (!detectedRoomMode) {
      setLocalTeamMode(isTeamMode);
    }
  }, [isTeamMode, detectedRoomMode]);

  // Whenever PIN reaches 6 digits, immediately detect room configuration from host
  useEffect(() => {
    const cleanPin = (pin || '').trim();
    if (cleanPin.length === 6) {
      fetch(apiUrl(`/api/sessions/${cleanPin}/`))
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && typeof data.is_team_mode === 'boolean') {
            setLocalTeamMode(data.is_team_mode);
            setDetectedRoomMode(data.is_team_mode ? 'team' : 'solo');
          } else {
            setDetectedRoomMode(null);
          }
        })
        .catch(() => {
          setDetectedRoomMode(null);
        });
    } else {
      setDetectedRoomMode(null);
    }
  }, [pin]);

  const handleModeSwitch = (mode) => {
    setLocalTeamMode(mode);
    if (onToggleTeamMode) {
      onToggleTeamMode(mode);
    }
  };

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
      setError("Iltimos, 6 xonali o'yin PIN kodini kiriting (masalan: 814770)");
      return;
    }
    if (!nickname.trim()) {
      setError("Iltimos, ismingizni kiriting!");
      return;
    }
    if (localTeamMode && !selectedTeam) {
      setError("Ushbu musobaqa jamoaviy! Iltimos, bitta jamoa tanlang.");
      return;
    }

    setError('');
    onJoin({
      pin: pin.trim(),
      nickname: nickname.trim(),
      customAvatar: customAvatar,
      avatar: customAvatar.bodyType,
      team_name: localTeamMode ? (selectedTeam?.name || 'Red Dragons') : '',
      team_color: localTeamMode ? (selectedTeam?.color || '#ef4444') : '#ff6b00',
      is_team_mode: localTeamMode,
    });
  };

  const displayError = error || joinError;

  return (
    <div className="join-screen-container">
      <div className={`join-card glass-panel pulsing-glow ${isStudioOpen ? 'studio-expanded' : ''}`}>
        {/* Kahoot Avatar Studio Modal / Expander */}
        {isStudioOpen ? (
          <AvatarStudio
            avatar={customAvatar}
            onChange={(updated) => setCustomAvatar(updated)}
            onDone={() => setIsStudioOpen(false)}
          />
        ) : (
          <>
            <div className="join-card-layout">
            {/* Left Pane: Branding, Avatar Showcase, Live Sessions & Exploration */}
            <div className="join-card-left">
              {/* Header */}
              <div className="join-header">
                <div className="join-logo-wrap">
                  <Trophy size={28} className="join-trophy" />
                </div>
                <h2 className="join-title">QuizArena</h2>
                <p className="join-subtitle">
                  {localTeamMode
                    ? "Jamoaviy musobaqada bellashing"
                    : "Yakkaxon tartibda o'z bilimingizni sinang"}
                </p>
              </div>

              {/* Animated Avatar Showcase & Quick Customizer */}
              <div className="avatar-join-preview-card">
                <div className="join-avatar-box">
                  <KahootAvatar
                    avatar={customAvatar}
                    size={84}
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
                    title="Tasodifiy yangi qahramon aylantirish"
                  >
                    <Dices size={14} />
                    <span>Aylantirish</span>
                  </button>

                  <button
                    type="button"
                    className="btn-studio-quick"
                    onClick={() => setIsStudioOpen(true)}
                    title="Qahramonni moslashtirish"
                  >
                    <Palette size={14} />
                    <span>Moslash</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Pane: Interactive Game Entry Form */}
            <div className="join-card-right">
              {displayError && (
                <div className="join-error-banner" role="alert">
                  {displayError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="join-form">
                {/* Rejimni tanlash (Yakkaxon yoki Jamoaviy) */}
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>O'yin formati:</label>
                    {detectedRoomMode && (
                      <span style={{ fontSize: '0.74rem', color: '#fb923c', fontWeight: 600 }}>
                        {detectedRoomMode === 'team' ? "👥 Xona: Jamoviy Musobaqa" : "👤 Xona: Yakkaxon (Solo)"}
                      </span>
                    )}
                  </div>
                  <div className="mode-toggle-pills">
                    <button
                      type="button"
                      disabled={detectedRoomMode !== null}
                      className={`mode-pill-btn ${!localTeamMode ? 'active' : ''}`}
                      onClick={() => !detectedRoomMode && handleModeSwitch(false)}
                      title={detectedRoomMode ? `Xona formati: ${detectedRoomMode === 'team' ? 'Jamoviy' : 'Yakkaxon'}` : 'Yakkaxon tartib'}
                    >
                      <User size={14} />
                      <span>Yakkaxon (Solo)</span>
                    </button>
                    <button
                      type="button"
                      disabled={detectedRoomMode !== null}
                      className={`mode-pill-btn ${localTeamMode ? 'active' : ''}`}
                      onClick={() => !detectedRoomMode && handleModeSwitch(true)}
                      title={detectedRoomMode ? `Xona formati: ${detectedRoomMode === 'team' ? 'Jamoviy' : 'Yakkaxon'}` : 'Jamoviy musobaqa'}
                    >
                      <Users size={14} />
                      <span>Jamoaviy (Teams)</span>
                    </button>
                  </div>
                </div>

                {/* PIN Input */}
                <div className="form-group">
                  <label className="form-label">O'yin PIN kodi</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      if (error) setError('');
                    }}
                    placeholder="Masalan: 814770"
                    className="input-pin-field"
                    inputMode="numeric"
                    autoFocus={!pin}
                  />
                </div>

                {/* Nickname Input */}
                <div className="form-group">
                  <label className="form-label">Ismingiz / Nikingiz</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Masalan: Anvar"
                    className="input-text-field"
                    autoFocus={Boolean(pin)}
                  />
                </div>

                {/* Team Selector - ONLY shown if localTeamMode is true */}
                {localTeamMode && (
                  <div className="form-group">
                    <label className="form-label">
                      <Users size={14} />
                      <span>Jamoa tanlang:</span>
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
                <button
                  type="submit"
                  className="btn-primary join-submit-btn"
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Ulanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <span>O'yinga kirish</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              </div>
            </div>

            {/* Unified Host Navigation Link spanning bottom of card */}
            <div className="join-card-bottom-bar">
              {authUser && onBackToHost ? (
                <button className="back-link-btn" onClick={onBackToHost}>
                  ← Boshlovchi (Host) paneliga o'tish
                </button>
              ) : !authUser && onOpenAuth ? (
                <div>
                  <span className="join-auth-hint-text">Quiz yaratish yoki xona ochish: </span>
                  <button
                    type="button"
                    className="back-link-btn font-bold"
                    onClick={() => onOpenAuth('login')}
                  >
                    Host sifatida kiring →
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Dices, Palette, LogOut, Sparkles, Users, Check } from 'lucide-react';
import KahootAvatar, { AVATAR_COLORS, getRandomAvatar } from './KahootAvatar';
import AvatarStudio from './AvatarStudio';
import { soundManager } from '../utils/soundEffects';

export default function PlayerWaitingLobby({
  currentPlayer,
  quizTitle = '',
  isTeamMode = true,
  playersCount = 1,
  onUpdateAvatar,
  onLeaveGame,
}) {
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(
    currentPlayer?.customAvatar || getRandomAvatar()
  );

  // Keep local avatar in sync if currentPlayer updates from external broadcast
  useEffect(() => {
    if (currentPlayer?.customAvatar) {
      setLocalAvatar(currentPlayer.customAvatar);
    }
  }, [currentPlayer?.customAvatar]);

  const handleRandomize = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    let step = 0;
    const totalSteps = 6;
    const interval = setInterval(() => {
      step++;
      const rand = getRandomAvatar();
      setLocalAvatar(rand);
      soundManager.playSpinTick();

      if (step >= totalSteps) {
        clearInterval(interval);
        const finalAvatar = getRandomAvatar();
        setLocalAvatar(finalAvatar);
        setIsSpinning(false);
        soundManager.playSpinLand();
        // Persist to server & broadcast
        if (onUpdateAvatar) onUpdateAvatar(finalAvatar);
      }
    }, 65);
  };

  const handleQuickColor = (colorId) => {
    soundManager.playAvatarPop(650);
    const updated = { ...localAvatar, color: colorId };
    setLocalAvatar(updated);
    if (onUpdateAvatar) onUpdateAvatar(updated);
  };

  const handleStudioChange = (updated) => {
    setLocalAvatar(updated);
    // Real-time sync to host as player tweaks in studio
    if (onUpdateAvatar) onUpdateAvatar(updated);
  };

  const handleStudioDone = () => {
    setIsStudioOpen(false);
    if (onUpdateAvatar) onUpdateAvatar(localAvatar);
  };

  return (
    <div className="player-waiting-view glass-panel player-waiting-lobby-enhanced">
      {isStudioOpen ? (
        <div className="waiting-studio-wrapper">
          <AvatarStudio
            avatar={localAvatar}
            onChange={handleStudioChange}
            onDone={handleStudioDone}
          />
        </div>
      ) : (
        <>
          {/* Header Badge */}
          <div className="waiting-lobby-top-badge">
            <span className="live-pulse-dot" />
            <span>Kutish Zali — Hamma kirgunicha qahramoningizni moslang</span>
          </div>

          {/* Active Quiz Topic Pill */}
          {quizTitle && (
            <div className="waiting-quiz-topic-pill">
              <span className="topic-pill-label">📚 Mavzu:</span>
              <strong className="topic-pill-title">{quizTitle}</strong>
            </div>
          )}

          {/* Main avatar display with glow ring */}
          <div className="waiting-avatar-showcase">
            <div className="waiting-avatar-glow-ring">
              <KahootAvatar
                avatar={localAvatar}
                size={110}
                isInteractive={true}
                reaction={isSpinning ? 'spin' : 'idle'}
                className={isSpinning ? 'spin-anim' : ''}
                onClick={() => soundManager.playAvatarGiggle()}
              />
            </div>
          </div>

          {/* Player nickname & team */}
          <h2 className="waiting-welcome-title">{currentPlayer?.nickname}</h2>
          {isTeamMode && currentPlayer?.team_name && (
            <div className="waiting-team-wrap">
              <span
                className="p-team-pill"
                style={{ backgroundColor: currentPlayer.team_color || '#ff6b00' }}
              >
                {currentPlayer.team_name}
              </span>
            </div>
          )}

          {/* Quick Color Swatches Strip */}
          <div className="waiting-quick-colors-box">
            <span className="quick-color-label">Rangni tanlang:</span>
            <div className="quick-color-bubbles-row">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`quick-color-bubble ${localAvatar.color === c.id ? 'active' : ''}`}
                  style={{ backgroundColor: c.bg }}
                  onClick={() => handleQuickColor(c.id)}
                  title={c.label}
                >
                  {localAvatar.color === c.id && <Check size={12} strokeWidth={3} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar customization actions */}
          <div className="waiting-avatar-actions">
            <button
              type="button"
              className={`btn-waiting-action btn-randomize ${isSpinning ? 'spinning' : ''}`}
              onClick={handleRandomize}
              title="Tasodifiy yangi qahramon aylantirish"
            >
              <Dices size={18} />
              <span>Tasodifiy aylantirish</span>
            </button>

            <button
              type="button"
              className="btn-waiting-action btn-customize"
              onClick={() => setIsStudioOpen(true)}
              title="Qahramonni to'liq moslashtirish (Ko'zlar, og'iz, shapka)"
            >
              <Palette size={18} />
              <span>To'liq moslash (Studio)</span>
            </button>
          </div>

          {/* Live waiting indicator & count */}
          <div className="waiting-pulse-box">
            <div className="waiting-status-indicator">
              <span className="pulse-dot" />
              <Sparkles size={14} className="waiting-sparkle-icon" />
              <span className="waiting-players-count-text">
                <Users size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                Hozirda zalda: <strong>{playersCount}</strong> nafar ishtirokchi
              </span>
            </div>
            <p className="waiting-hint-text">
              Boshlovchi barcha ishtirokchilar yig'ilgach musobaqani boshlaydi...
            </p>
          </div>

          {/* Leave button */}
          <button className="btn-leave-lobby" onClick={onLeaveGame}>
            <LogOut size={14} />
            <span>O'yindan chiqish</span>
          </button>
        </>
      )}
    </div>
  );
}


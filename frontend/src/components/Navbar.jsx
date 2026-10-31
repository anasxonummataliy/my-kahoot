import React from 'react';
import { Trophy, Volume2, VolumeX, Smartphone, Tablet, Laptop, Users, Monitor } from 'lucide-react';

export default function Navbar({
  playersCount = 0,
  isMuted = false,
  onToggleMute,
  viewMode = 'host',
  setViewMode,
  hostName = 'Host',
  pin = '',
}) {
  return (
    <header className="navbar-container">
      {/* Brand Logo */}
      <div className="brand-group" onClick={() => setViewMode('host')} style={{ cursor: 'pointer' }}>
        <div className="logo-icon-box">
          <Trophy className="logo-trophy" size={26} />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">QuizArena</h1>
          <span className="brand-tagline">Quiz. Compete. Win.</span>
        </div>
      </div>

      {/* Middle Status Badge */}
      <div className="navbar-center-pill">
        <span className="live-badge">
          <span className="live-dot" />
          Live Quiz
        </span>
        {pin && (
          <span className="pin-badge">
            PIN: <strong>{pin}</strong>
          </span>
        )}
      </div>

      {/* Right Controls & Device Switcher */}
      <div className="navbar-right-group">
        {/* Device Simulator Toggle (Allows instant testing of mobile / tablet player views!) */}
        <div className="device-switcher" title="Switch device view for testing responsiveness">
          <button
            className={`device-btn ${viewMode === 'host' ? 'active' : ''}`}
            onClick={() => setViewMode('host')}
            title="Host Dashboard View"
          >
            <Monitor size={16} />
            <span className="btn-label">Host</span>
          </button>
          <button
            className={`device-btn ${viewMode === 'player-desktop' ? 'active' : ''}`}
            onClick={() => setViewMode('player-desktop')}
            title="Player View (Laptop)"
          >
            <Laptop size={16} />
            <span className="btn-label">Laptop</span>
          </button>
          <button
            className={`device-btn ${viewMode === 'player-tablet' ? 'active' : ''}`}
            onClick={() => setViewMode('player-tablet')}
            title="Player View (Tablet)"
          >
            <Tablet size={16} />
            <span className="btn-label">Tablet</span>
          </button>
          <button
            className={`device-btn ${viewMode === 'player-mobile' ? 'active' : ''}`}
            onClick={() => setViewMode('player-mobile')}
            title="Player View (Mobile Phone)"
          >
            <Smartphone size={16} />
            <span className="btn-label">Mobile</span>
          </button>
        </div>

        {/* Players Count Badge */}
        <div className="players-counter-badge">
          <Users size={16} />
          <span>Players: <strong>{playersCount}</strong></span>
        </div>

        {/* Sound Toggle */}
        <button
          className="icon-circle-btn"
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Host Profile Pill */}
        <div className="host-profile-pill">
          <div className="host-avatar">A</div>
          <span className="host-name">{hostName}</span>
          <span className="host-caret">▾</span>
        </div>
      </div>
    </header>
  );
}

import React from 'react';
import { Trophy, Volume2, VolumeX, Users, UserCheck, Shield } from 'lucide-react';

export default function Navbar({
  playersCount = 0,
  isMuted = false,
  onToggleMute,
  role = 'host', // 'host' or 'player'
  onToggleRole,
  hostName = 'Host',
  pin = '',
}) {
  return (
    <header className="navbar-container">
      {/* Brand Logo */}
      <div className="brand-group" onClick={() => onToggleRole && onToggleRole('host')} style={{ cursor: 'pointer' }}>
        <div className="logo-icon-box">
          <Trophy className="logo-trophy" size={24} />
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
          <span className="live-label">Live Quiz</span>
        </span>
        {pin && (
          <span className="pin-badge">
            PIN: <strong>{pin}</strong>
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="navbar-right-group">
        {/* Role Switcher Button: Lets the user switch between Host view and Player view */}
        <button
          className={`role-toggle-btn ${role === 'player' ? 'player-active' : 'host-active'}`}
          onClick={() => onToggleRole && onToggleRole(role === 'host' ? 'player' : 'host')}
          title="Boshlovchi va O'yinchi ko'rinishlari orasida o'tish"
        >
          {role === 'host' ? (
            <>
              <UserCheck size={16} />
              <span className="role-btn-text">O'yinchiga o'tish</span>
            </>
          ) : (
            <>
              <Shield size={16} />
              <span className="role-btn-text">Host paneliga o'tish</span>
            </>
          )}
        </button>

        {/* Players Count Badge */}
        <div className="players-counter-badge" title="Ulangan o'yinchilar soni">
          <Users size={16} />
          <span><strong className="players-count-num">{playersCount}</strong> <span className="players-word">o'yinchi</span></span>
        </div>

        {/* Sound Toggle */}
        <button
          className="icon-circle-btn"
          onClick={onToggleMute}
          title={isMuted ? 'Ovozni yoqish' : 'Ovozni o\'chirish'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Host Profile Pill */}
        {role === 'host' && (
          <div className="host-profile-pill">
            <div className="host-avatar">A</div>
            <span className="host-name">{hostName}</span>
            <span className="host-caret">▾</span>
          </div>
        )}
      </div>
    </header>
  );
}

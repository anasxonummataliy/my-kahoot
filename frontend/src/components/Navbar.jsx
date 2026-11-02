import React, { useState } from 'react';
import {
  Trophy,
  Volume2,
  VolumeX,
  Users,
  UserCheck,
  Shield,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
} from 'lucide-react';

export default function Navbar({
  playersCount = 0,
  isMuted = false,
  onToggleMute,
  role = 'player', // 'host' or 'player'
  onToggleRole,
  hostName = 'Host',
  pin = '',
  currentPlayer = null,
  onLeaveGame = null,
  authUser = null,
  onOpenAuth = null,
  onLogout = null,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNavClick = (action) => {
    setMobileMenuOpen(false);
    if (action) action();
  };

  return (
    <header className="navbar-container">
      {/* Brand Logo (Matching mockup: [Trophy] QuizArena) */}
      <div
        className="brand-group"
        onClick={() => {
          if (authUser && onToggleRole) {
            onToggleRole('host');
          }
        }}
        style={{ cursor: authUser ? 'pointer' : 'default' }}
      >
        <div className="logo-icon-box">
          <Trophy className="logo-trophy" size={20} />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">QuizArena</h1>
          <span className="brand-tagline">Musobaqa maydoni</span>
        </div>
      </div>

      {/* Middle Status Badge (Desktop Only) */}
      <div className="navbar-center-pill desktop-only">
        <span className="live-badge">
          <span className="live-dot" />
          <span className="live-label">Live</span>
        </span>
        {pin && (
          <span className="pin-badge">
            PIN: <strong>{pin}</strong>
          </span>
        )}
      </div>

      {/* Desktop Controls (screens > 768px) */}
      <div className="navbar-right-group desktop-only">


        {authUser ? (
          <>
            <button
              className={`role-toggle-btn ${role === 'player' ? 'player-active' : 'host-active'}`}
              onClick={() => onToggleRole && onToggleRole(role === 'host' ? 'player' : 'host')}
              title="Boshlovchi va O'yinchi ko'rinishlari orasida o'tish"
            >
              {role === 'host' ? (
                <>
                  <UserCheck size={15} />
                  <span className="role-btn-text">O'yinchi</span>
                </>
              ) : (
                <>
                  <Shield size={15} />
                  <span className="role-btn-text">Host</span>
                </>
              )}
            </button>

            <div className="auth-user-pill" title={`Kirgan: ${authUser.name || authUser.username}`}>
              <div className="auth-avatar-circle">
                {(authUser.name || authUser.username || 'U')[0].toUpperCase()}
              </div>
              <span className="auth-username-text">{authUser.name || authUser.username}</span>
            </div>

            <button
              className="btn-nav-logout"
              onClick={onLogout}
              title="Hisobdan chiqish"
            >
              <LogOut size={15} />
              <span className="logout-text">Chiqish</span>
            </button>
          </>
        ) : (
          <div className="auth-nav-buttons">
            <button
              className="btn-nav-login"
              onClick={() => onOpenAuth && onOpenAuth('login')}
              title="Tizimga kirish"
            >
              <LogIn size={15} />
              <span>Kirish</span>
            </button>
            <button
              className="btn-nav-register"
              onClick={() => onOpenAuth && onOpenAuth('register')}
              title="Ro'yxatdan o'tish"
            >
              <UserPlus size={15} />
              <span>Ro'yxat</span>
            </button>
          </div>
        )}

        <div className="players-counter-badge" title="Ulangan o'yinchilar soni">
          <Users size={15} />
          <span><strong className="players-count-num">{playersCount}</strong></span>
        </div>

        <button
          className="icon-circle-btn"
          onClick={onToggleMute}
          title={isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Mobile Controls (screens <= 768px) — Exactly matching user's mockup: [ Kirish ] [ = ] */}
      <div className="navbar-mobile-actions mobile-only">
        {authUser ? (
          <button
            className="mobile-btn-user-pill"
            onClick={() => onToggleRole && onToggleRole(role === 'host' ? 'player' : 'host')}
            title="Rejimni almashtirish"
            type="button"
          >
            <span className="mobile-user-initial">
              {(authUser.name || authUser.username || 'U')[0].toUpperCase()}
            </span>
            <span className="mobile-user-role-label">
              {role === 'host' ? 'Host' : 'O\'yinchi'}
            </span>
          </button>
        ) : (
          <button
            className="mobile-btn-kirish"
            onClick={() => onOpenAuth && onOpenAuth('login')}
            type="button"
          >
            Kirish
          </button>
        )}

        {/* Orange Rounded Square Hamburger Button (as in user screenshot) */}
        <button
          className={`mobile-hamburger-btn ${mobileMenuOpen ? 'active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menyu"
          type="button"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Dropdown Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">Menyu</span>
              <button
                type="button"
                className="mobile-menu-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-menu-items">
              {/* Not Logged In Options */}
              {!authUser ? (
                <>
                  <button
                    type="button"
                    className="mobile-menu-item mobile-menu-item-primary"
                    onClick={() => handleMobileNavClick(() => onOpenAuth && onOpenAuth('register'))}
                  >
                    <UserPlus size={18} />
                    <span>Ro'yxatdan o'tish</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-menu-item"
                    onClick={() => handleMobileNavClick(() => onOpenAuth && onOpenAuth('login'))}
                  >
                    <LogIn size={18} />
                    <span>Tizimga kirish</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Logged in account info */}
                  <div className="mobile-menu-user-card">
                    <div className="auth-avatar-circle">
                      {(authUser.name || authUser.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="mobile-user-details">
                      <div className="mobile-user-name">{authUser.name || authUser.username}</div>
                      <div className="mobile-user-badge-role">
                        {role === 'host' ? 'Boshlovchi (Host)' : "O'yinchi"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mobile-menu-item"
                    onClick={() => handleMobileNavClick(() => onToggleRole && onToggleRole(role === 'host' ? 'player' : 'host'))}
                  >
                    {role === 'host' ? <UserCheck size={18} /> : <Shield size={18} />}
                    <span>{role === 'host' ? "O'yinchi rejimiga o'tish" : "Host paneliga o'tish"}</span>
                  </button>
                </>
              )}

              <div className="mobile-menu-divider" />

              {/* Status info & settings */}
              {pin && (
                <div className="mobile-menu-info-row">
                  <span className="menu-info-label">O'yin PIN kodi:</span>
                  <span className="pin-badge">PIN: <strong>{pin}</strong></span>
                </div>
              )}

              <div className="mobile-menu-info-row">
                <span className="menu-info-label">Ulangan o'yinchilar:</span>
                <span className="players-counter-badge">
                  <Users size={14} />
                  <span><strong>{playersCount}</strong> ta</span>
                </span>
              </div>

              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => {
                  if (onToggleMute) onToggleMute();
                }}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                <span>{isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}</span>
              </button>

              {/* Leave Game if in game */}
              {pin && onLeaveGame && (
                <>
                  <div className="mobile-menu-divider" />
                  <button
                    type="button"
                    className="mobile-menu-item mobile-menu-item-danger"
                    onClick={() => handleMobileNavClick(onLeaveGame)}
                  >
                    <LogOut size={18} />
                    <span>O'yindan chiqish</span>
                  </button>
                </>
              )}

              {/* Logout if authenticated */}
              {authUser && onLogout && (
                <>
                  <div className="mobile-menu-divider" />
                  <button
                    type="button"
                    className="mobile-menu-item mobile-menu-item-danger"
                    onClick={() => handleMobileNavClick(onLogout)}
                  >
                    <LogOut size={18} />
                    <span>Hisobdan chiqish</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

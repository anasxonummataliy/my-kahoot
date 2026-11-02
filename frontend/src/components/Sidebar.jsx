import React from 'react';
import { Play, BookOpen, BarChart2, Users, StopCircle, LogOut, UserMinus, ShieldCheck } from 'lucide-react';

export default function Sidebar({
  activeTab = 'start',
  setActiveTab,
  onStartQuiz,
  onOpenQuizModal,
  onResetGame,
  isTeamMode,
  onToggleTeamMode,
  onLeaveGame,
  onLogout,
  onStopCompetition,
  sessionStatus,
}) {
  const isLobby = sessionStatus === 'lobby';

  return (
    <aside className="sidebar-container glass-card">
      <div className="sidebar-nav-list">
        {/* Start Quiz Action Button - only active in lobby to avoid resetting questions mid-game */}
        {isLobby ? (
          <button
            className={`sidebar-nav-item primary-action ${activeTab === 'start' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('start');
              if (onStartQuiz) onStartQuiz();
            }}
            title="Kutish zalidagi o'yinchilar bilan savollarni boshlash"
          >
            <Play size={18} fill="currentColor" />
            <span>Savollarni Boshlash</span>
          </button>
        ) : (
          <div className="sidebar-nav-badge" style={{ padding: '8px 12px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="live-pulse-dot" />
            <span>O'yin Davom Etmoqda</span>
          </div>
        )}

        {/* My Quizzes */}
        <button
          className={`sidebar-nav-item ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('quizzes');
            if (onOpenQuizModal) onOpenQuizModal();
          }}
          title="Mavzularni ko'rish yoki yangi quiz yaratish"
        >
          <BookOpen size={18} />
          <span>Mening Quizlarim</span>
        </button>

        {/* Team Mode Toggle Switcher */}
        <div className="sidebar-divider" />
        <button
          className={`sidebar-nav-item team-toggle ${isTeamMode ? 'team-active' : ''}`}
          onClick={onToggleTeamMode}
          title="Jamoaviy va yakka tartibdagi musobaqa rejimi orasida almashtirish"
        >
          <Users size={18} />
          <div className="team-toggle-info">
            <span>Jamoviy Musobaqa</span>
            <small>{isTeamMode ? 'Faol (Jamoalar)' : 'Yakkama-yakka'}</small>
          </div>
        </button>
      </div>

      {/* Leave Game & Log Out at bottom */}
      <div className="sidebar-footer">
        {sessionStatus !== 'lobby' && onStopCompetition && (
          <button
            className="sidebar-nav-item stop-side-btn"
            onClick={onStopCompetition}
            title="Musobaqani to'xtatish"
          >
            <StopCircle size={16} />
            <span>Musobaqani to'xtatish</span>
          </button>
        )}

        {onLeaveGame && (
          <button
            className="sidebar-nav-item leave-side-btn"
            onClick={onLeaveGame}
            title="Joriy o'yin zalini yopish va chiqish"
          >
            <UserMinus size={16} />
            <span>Zaldan Chiqish</span>
          </button>
        )}

        {onLogout && (
          <button
            className="sidebar-nav-item logout-btn"
            onClick={onLogout}
            title="Hisobdan chiqish (Logout)"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={16} />
            <span>Tizimdan Chiqish</span>
          </button>
        )}
      </div>
    </aside>
  );
}

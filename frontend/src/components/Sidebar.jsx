import React from 'react';
import { Play, BookOpen, BarChart2, Settings, LogOut, PlusCircle, Users } from 'lucide-react';

export default function Sidebar({
  activeTab = 'start',
  setActiveTab,
  onStartQuiz,
  onOpenQuizModal,
  onResetGame,
  isTeamMode,
  onToggleTeamMode,
}) {
  return (
    <aside className="sidebar-container glass-card">
      <div className="sidebar-nav-list">
        {/* Start Quiz Action Button */}
        <button
          className={`sidebar-nav-item primary-action ${activeTab === 'start' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('start');
            if (onStartQuiz) onStartQuiz();
          }}
        >
          <Play size={18} fill="currentColor" />
          <span>Start Quiz</span>
        </button>

        {/* My Quizzes */}
        <button
          className={`sidebar-nav-item ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('quizzes');
            if (onOpenQuizModal) onOpenQuizModal();
          }}
        >
          <BookOpen size={18} />
          <span>My Quizzes</span>
        </button>

        {/* Leaderboard */}
        <button
          className={`sidebar-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <BarChart2 size={18} />
          <span>Leaderboard</span>
        </button>

        {/* Team Mode Toggle Switcher */}
        <div className="sidebar-divider" />
        <button
          className={`sidebar-nav-item team-toggle ${isTeamMode ? 'team-active' : ''}`}
          onClick={onToggleTeamMode}
          title="Toggle between Team competition and Individual competition"
        >
          <Users size={18} />
          <div className="team-toggle-info">
            <span>Jamoviy Musobaqa</span>
            <small>{isTeamMode ? 'Faol (Jamoalar)' : 'Yakkama-yakka'}</small>
          </div>
        </button>

        {/* Settings */}
        <button
          className={`sidebar-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>

      {/* Log Out at bottom */}
      <div className="sidebar-footer">
        <button className="sidebar-nav-item logout-btn" onClick={onResetGame}>
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

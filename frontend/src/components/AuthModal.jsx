import React, { useState } from 'react';
import { X, Lock, User, Sparkles, LogIn, UserPlus, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login', // 'login' | 'register'
  onAuthSuccess,
}) {
  const [tab, setTab] = useState(initialTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim() || !password.trim()) {
      setError("Iltimos, foydalanuvchi nomi va parolni to'ldiring!");
      return;
    }

    if (tab === 'register' && password.length < 4) {
      setError("Parol kamida 4 ta belgidan iborat bo'lishi kerak!");
      return;
    }

    setLoading(true);
    const endpoint = tab === 'register' ? '/api/auth/register/' : '/api/auth/login/';
    const body = tab === 'register'
      ? { username: username.trim(), password: password.trim(), name: name.trim() }
      : { username: username.trim(), password: password.trim() };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(tab === 'register' ? "Ro'yxatdan muvaffaqiyatli o'tdingiz!" : "Xush kelibsiz!");
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(data.user);
          onClose();
        }, 500);
      } else {
        setError(data.error || "Xatolik yuz berdi. Qayta urinib ko'ring.");
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError("Server bilan aloqa uzildi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="auth-modal-card glass-panel pulsing-glow" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} title="Yopish">
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="auth-modal-header">
          <div className="auth-icon-wrap">
            <Lock size={26} className="auth-lock-icon" />
          </div>
          <h2 className="auth-title">
            {tab === 'login' ? 'QuizArena ga Kirish' : 'Hisob Yaratish'}
          </h2>
          <p className="auth-subtitle">
            {tab === 'login'
              ? "Boshlovchi (Host) sifatida quizlarni boshqarish uchun kiring"
              : "Yangi quizlar yaratish va o'yinlar o'tkazish uchun ro'yxatdan o'ting"}
          </p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs-row">
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setTab('login');
              setError('');
            }}
          >
            <LogIn size={15} />
            <span>Kirish</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setTab('register');
              setError('');
            }}
          >
            <UserPlus size={15} />
            <span>Ro'yxatdan o'tish</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-success-banner">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">
                <User size={14} />
                <span>Ismingiz yoki Taxallusingiz (ixtiyoriy)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Sardor"
                className="input-text-field"
                maxLength={30}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <User size={14} />
              <span>Foydalanuvchi nomi (Username)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username kiriting"
              className="input-text-field"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={14} />
              <span>Parol</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parolni kiriting"
              className="input-text-field"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={loading}
          >
            <span>{loading ? "Bajarilmoqda..." : tab === 'login' ? "Kirish" : "Ro'yxatdan o'tish"}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Bottom Guest Play Assurance */}
        <div className="auth-guest-footer">
          <p className="guest-note-text">
            💡 <strong>Eslatma:</strong> O'yinda qatnashish uchun ro'yxatdan o'tish shart emas!
          </p>
          <button type="button" className="btn-continue-guest" onClick={onClose}>
            Mehmon sifatida o'yinchi bo'lib qatnashish →
          </button>
        </div>
      </div>
    </div>
  );
}

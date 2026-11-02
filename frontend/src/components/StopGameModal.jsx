import React from 'react';
import { AlertTriangle, RotateCcw, XCircle, X } from 'lucide-react';

export default function StopGameModal({
  isOpen,
  onClose,
  onStopToLobby,
  onStopCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="glass-panel stop-game-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Yopish"
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          <X size={20} />
        </button>

        <div className="stop-game-modal-header">
          <div className="stop-game-warning-icon-wrap">
            <AlertTriangle size={32} className="warning-triangle-icon" />
          </div>
          <h2 className="stop-game-title">Musobaqani to'xtatish</h2>
          <p className="stop-game-desc">
            Musobaqa jarayoni to'xtatiladi. Qaysi amalni bajarmoqchisiz?
          </p>
        </div>

        <div className="stop-game-options-grid">
          {/* Option 1: Reset back to Lobby */}
          <div
            className="stop-option-card option-lobby"
            onClick={onStopToLobby}
            role="button"
            tabIndex={0}
          >
            <div className="stop-option-icon-box lobby-icon">
              <RotateCcw size={24} />
            </div>
            <div className="stop-option-text">
              <h3>Lobbini qayta o'rnatish</h3>
              <p>
                Barcha o'yinchilar kutish zaliga qaytariladi. O'yinchilar qoladi, avatarlarini
                yana o'zgartirishi yoki boshqa quiz tanlab qayta boshlash mumkin.
              </p>
            </div>
          </div>

          {/* Option 2: Stop completely */}
          <div
            className="stop-option-card option-cancel"
            onClick={onStopCancel}
            role="button"
            tabIndex={0}
          >
            <div className="stop-option-icon-box cancel-icon">
              <XCircle size={24} />
            </div>
            <div className="stop-option-text">
              <h3>Butunlay to'xtatish va yopish</h3>
              <p>
                O'yin zalini yopish, barcha ishtirokchilarni bosh sahifaga chiqarish va sessiyani
                yakunlash.
              </p>
            </div>
          </div>
        </div>

        <div className="stop-game-footer">
          <button
            type="button"
            className="btn-secondary btn-continue-game"
            onClick={onClose}
          >
            Musobaqani davom ettirish (Bekor qilish)
          </button>
        </div>
      </div>
    </div>
  );
}

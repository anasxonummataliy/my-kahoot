import React, { useState, useEffect } from 'react';
import { Dices, Sparkles, Smile, Palette, Glasses, Crown, Check, Heart, Volume2 } from 'lucide-react';
import KahootAvatar, {
  AVATAR_COLORS,
  AVATAR_BODIES,
  AVATAR_EYES,
  AVATAR_MOUTHS,
  AVATAR_ACCESSORIES,
  getRandomAvatar,
} from './KahootAvatar';
import { soundManager } from '../utils/soundEffects';

const REACTION_PHRASES = [
  "Zo'r tanlov! 🔥",
  "Juda yarashdi! ✨",
  "Dahshatli ko'rinish! ⚡",
  "Top-1 ga tayyorman! 👑",
  "Super qahramon! 🚀",
  "Yengilmas jamoa! 🏆",
  "Chiroyli! 💖",
  "Olg'a intilamiz! 🎯",
];

export default function AvatarStudio({
  avatar = {},
  onChange,
  onDone,
}) {
  const [activeTab, setActiveTab] = useState('color'); // color | eyes | mouth | accessory
  const [isSpinning, setIsSpinning] = useState(false);
  const [reactionState, setReactionState] = useState('idle'); // 'idle' | 'pop' | 'celebrate' | 'spin'
  const [speechText, setSpeechText] = useState("Salom! Meni o'zingizga moslang!");
  const [speechVisible, setSpeechVisible] = useState(true);
  const [particles, setParticles] = useState([]);

  // Burst particle effect
  const triggerParticles = () => {
    const emojis = ['✨', '⭐', '🎉', '💖', '🔥', '💫'];
    const newParticles = Array.from({ length: 6 }).map((_, idx) => ({
      id: Date.now() + idx,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: (Math.random() - 0.5) * 110,
      y: (Math.random() - 0.5) * 80 - 20,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 700);
  };

  const triggerReaction = (text, type = 'pop') => {
    setReactionState(type);
    if (text) {
      setSpeechText(text);
      setSpeechVisible(true);
    }
    setTimeout(() => {
      setReactionState('idle');
    }, 550);
  };

  // Kahoot slot-machine style dice spin
  const handleRandomize = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setReactionState('spin');
    setSpeechVisible(false);

    let step = 0;
    const totalSteps = 7;
    const interval = setInterval(() => {
      step++;
      const randomTemp = getRandomAvatar();
      if (onChange) onChange(randomTemp);
      soundManager.playSpinTick();

      if (step >= totalSteps) {
        clearInterval(interval);
        const finalAvatar = getRandomAvatar();
        if (onChange) onChange(finalAvatar);
        setIsSpinning(false);
        soundManager.playSpinLand();
        triggerParticles();
        triggerReaction("Yangi Qahramon tayyor! 🎉", 'celebrate');
      }
    }, 65);
  };

  const updateProp = (prop, value) => {
    if (prop === 'accessory') {
      soundManager.playAvatarBoing();
    } else if (prop === 'eyes') {
      soundManager.playAvatarGiggle();
    } else {
      soundManager.playAvatarPop(550 + Math.random() * 300);
    }

    if (onChange) {
      onChange({ ...avatar, [prop]: value });
    }

    triggerParticles();
    const randomPhrase = REACTION_PHRASES[Math.floor(Math.random() * REACTION_PHRASES.length)];
    triggerReaction(randomPhrase, 'pop');
  };

  const handleAvatarClick = () => {
    soundManager.playAvatarGiggle();
    triggerParticles();
    const quotes = [
      "Ketdik, g'alaba bizniki! 🚀",
      "Tezroq o'yinni boshlaylik! ⚡",
      "Men tayyorman! 🎯",
      "Musobaqa yulduzi! 🌟",
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    triggerReaction(q, 'celebrate');
  };

  return (
    <div className="avatar-studio-box glass-panel">
      {/* Studio Header */}
      <div className="avatar-studio-header">
        <div className="studio-title-group">
          <Sparkles size={20} className="sparkle-gold animate-spin-slow" />
          <h3 className="studio-title">Kahoot Qahramonlar Studiyasi</h3>
        </div>

        {/* Kahoot Rapid Spin Button */}
        <button
          type="button"
          className={`btn-randomize-dice ${isSpinning ? 'spinning' : ''}`}
          onClick={handleRandomize}
          disabled={isSpinning}
          title="Tasodifiy qahramon aylantirish (Kahoot Spin!)"
        >
          <Dices size={18} className={isSpinning ? 'dice-spin' : ''} />
          <span>{isSpinning ? "Aylanmoqda..." : "Aylantirish (Spin)"}</span>
        </button>
      </div>

      {/* Main Animated Preview Stage */}
      <div className="avatar-preview-stage">
        {/* Kahoot Speech / Reaction Bubble */}
        <div className={`avatar-speech-bubble ${speechVisible ? 'visible' : ''}`}>
          <span>{speechText}</span>
          <div className="speech-arrow" />
        </div>

        {/* Floating Particle Bursts */}
        <div className="particle-container">
          {particles.map((p) => (
            <span
              key={p.id}
              className="floating-particle"
              style={{
                transform: `translate(${p.x}px, ${p.y}px)`,
              }}
            >
              {p.emoji}
            </span>
          ))}
        </div>

        <div className="preview-pedestal-light" />
        <div className="stage-glow-ring" />

        <KahootAvatar
          avatar={avatar}
          size={140}
          isInteractive={true}
          reaction={reactionState}
          onClick={handleAvatarClick}
          className={`studio-main-character ${isSpinning ? 'spin-anim' : ''}`}
        />

        <div className="avatar-tap-hint">
          <Sparkles size={12} />
          <span>Ustiga bosing yoki tanlang — qahramon javob beradi!</span>
        </div>
      </div>

      {/* Studio Controls Pane (Tabs + Options) */}
      <div className="studio-controls-pane">
        {/* Studio Navigation Tabs */}
        <div className="avatar-studio-tabs">
        <button
          type="button"
          className={`studio-tab-btn ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveTab('color');
          }}
        >
          <Palette size={16} />
          <span>Shakl & Rang</span>
        </button>
        <button
          type="button"
          className={`studio-tab-btn ${activeTab === 'eyes' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveTab('eyes');
          }}
        >
          <Glasses size={16} />
          <span>Ko'zlar</span>
        </button>
        <button
          type="button"
          className={`studio-tab-btn ${activeTab === 'mouth' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveTab('mouth');
          }}
        >
          <Smile size={16} />
          <span>Og'iz</span>
        </button>
        <button
          type="button"
          className={`studio-tab-btn ${activeTab === 'accessory' ? 'active' : ''}`}
          onClick={() => {
            soundManager.playClick();
            setActiveTab('accessory');
          }}
        >
          <Crown size={16} />
          <span>Bosh kiyim</span>
        </button>
      </div>

      {/* Tab Content Panes */}
      <div className="studio-tab-content">
        {/* 1. Shakl & Rang */}
        {activeTab === 'color' && (
          <div className="studio-pane tab-slide-in">
            <span className="studio-sub-label">Qahramon shakli:</span>
            <div className="options-selector-row">
              {AVATAR_BODIES.map((body) => {
                const bodyLabels = {
                  blob: 'Dumaloq',
                  cat: 'Mushukcha',
                  bear: 'Ayiqcha',
                  alien: 'O\'zga sayyora',
                  robot: 'Robot',
                  star: 'Yulduzcha',
                };
                return (
                  <button
                    type="button"
                    key={body}
                    className={`body-pick-btn ${avatar.bodyType === body ? 'selected jelly-active' : ''}`}
                    onClick={() => updateProp('bodyType', body)}
                  >
                    <KahootAvatar avatar={{ ...avatar, bodyType: body, accessory: 'none' }} size={42} />
                    <span className="picker-text-label">{bodyLabels[body] || body}</span>
                  </button>
                );
              })}
            </div>

            <span className="studio-sub-label" style={{ marginTop: '14px' }}>Ranglar palitrasi:</span>
            <div className="colors-palette-grid">
              {AVATAR_COLORS.map((col) => (
                <button
                  type="button"
                  key={col.id}
                  className={`color-bubble-btn ${avatar.color === col.id ? 'active-ring color-bounce' : ''}`}
                  style={{ background: col.bg }}
                  onClick={() => updateProp('color', col.id)}
                  title={col.label}
                >
                  {avatar.color === col.id && <Check size={16} color="#ffffff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Ko'zlar */}
        {activeTab === 'eyes' && (
          <div className="studio-pane tab-slide-in">
            <div className="feature-picker-grid">
              {AVATAR_EYES.map((eye) => {
                const eyeLabels = {
                  happy: 'Baxtli',
                  shades: 'Ochki',
                  wink: 'Qisiq',
                  laser: 'Visor',
                  anime: 'Anime',
                  goggles: 'VR Goggles',
                  hearts: 'Yurakcha',
                  dizzy: 'Aylana',
                };
                return (
                  <button
                    type="button"
                    key={eye}
                    className={`feature-pick-card ${avatar.eyes === eye ? 'active jelly-active' : ''}`}
                    onClick={() => updateProp('eyes', eye)}
                  >
                    <KahootAvatar
                      avatar={{ ...avatar, eyes: eye, accessory: 'none', mouth: 'smile' }}
                      size={48}
                    />
                    <span className="picker-text-label">{eyeLabels[eye] || eye}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Og'iz */}
        {activeTab === 'mouth' && (
          <div className="studio-pane tab-slide-in">
            <div className="feature-picker-grid">
              {AVATAR_MOUTHS.map((m) => {
                const mouthLabels = {
                  smile: 'Tabassum',
                  laugh: 'Qahqaha',
                  tongue: 'Sho\'x til',
                  teeth: 'Keng kulgu',
                  mustache: 'Mo\'ylov',
                  surprised: 'Hayrat',
                };
                return (
                  <button
                    type="button"
                    key={m}
                    className={`feature-pick-card ${avatar.mouth === m ? 'active jelly-active' : ''}`}
                    onClick={() => updateProp('mouth', m)}
                  >
                    <KahootAvatar
                      avatar={{ ...avatar, mouth: m, accessory: 'none' }}
                      size={48}
                    />
                    <span className="picker-text-label">{mouthLabels[m] || m}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Aksessuarlar & Bosh kiyim */}
        {activeTab === 'accessory' && (
          <div className="studio-pane tab-slide-in">
            <div className="feature-picker-grid">
              {AVATAR_ACCESSORIES.map((acc) => {
                const accLabels = {
                  none: 'Bosh kiyimsiz',
                  crown: 'Oltin Toj',
                  headphones: 'DJ Quloqchin',
                  party: 'Bayram',
                  cap: 'Kepka',
                  halo: 'Farishta Halo',
                  horns: 'Sho\'x shoxlar',
                  flower: 'Tropik gul',
                  ninja: 'Ninja lenta',
                };
                return (
                  <button
                    type="button"
                    key={acc}
                    className={`feature-pick-card ${avatar.accessory === acc ? 'active jelly-active' : ''}`}
                    onClick={() => updateProp('accessory', acc)}
                  >
                    <KahootAvatar
                      avatar={{ ...avatar, accessory: acc }}
                      size={48}
                    />
                    <span className="picker-text-label">{accLabels[acc] || acc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>

      {onDone && (
        <button type="button" className="btn-primary studio-done-btn pulse-glow" onClick={onDone}>
          <span>Shu qahramon bilan davom etish</span>
          <Check size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

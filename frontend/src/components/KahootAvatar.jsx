import React, { useState } from 'react';

// Default palettes and options for Kahoot-style customizable avatars
export const AVATAR_COLORS = [
  { id: 'purple', label: 'Binafsha', bg: '#8b5cf6', grad: ['#a78bfa', '#7c3aed'] },
  { id: 'cyan', label: 'Moviy', bg: '#06b6d4', grad: ['#67e8f9', '#0891b2'] },
  { id: 'emerald', label: 'Yashil', bg: '#10b981', grad: ['#6ee7b7', '#059669'] },
  { id: 'amber', label: 'Oltin', bg: '#f59e0b', grad: ['#fde68a', '#d97706'] },
  { id: 'rose', label: 'Pushti', bg: '#ec4899', grad: ['#f472b6', '#db2777'] },
  { id: 'red', label: 'Qizil', bg: '#ef4444', grad: ['#f87171', '#dc2626'] },
  { id: 'indigo', label: 'To\'q ko\'k', bg: '#6366f1', grad: ['#818cf8', '#4f46e5'] },
  { id: 'orange', label: 'Olovrang', bg: '#f97316', grad: ['#fb923c', '#ea580c'] },
];

export const AVATAR_BODIES = ['blob', 'cat', 'alien', 'robot', 'star', 'bear'];
export const AVATAR_EYES = ['happy', 'shades', 'wink', 'laser', 'anime', 'goggles', 'hearts', 'dizzy'];
export const AVATAR_MOUTHS = ['smile', 'laugh', 'tongue', 'teeth', 'mustache', 'surprised'];
export const AVATAR_ACCESSORIES = ['none', 'crown', 'headphones', 'party', 'cap', 'halo', 'horns', 'flower', 'ninja'];

export function getRandomAvatar(nickname = '') {
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return {
    bodyType: rand(AVATAR_BODIES),
    color: rand(AVATAR_COLORS).id,
    eyes: rand(AVATAR_EYES),
    mouth: rand(AVATAR_MOUTHS),
    accessory: rand(AVATAR_ACCESSORIES),
    expression: 'idle',
  };
}

export default function KahootAvatar({
  avatar = {},
  size = 80,
  isInteractive = false,
  reaction = 'idle', // 'idle' | 'happy' | 'wrong' | 'celebrate' | 'pop' | 'spin'
  onClick,
  className = '',
}) {
  const [clicked, setClicked] = useState(false);

  const config = {
    bodyType: avatar?.bodyType || 'blob',
    color: avatar?.color || 'purple',
    eyes: avatar?.eyes || 'happy',
    mouth: avatar?.mouth || 'smile',
    accessory: avatar?.accessory || 'none',
    ...avatar,
  };

  const selectedColor = AVATAR_COLORS.find((c) => c.id === config.color) || AVATAR_COLORS[0];
  const gradId = `grad_${config.color}_${Math.abs(Math.round(size))}`;

  const handleClick = (e) => {
    if (isInteractive) {
      setClicked(true);
      setTimeout(() => setClicked(false), 550);
    }
    if (onClick) onClick(e);
  };

  // Expression & animation classes
  let animClass = 'avatar-idle-bob';
  if (reaction === 'happy' || reaction === 'celebrate') {
    animClass = 'avatar-celebrate';
  } else if (reaction === 'wrong' || reaction === 'dizzy') {
    animClass = 'avatar-dizzy';
  } else if (reaction === 'spin') {
    animClass = 'spin-anim';
  } else if (reaction === 'pop' || clicked) {
    animClass = 'avatar-pop-click';
  }

  return (
    <div
      className={`kahoot-avatar-wrapper ${animClass} ${className} ${isInteractive ? 'interactive' : ''}`}
      style={{ width: size, height: size }}
      onClick={handleClick}
      title="Kahoot Avatar"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="kahoot-avatar-svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={selectedColor.grad[0]} />
            <stop offset="100%" stopColor={selectedColor.grad[1]} />
          </linearGradient>

          {/* Shading filter */}
          <radialGradient id={`avatarShade_${gradId}`} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
          </radialGradient>
        </defs>

        {/* 1. BODY SHAPES */}
        <g className="avatar-body-group">
          {config.bodyType === 'blob' && (
            <path
              d="M 50 16 C 74 16, 88 32, 88 56 C 88 80, 72 88, 50 88 C 28 88, 12 80, 12 56 C 12 32, 26 16, 50 16 Z"
              fill={`url(#${gradId})`}
            />
          )}

          {config.bodyType === 'cat' && (
            <g>
              {/* Ears with twitch animation */}
              <g className="avatar-ears-twitch">
                <polygon points="20,40 12,14 36,24" fill={selectedColor.grad[1]} />
                <polygon points="22,36 16,18 34,26" fill="#f472b6" />
                <polygon points="80,40 88,14 64,24" fill={selectedColor.grad[1]} />
                <polygon points="78,36 84,18 66,26" fill="#f472b6" />
              </g>
              {/* Head */}
              <circle cx="50" cy="54" r="36" fill={`url(#${gradId})`} />
            </g>
          )}

          {config.bodyType === 'bear' && (
            <g>
              {/* Bear Ears */}
              <circle cx="22" cy="30" r="14" fill={selectedColor.grad[1]} />
              <circle cx="22" cy="30" r="8" fill="#fbcfe8" />
              <circle cx="78" cy="30" r="14" fill={selectedColor.grad[1]} />
              <circle cx="78" cy="30" r="8" fill="#fbcfe8" />
              {/* Bear Head */}
              <circle cx="50" cy="55" r="35" fill={`url(#${gradId})`} />
            </g>
          )}

          {config.bodyType === 'alien' && (
            <g>
              {/* Swaying Antenna */}
              <g className="avatar-antenna-sway">
                <line x1="50" y1="20" x2="50" y2="7" stroke={selectedColor.grad[0]} strokeWidth="4" strokeLinecap="round" />
                <circle cx="50" cy="5" r="6" fill="#fde047" className="antenna-glow" />
              </g>
              {/* Ears */}
              <ellipse cx="14" cy="52" rx="7" ry="12" fill={selectedColor.grad[1]} />
              <ellipse cx="86" cy="52" rx="7" ry="12" fill={selectedColor.grad[1]} />
              {/* Alien Head */}
              <ellipse cx="50" cy="54" rx="36" ry="32" fill={`url(#${gradId})`} />
            </g>
          )}

          {config.bodyType === 'robot' && (
            <g>
              <line x1="50" y1="18" x2="50" y2="10" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
              <circle cx="50" cy="8" r="5" fill="#38bdf8" className="robot-antenna-blinker" />
              {/* Robot Head */}
              <rect x="18" y="22" width="64" height="64" rx="18" fill={`url(#${gradId})`} />
              {/* Bolts on sides */}
              <rect x="12" y="46" width="6" height="14" rx="2" fill="#94a3b8" />
              <rect x="82" y="46" width="6" height="14" rx="2" fill="#94a3b8" />
            </g>
          )}

          {config.bodyType === 'star' && (
            <path
              d="M 50 12 L 60 36 L 86 38 L 66 56 L 72 82 L 50 68 L 28 82 L 34 56 L 14 38 L 40 36 Z"
              fill={`url(#${gradId})`}
              strokeLinejoin="round"
              strokeWidth="4"
              stroke={selectedColor.grad[0]}
            />
          )}

          {/* Body Soft Inner Highlight */}
          <ellipse cx="50" cy="52" rx="34" ry="32" fill={`url(#avatarShade_${gradId})`} />
        </g>

        {/* 2. BLUSH CHEEKS */}
        <g opacity="0.65" className="avatar-cheeks-pulse">
          <ellipse cx="28" cy="62" rx="5.5" ry="3.5" fill="#f43f5e" />
          <ellipse cx="72" cy="62" rx="5.5" ry="3.5" fill="#f43f5e" />
        </g>

        {/* 3. EYES WITH NATURAL BLINKING & EXPRESSIONS */}
        <g className="avatar-eyes-group">
          {config.eyes === 'happy' && (
            <g className="avatar-eyes-blink">
              {/* Left Eye */}
              <ellipse cx="36" cy="48" rx="7" ry="9" fill="#1e1b4b" />
              <circle cx="34" cy="45" r="3" fill="#ffffff" />
              <circle cx="38" cy="51" r="1.5" fill="#ffffff" />
              {/* Right Eye */}
              <ellipse cx="64" cy="48" rx="7" ry="9" fill="#1e1b4b" />
              <circle cx="62" cy="45" r="3" fill="#ffffff" />
              <circle cx="66" cy="51" r="1.5" fill="#ffffff" />
            </g>
          )}

          {config.eyes === 'shades' && (
            <g className="avatar-shades-wobble">
              {/* Cool Sunglasses */}
              <polygon points="22,42 48,42 44,56 26,56" fill="#0f172a" />
              <polygon points="52,42 78,42 74,56 56,56" fill="#0f172a" />
              <line x1="48" y1="45" x2="52" y2="45" stroke="#0f172a" strokeWidth="3" />
              {/* Gloss line glint */}
              <line x1="26" y1="46" x2="42" y2="46" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.85" className="glasses-glint" />
              <line x1="56" y1="46" x2="72" y2="46" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.85" className="glasses-glint" />
            </g>
          )}

          {config.eyes === 'wink' && (
            <g>
              {/* Left Eye: Open & Happy (Blinking) */}
              <g className="avatar-eyes-blink">
                <ellipse cx="36" cy="48" rx="7" ry="9" fill="#1e1b4b" />
                <circle cx="34" cy="45" r="3" fill="#ffffff" />
              </g>
              {/* Right Eye: Wink Arc */}
              <path d="M 58 50 Q 64 42 70 50" fill="none" stroke="#1e1b4b" strokeWidth="4" strokeLinecap="round" />
              <circle cx="70" cy="42" r="2" fill="#facc15" className="wink-star" />
            </g>
          )}

          {config.eyes === 'laser' && (
            <g>
              {/* Cyber Visor with scanning laser */}
              <rect x="22" y="42" width="56" height="13" rx="4" fill="#0284c7" />
              <line x1="24" y1="48" x2="76" y2="48" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="48" r="4.5" fill="#f0fdf4" className="laser-pulse" />
            </g>
          )}

          {config.eyes === 'anime' && (
            <g className="avatar-eyes-blink">
              {/* Big Sparkling Kawaii Anime Eyes */}
              <ellipse cx="36" cy="48" rx="8" ry="11" fill="#4338ca" />
              <ellipse cx="64" cy="48" rx="8" ry="11" fill="#4338ca" />
              <circle cx="34" cy="44" r="4" fill="#ffffff" />
              <circle cx="62" cy="44" r="4" fill="#ffffff" />
              <circle cx="38" cy="52" r="2" fill="#ffffff" />
              <circle cx="66" cy="52" r="2" fill="#ffffff" />
            </g>
          )}

          {config.eyes === 'goggles' && (
            <g>
              {/* Gamer VR / Aviator Goggles */}
              <circle cx="36" cy="48" r="11" fill="#334155" stroke="#94a3b8" strokeWidth="3" />
              <circle cx="64" cy="48" r="11" fill="#334155" stroke="#94a3b8" strokeWidth="3" />
              <line x1="47" y1="48" x2="53" y2="48" stroke="#94a3b8" strokeWidth="3" />
              <circle cx="34" cy="46" r="4" fill="#38bdf8" opacity="0.85" className="vr-lens-glow" />
              <circle cx="62" cy="46" r="4" fill="#38bdf8" opacity="0.85" className="vr-lens-glow" />
            </g>
          )}

          {config.eyes === 'hearts' && (
            <g className="avatar-heart-eyes">
              {/* Heart Eyes */}
              <path d="M 36 44 C 36 40, 31 38, 29 42 C 27 38, 22 40, 22 44 C 22 49, 29 55, 29 55 C 29 55, 36 49, 36 44 Z" fill="#ef4444" transform="scale(1.1) translate(-2, -3)" />
              <path d="M 64 44 C 64 40, 59 38, 57 42 C 55 38, 50 40, 50 44 C 50 49, 57 55, 57 55 C 57 55, 64 49, 64 44 Z" fill="#ef4444" transform="scale(1.1) translate(4, -3)" />
            </g>
          )}

          {config.eyes === 'dizzy' && (
            <g className="avatar-spiral-eyes">
              {/* Spiral Cartoon Dizzy Eyes */}
              <circle cx="36" cy="48" r="7" fill="none" stroke="#1e1b4b" strokeWidth="2.5" />
              <circle cx="36" cy="48" r="3.5" fill="none" stroke="#1e1b4b" strokeWidth="2" />
              <circle cx="64" cy="48" r="7" fill="none" stroke="#1e1b4b" strokeWidth="2.5" />
              <circle cx="64" cy="48" r="3.5" fill="none" stroke="#1e1b4b" strokeWidth="2" />
            </g>
          )}
        </g>

        {/* 4. MOUTHS */}
        <g className="avatar-mouth-group">
          {config.mouth === 'smile' && (
            <path
              d="M 40 64 Q 50 74 60 64"
              fill="none"
              stroke="#1e1b4b"
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}

          {config.mouth === 'laugh' && (
            <g className="avatar-mouth-laugh">
              <path d="M 38 62 Q 50 82 62 62 Z" fill="#991b1b" />
              <path d="M 43 69 Q 50 78 57 69 Z" fill="#f43f5e" />
            </g>
          )}

          {config.mouth === 'tongue' && (
            <g>
              <path d="M 40 64 Q 50 72 60 64" fill="none" stroke="#1e1b4b" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M 46 68 C 46 78 54 78 54 68 Z" fill="#f43f5e" className="tongue-stick" />
              <line x1="50" y1="68" x2="50" y2="73" stroke="#be123c" strokeWidth="1.5" />
            </g>
          )}

          {config.mouth === 'teeth' && (
            <g>
              <rect x="38" y="62" width="24" height="10" rx="4" fill="#ffffff" stroke="#1e1b4b" strokeWidth="2.5" />
              <line x1="50" y1="62" x2="50" y2="72" stroke="#1e1b4b" strokeWidth="1.5" />
              <line x1="44" y1="62" x2="44" y2="72" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="56" y1="62" x2="56" y2="72" stroke="#cbd5e1" strokeWidth="1" />
            </g>
          )}

          {config.mouth === 'mustache' && (
            <g className="avatar-mustache-wiggle">
              <path d="M 50 63 C 44 57 32 60 34 68 C 42 68 47 64 50 66 C 53 64 58 68 66 68 C 68 60 56 57 50 63 Z" fill="#451a03" />
            </g>
          )}

          {config.mouth === 'surprised' && (
            <ellipse cx="50" cy="67" rx="6" ry="8" fill="#1e1b4b" />
          )}
        </g>

        {/* 5. ACCESSORIES & HATS WITH BOUNCY SPRINGS */}
        <g className="avatar-accessory-group">
          {config.accessory === 'crown' && (
            <g className="floating-crown">
              <polygon
                points="30,22 34,6 44,16 50,4 56,16 66,6 70,22"
                fill="#facc15"
                stroke="#ca8a04"
                strokeWidth="2"
              />
              <circle cx="50" cy="5" r="2.5" fill="#ef4444" className="gem-shimmer" />
              <circle cx="34" cy="7" r="2" fill="#3b82f6" className="gem-shimmer" />
              <circle cx="66" cy="7" r="2" fill="#10b981" className="gem-shimmer" />
            </g>
          )}

          {config.accessory === 'headphones' && (
            <g className="bouncing-headphones">
              {/* Headband */}
              <path d="M 16 50 C 16 18, 84 18, 84 50" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
              {/* Ear cushions */}
              <rect x="9" y="38" width="12" height="24" rx="6" fill="#3b82f6" />
              <rect x="79" y="38" width="12" height="24" rx="6" fill="#3b82f6" />
              <circle cx="15" cy="50" r="3" fill="#93c5fd" />
              <circle cx="85" cy="50" r="3" fill="#93c5fd" />
            </g>
          )}

          {config.accessory === 'party' && (
            <g className="swaying-party-hat" transform="translate(10, -4) rotate(8 50 20)">
              <polygon points="40,24 60,24 50,0" fill="#f43f5e" />
              {/* Stripes */}
              <line x1="43" y1="17" x2="57" y2="17" stroke="#facc15" strokeWidth="2.5" />
              <line x1="47" y1="9" x2="53" y2="9" stroke="#38bdf8" strokeWidth="2" />
              {/* Pom pom */}
              <circle cx="50" cy="0" r="3.5" fill="#facc15" className="pom-pom-bounce" />
            </g>
          )}

          {config.accessory === 'cap' && (
            <g className="street-cap">
              {/* Backward Street Cap */}
              <path d="M 24 28 C 24 15 76 15 76 28 Z" fill="#ef4444" />
              <rect x="22" y="27" width="56" height="5" rx="2" fill="#b91c1c" />
              <path d="M 74 29 Q 88 32 95 36" stroke="#b91c1c" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="50" cy="18" r="2" fill="#ffffff" />
            </g>
          )}

          {config.accessory === 'halo' && (
            <g className="floating-halo">
              <ellipse cx="50" cy="10" rx="24" ry="7" fill="none" stroke="#fde047" strokeWidth="3.5" />
              <ellipse cx="50" cy="10" rx="24" ry="7" fill="none" stroke="#fef08a" strokeWidth="1.5" opacity="0.8" />
            </g>
          )}

          {config.accessory === 'horns' && (
            <g className="devil-horns">
              <path d="M 26 28 Q 16 14 19 5 Q 28 12 34 22 Z" fill="#dc2626" />
              <path d="M 74 28 Q 84 14 81 5 Q 72 12 66 22 Z" fill="#dc2626" />
            </g>
          )}

          {config.accessory === 'flower' && (
            <g className="spinning-flower" transform="translate(68, 20)">
              {/* 5 Petals */}
              <circle cx="0" cy="-6" r="4.5" fill="#f43f5e" />
              <circle cx="6" cy="-2" r="4.5" fill="#f43f5e" />
              <circle cx="4" cy="5" r="4.5" fill="#f43f5e" />
              <circle cx="-4" cy="5" r="4.5" fill="#f43f5e" />
              <circle cx="-6" cy="-2" r="4.5" fill="#f43f5e" />
              {/* Center */}
              <circle cx="0" cy="0" r="3.5" fill="#facc15" />
            </g>
          )}

          {config.accessory === 'ninja' && (
            <g className="fluttering-ninja-band">
              <rect x="20" y="27" width="60" height="7" rx="3" fill="#dc2626" />
              {/* Silver plate */}
              <rect x="42" y="28" width="16" height="5" rx="1.5" fill="#e2e8f0" />
              {/* Flying ribbons */}
              <path d="M 78 30 Q 92 26 98 33" stroke="#dc2626" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M 78 33 Q 94 36 96 44" stroke="#b91c1c" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

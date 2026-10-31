import React from 'react';

export default function CrowdTrophyIllustration() {
  return (
    <div className="crowd-illustration-container">
      {/* Radiant Glow Behind Trophy */}
      <div className="trophy-ambient-glow" />

      {/* SVG Illustration: Silhouette Crowd + Glowing Golden Trophy */}
      <svg
        className="crowd-svg"
        viewBox="0 0 1000 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <radialGradient id="trophySunburst" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#ff7a00" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#ff4500" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ff3300" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="trophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff3b0" />
            <stop offset="35%" stopColor="#ffb703" />
            <stop offset="70%" stopColor="#ff6b00" />
            <stop offset="100%" stopColor="#d9480f" />
          </linearGradient>

          <linearGradient id="crowdGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#2c1409" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0f0603" stopOpacity="0.98" />
          </linearGradient>

          <linearGradient id="crowdFrontGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#1a0b05" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#080302" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Ambient Radial Aura */}
        <circle cx="500" cy="140" r="180" fill="url(#trophySunburst)" />

        {/* Golden Trophy Rays / Sparkles */}
        <g stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" opacity="0.6">
          <line x1="500" y1="50" x2="500" y2="35" />
          <line x1="440" y1="75" x2="425" y2="65" />
          <line x1="560" y1="75" x2="575" y2="65" />
          <line x1="410" y1="125" x2="395" y2="125" />
          <line x1="590" y1="125" x2="605" y2="125" />
        </g>

        {/* Floating Sparkle Stars */}
        <polygon points="460,75 463,83 471,86 463,89 460,97 457,89 449,86 457,83" fill="#fef08a" opacity="0.85" />
        <polygon points="540,78 542,84 548,86 542,88 540,94 538,88 532,86 538,84" fill="#fef08a" opacity="0.8" />
        <polygon points="498,40 500,44 504,45 500,46 498,50 496,46 492,45 496,44" fill="#ffffff" opacity="0.9" />

        {/* Gold Trophy */}
        <g transform="translate(470, 75) scale(0.65)">
          {/* Trophy Cup */}
          <path
            d="M 12 18 L 80 18 C 76 68 62 82 46 86 C 30 82 16 68 12 18 Z"
            fill="url(#trophyGold)"
            stroke="#fef08a"
            strokeWidth="3"
          />
          {/* Left Handle */}
          <path
            d="M 14 26 C -8 26 -8 56 18 60"
            fill="none"
            stroke="url(#trophyGold)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Right Handle */}
          <path
            d="M 78 26 C 100 26 100 56 74 60"
            fill="none"
            stroke="url(#trophyGold)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Stem & Base */}
          <rect x="42" y="86" width="8" height="18" fill="#ca8a04" />
          <path d="M 28 104 L 64 104 L 70 114 L 22 114 Z" fill="url(#trophyGold)" />
          {/* Star on Cup */}
          <polygon
            points="46,40 48,46 54,46 49,50 51,56 46,52 41,56 43,50 38,46 44,46"
            fill="#ffffff"
            opacity="0.95"
          />
        </g>

        {/* Background Silhouettes of Cheering Crowd */}
        <path
          d="
            M 0 320
            L 0 250
            C 25 240, 40 215, 60 230
            C 80 200, 110 205, 125 235
            C 145 190, 175 195, 190 240
            C 210 220, 235 225, 255 245
            C 280 195, 310 205, 335 235
            C 360 215, 385 220, 405 245
            C 430 180, 470 195, 485 240
            C 515 195, 545 185, 570 240
            C 595 210, 625 215, 645 245
            C 670 190, 710 200, 730 240
            C 755 220, 785 215, 805 245
            C 830 195, 860 190, 885 235
            C 910 220, 935 210, 960 240
            C 980 230, 995 245, 1000 255
            L 1000 320 Z
          "
          fill="url(#crowdGrad)"
        />

        {/* Foreground Silhouettes with Raised Hands & Phones */}
        <path
          d="
            M 0 320
            L 0 270
            C 20 255, 35 235, 50 250
            C 65 210, 85 215, 100 260
            C 115 245, 130 220, 145 255
            C 165 200, 185 205, 205 265
            C 225 240, 245 235, 265 270
            C 290 190, 315 195, 340 265
            C 365 240, 385 225, 410 270
            C 435 175, 465 180, 485 265
            C 515 180, 545 175, 575 270
            C 600 235, 625 220, 650 265
            C 675 195, 705 190, 730 270
            C 755 240, 775 230, 800 265
            C 825 205, 855 200, 880 270
            C 905 235, 930 225, 955 265
            C 975 245, 990 255, 1000 275
            L 1000 320 Z
          "
          fill="url(#crowdFrontGrad)"
        />

        {/* Cheering Hands & Raised Gestures in Crowd */}
        <g stroke="#090417" strokeWidth="6" strokeLinecap="round">
          {/* Left hands */}
          <line x1="165" y1="230" x2="160" y2="185" />
          <line x1="285" y1="235" x2="280" y2="180" />
          <line x1="435" y1="215" x2="430" y2="165" />
          <line x1="455" y1="220" x2="465" y2="170" />
          {/* Right hands */}
          <line x1="540" y1="220" x2="530" y2="170" />
          <line x1="565" y1="215" x2="575" y2="165" />
          <line x1="710" y1="235" x2="715" y2="180" />
          <line x1="835" y1="235" x2="840" y2="185" />
        </g>
      </svg>
    </div>
  );
}

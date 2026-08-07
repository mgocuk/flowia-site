const fs = require('fs');

const svg = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4A154B" />
      <stop offset="40%" stop-color="#8E24AA" />
      <stop offset="70%" stop-color="#E8789A" />
      <stop offset="100%" stop-color="#FDF8FA" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF6B9D" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#9B72CF" stop-opacity="0.6" />
    </linearGradient>
  </defs>
  
  <rect width="1024" height="500" fill="url(#bg)" />
  <circle cx="850" cy="100" r="280" fill="url(#glow)" opacity="0.4" />
  <circle cx="150" cy="400" r="220" fill="#E8789A" opacity="0.2" />

  <!-- App Title -->
  <text x="80" y="200" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" letter-spacing="-1">Flowia</text>
  <text x="80" y="255" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#FFD1DC" letter-spacing="1">AI-POWERED PERIOD &amp; FERTILITY TRACKER</text>

  <!-- Feature Pills -->
  <g transform="translate(80, 310)">
    <rect width="200" height="44" rx="22" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
    <text x="100" y="27" font-family="Arial" font-size="15" font-weight="700" fill="#FFFFFF" text-anchor="middle">🌸 Cycle Analytics</text>
  </g>

  <g transform="translate(300, 310)">
    <rect width="200" height="44" rx="22" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
    <text x="100" y="27" font-family="Arial" font-size="15" font-weight="700" fill="#FFFFFF" text-anchor="middle">✨ AI Insights</text>
  </g>

  <g transform="translate(520, 310)">
    <rect width="210" height="44" rx="22" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
    <text x="105" y="27" font-family="Arial" font-size="15" font-weight="700" fill="#FFFFFF" text-anchor="middle">🔒 100% Private &amp; Local</text>
  </g>

  <!-- Lily logo graphic on the right -->
  <circle cx="840" cy="250" r="130" fill="rgba(255,255,255,0.2)" />
  <circle cx="840" cy="250" r="110" fill="rgba(255,255,255,0.95)" />
  <text x="840" y="280" font-size="90" text-anchor="middle">🌸</text>
</svg>`;

fs.writeFileSync('feature-graphic.svg', svg);
console.log('feature-graphic.svg created successfully!');

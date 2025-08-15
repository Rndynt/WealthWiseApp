// Script untuk generate PWA icons menggunakan SVG
// Jalankan dengan: node generate-icons.js

const fs = require('fs');
const path = require('path');

// SVG icon FinanceFlow
const iconSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#059669"/>
  <circle cx="256" cy="256" r="180" fill="#ffffff" opacity="0.1"/>
  
  <!-- Dollar sign -->
  <path d="M256 120 L256 392 M200 160 L312 160 Q332 160 332 180 L332 200 Q332 220 312 220 L200 220 M200 292 L312 292 Q332 292 332 312 L332 332 Q332 352 312 352 L200 352" 
        stroke="#ffffff" 
        stroke-width="24" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
  
  <!-- Chart bars -->
  <rect x="140" y="320" width="20" height="60" fill="#ffffff" opacity="0.8"/>
  <rect x="170" y="300" width="20" height="80" fill="#ffffff" opacity="0.8"/>
  <rect x="200" y="280" width="20" height="100" fill="#ffffff" opacity="0.8"/>
  
  <rect x="292" y="280" width="20" height="100" fill="#ffffff" opacity="0.8"/>
  <rect x="322" y="300" width="20" height="80" fill="#ffffff" opacity="0.8"/>
  <rect x="352" y="320" width="20" height="60" fill="#ffffff" opacity="0.8"/>
</svg>
`.trim();

// Icon sizes yang dibutuhkan untuk PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate placeholder PNG untuk setiap ukuran
sizes.forEach(size => {
  const canvas = `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#059669"/>
  <circle cx="256" cy="256" r="180" fill="#ffffff" opacity="0.1"/>
  
  <path d="M256 120 L256 392 M200 160 L312 160 Q332 160 332 180 L332 200 Q332 220 312 220 L200 220 M200 292 L312 292 Q332 292 332 312 L332 332 Q332 352 312 352 L200 352" 
        stroke="#ffffff" 
        stroke-width="24" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
  
  <rect x="140" y="320" width="20" height="60" fill="#ffffff" opacity="0.8"/>
  <rect x="170" y="300" width="20" height="80" fill="#ffffff" opacity="0.8"/>
  <rect x="200" y="280" width="20" height="100" fill="#ffffff" opacity="0.8"/>
  
  <rect x="292" y="280" width="20" height="100" fill="#ffffff" opacity="0.8"/>
  <rect x="322" y="300" width="20" height="80" fill="#ffffff" opacity="0.8"/>
  <rect x="352" y="320" width="20" height="60" fill="#ffffff" opacity="0.8"/>
</svg>
  `;
  
  // Untuk demo, kita buat file SVG sementara
  fs.writeFileSync(`./icon-${size}x${size}.svg`, canvas);
});

// Generate shortcut icons
const shortcutIcons = {
  'shortcut-transaction': '#10B981',
  'shortcut-budget': '#3B82F6', 
  'shortcut-dashboard': '#8B5CF6'
};

Object.entries(shortcutIcons).forEach(([name, color]) => {
  const shortcutSVG = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="15" fill="${color}"/>
  <circle cx="48" cy="48" r="30" fill="#ffffff" opacity="0.2"/>
  <path d="M48 24 L48 72 M32 32 L64 32 Q68 32 68 36 L68 40 Q68 44 64 44 L32 44 M32 52 L64 52 Q68 52 68 56 L68 60 Q68 64 64 64 L32 64" 
        stroke="#ffffff" 
        stroke-width="3" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        fill="none"/>
</svg>
  `.trim();
  
  fs.writeFileSync(`./${name}.svg`, shortcutSVG);
});

console.log('Generated PWA icons as SVG files. To convert to PNG, use an online converter or imagemagick.');
console.log('Example: for i in *.svg; do convert "$i" "${i%.svg}.png"; done');
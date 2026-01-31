// Icon Generator for Solar Survey PWA
// Run with: node generate-icons.js
// Requires: npm install canvas (or use the HTML generator instead)

const fs = require('fs');
const path = require('path');

// Check if canvas is available
let Canvas;
try {
    Canvas = require('canvas');
} catch (e) {
    console.log('Canvas library not found. Please run: npm install canvas');
    console.log('Or use generate-icons.html in a browser instead.');
    process.exit(1);
}

const iconSizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-152x152.png', size: 152 },
    { name: 'apple-touch-icon-167x167.png', size: 167 }
];

function drawIcon(size) {
    const canvas = Canvas.createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background gradient (solar theme - blue to orange/yellow)
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(0.5, '#2c3e50');
    gradient.addColorStop(1, '#f39c12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw sun/solar panel icon
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.25;

    // Outer circle (sun)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Draw rays (solar panel lines)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.02;
    const rayLength = radius * 1.3;
    const numRays = 8;
    
    for (let i = 0; i < numRays; i++) {
        const angle = (Math.PI * 2 * i) / numRays;
        const startX = centerX + Math.cos(angle) * radius;
        const startY = centerY + Math.sin(angle) * radius;
        const endX = centerX + Math.cos(angle) * rayLength;
        const endY = centerY + Math.sin(angle) * rayLength;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Add "S" letter for Survey
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', centerX, centerY);

    return canvas;
}

// Generate all icons
console.log('Generating icons...');
iconSizes.forEach(({ name, size }) => {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(name, buffer);
    console.log(`✓ Created ${name} (${size}x${size})`);
});

console.log('\nAll icons generated successfully!');




const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Ensure the backend/public directory exists
const publicDir = path.join(__dirname, '..', 'backend', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy frontend dist to backend public
const distDir = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  console.log('📁 Copying frontend build to backend/public...');
  copyRecursiveSync(distDir, publicDir);
  console.log('✅ Frontend build copied successfully!');
} else {
  console.error('❌ Frontend dist directory not found. Make sure to build the frontend first.');
  process.exit(1);
}

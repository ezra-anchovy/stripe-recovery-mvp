#!/usr/bin/env node
/**
 * Build script - bundles HTML files into the worker
 */

const fs = require('fs');
const path = require('path');

const landingPage = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const dashboardPage = fs.readFileSync(path.join(__dirname, '../public/dashboard.html'), 'utf8');
const workerCode = fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8');

// Escape backticks and dollar signs in HTML
const escapedLanding = landingPage.replace(/`/g, '\\`').replace(/\$/g, '\\$');
const escapedDashboard = dashboardPage.replace(/`/g, '\\`').replace(/\$/g, '\\$');

// Replace placeholder comments with actual HTML
const finalCode = workerCode
  .replace('const LANDING_PAGE = \'<!-- Landing page HTML -->\';', `const LANDING_PAGE = \`${escapedLanding}\`;`)
  .replace('const DASHBOARD_PAGE = \'<!-- Dashboard HTML -->\';', `const DASHBOARD_PAGE = \`${escapedDashboard}\`;`);

// Write to dist
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

fs.writeFileSync(path.join(distDir, 'index.js'), finalCode);

console.log('✅ Build complete! Output: dist/index.js');

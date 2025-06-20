const fs = require('fs');

const possiblePaths = [
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chrome',
  '/usr/bin/chromium',
];

for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    console.log(`✅ وجدنا Chrome/Chromium في: ${path}`);
    process.exit(0); // خرج بنجاح
  }
}

console.error('❌ لم يتم العثور على أي متصفح Chromium في المسارات المعروفة.');
process.exit(1); // خرج بخطأ

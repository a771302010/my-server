const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// مسار الفحص والتأكيد للتاكد من عمل السيرفر
app.get('/', (req, res) => {
  res.send('أهلاً بك، السيرفر يعمل بنجاح تام وصحيح لبرنامج سند.');
});

// PWA Manifest السيادي
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "برنامج سند - المنصة السيادية الدولية",
    "short_name": "سند",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0b141a",
    "theme_color": "#003893"
  });
});

app.listen(PORT, () => {
  console.log('Sanad Server running on port ' + PORT);
});

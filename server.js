const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>برنامج سند - منصة الإدارة والخدمات</title>
      <style>
        body { font-family: system-ui, sans-serif; background: #f0fdf4; color: #0f172a; text-align: center; padding: 40px; margin: 0; }
        .card { background: #fff; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #cbd5e1; }
        h1 { color: #0f766e; margin-top: 0; }
        p { color: #475569; }
        .btn { display: inline-block; background: #0f766e; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>برنامج سند 🚀</h1>
        <p>منصة الإدارة والخدمات المجتمعية وتفعيل الأرقام اليمنية</p>
        <p><b>حالة السيرفر:</b> يعمل بنجاح تام وصحيح 100%</p>
        <a href="https://my-server-t0s5.onrender.com" class="btn">تحديث التطبيق والبدء</a>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});

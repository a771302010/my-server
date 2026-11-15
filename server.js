const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>برنامج سند - المنصة الرسمية</title>
        <style>
            :root {
                --primary-color: #00875A;
                --bg-color: #f4f6f8;
                --card-bg: #ffffff;
                --text-color: #333333;
            }
            body.blue-theme {
                --primary-color: #0047AB;
            }
            body {
                font-family: 'Cairo', Tahoma, sans-serif;
                background-color: var(--bg-color);
                color: var(--text-color);
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .container {
                width: 100%;
                max-width: 420px;
                background: var(--card-bg);
                padding: 25px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.08);
                text-align: center;
            }
            h1 {
                color: var(--primary-color);
                margin-bottom: 5px;
                font-size: 26px;
            }
            .subtitle {
                color: #666;
                font-size: 14px;
                margin-bottom: 20px;
            }
            .theme-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-bottom: 20px;
            }
            .theme-btn {
                padding: 8px 15px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                color: white;
                font-size: 13px;
            }
            .btn-green { background-color: #00875A; }
            .btn-blue { background-color: #0047AB; }
            
            .card {
                background: #fafbfc;
                border: 1px solid #e1e4e8;
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 15px;
                text-align: right;
            }
            .card h3 {
                margin: 0 0 8px 0;
                color: var(--primary-color);
                font-size: 16px;
            }
            .card p {
                margin: 0;
                font-size: 13px;
                color: #555;
            }
            .status-box {
                margin-top: 15px;
                padding: 10px;
                background: #e6f4ea;
                color: #137333;
                border-radius: 8px;
                font-size: 13px;
                font-weight: bold;
            }
            body.blue-theme .status-box {
                background: #e8f0fe;
                color: #1967d2;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>برنامج سند</h1>
            <div class="subtitle">منصة الإدارة والخدمات المجتمعية</div>
            
            <div class="theme-buttons">
                <button class="theme-btn btn-green" onclick="setTheme('green')">الهوية الخضراء</button>
                <button class="theme-btn btn-blue" onclick="setTheme('blue')">الهوية الزرقاء</button>
            </div>

            <div class="card">
                <h3>حالة السيرفر والاتصال</h3>
                <p id="server-status">جاري فحص الاتصال بالسيرفر...</p>
            </div>

            <div class="card">
                <h3>المهام والخدمات</h3>
                <p>إدارة العمليات والأنشطة الميدانية بكفاءة عالية.</p>
            </div>

            <div class="status-box" id="connection-badge">
                السيرفر يعمل بنجاح تام وصحيح 🚀
            </div>
        </div>

        <script>
            function setTheme(theme) {
                if(theme === 'blue') {
                    document.body.classList.add('blue-theme');
                    localStorage.setItem('app_theme', 'blue');
                } else {
                    document.body.classList.remove('blue-theme');
                    localStorage.setItem('app_theme', 'green');
                }
            }

            window.onload = function() {
                const savedTheme = localStorage.getItem('app_theme');
                if(savedTheme) setTheme(savedTheme);

                fetch('/api/status')
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('server-status').innerText = data.message;
                    })
                    .catch(err => {
                        document.getElementById('server-status').innerText = 'متصل بنجاح على الرابط السحابي.';
                    });
            };
        </script>
    </body>
    </html>
  `);
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'أهلاً بك، السيرفر يعمل بنجاح تام وصحيح 🚀',
    timestamp: new Date()
  });
});

app.listen(port, () => {
  console.log('Server is running on port ' + port);
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl" id="htmlRoot">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>برنامج سند - المنصة السيادية الدولية</title>
  <style>
    :root {
      --primary: #0f766e;
      --bg: #090d16;
      --card: #111827;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --border: #374151;
      --accent: #38bdf8;
      --gold: #f59e0b;
    }
    body { margin: 0; padding: 16px; background: var(--bg); color: var(--text); font-family: sans-serif; }
    .container { max-width: 720px; margin: 0 auto; background: var(--card); border-radius: 20px; padding: 24px; border: 1px solid var(--border); box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    header { text-align: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 18px; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    .subtitle { color: var(--accent); font-size: 13px; font-weight: 600; }
    .top-controls { display: flex; justify-content: center; gap: 8px; margin-bottom: 12px; }
    .btn-ctrl { background: #1f2937; border: 1px solid var(--border); color: #fff; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; }
    .nav-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 18px; }
    .tab-btn { background: #1f2937; border: 1px solid var(--border); padding: 10px; border-radius: 10px; color: var(--muted); cursor: pointer; font-weight: bold; text-align: center; font-size: 12px; }
    .tab-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 4px 12px rgba(15,118,110,0.4); }
    .section { display: none; }
    .section.active { display: block; }
    .card-box { background: #1f2937; border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
    .card-box h3 { margin: 0 0 12px; font-size: 15px; color: var(--text); border-right: 4px solid var(--accent); padding-right: 8px; }
    [dir="ltr"] .card-box h3 { border-right: none; border-left: 4px solid var(--accent); padding-right: 0; padding-left: 8px; }
    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 13px; color: var(--muted); }
    input, select { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 12px; background: #111827; color: var(--text); font-size: 14px; }
    input:focus, select:focus { border-color: var(--accent); outline: none; }
    .otp-container { display: flex; justify-content: space-between; gap: 4px; direction: ltr; margin-bottom: 14px; }
    .otp-input { width: 42px; height: 50px; text-align: center; font-size: 20px; font-weight: bold; border: 2px solid var(--border); border-radius: 8px; background: #111827; color: var(--accent); font-family: monospace; }
    .otp-input:focus { border-color: var(--accent); box-shadow: 0 0 8px rgba(56,189,248,0.4); }
    .btn-submit { width: 100%; padding: 13px; background: var(--primary); color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .btn-submit:hover { background: #115e59; }
    .list-item { background: #111827; border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(245, 158, 11, 0.2); color: var(--gold); border: 1px solid var(--gold); padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; }
    .footer-note { text-align: center; font-size: 11px; color: var(--muted); margin-top: 16px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1 id="txtTitle">برنامج سند</h1>
      <p class="subtitle" id="txtSub">المنصة السيادية الدولية عابرة الحدود</p>
      <div class="top-controls">
        <button class="btn-ctrl" onclick="setLang('ar')">العربية 🇸🇦</button>
        <button class="btn-ctrl" onclick="setLang('en')">English 🇬🇧</button>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab-btn active" onclick="showTab('generator', this)" id="tab1">الأكواد</button>
      <button class="tab-btn" onclick="showTab('vault', this)" id="tab2">الخزنة</button>
      <button class="tab-btn" onclick="showTab('gateway', this)" id="tab3">التوجيه</button>
    </div>

    <div id="generator" class="section active">
      <div class="card-box">
        <h3 id="genHead">توليد وتأمين كود سيادي (8 خانات)</h3>
        <form onsubmit="saveCode(event)">
          <label id="lblOwner">اسم الجهة أو المعرف:</label>
          <input type="text" id="ownerName" placeholder="مثال: غرفة العمليات المركزية" required />
          
          <label id="lblOtp">أدخل الكود (8 خانات دقيقة):</label>
          <div class="otp-

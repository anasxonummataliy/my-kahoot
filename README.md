# 🏆 QuizArena — Live Multiplayer Team Quiz Platform

> **Quiz. Compete. Win.** — Kahoot-ga o'xshash, lekin savollar va variantlar o'yinchilarning o'z qurilmasida ham to'liq ko'rinadigan, real vaqtdagi jamoaviy musobaqa platformasi.

---

## 🌟 Asosiy Imkoniyatlar

1. **Savollar va Variantlar O'yinchi Qurilmasida Ko'rinishi**:
   - Standart Kahoot-dan farqli ravishda, har bir ishtirokchining kompyuter, planshet yoki smartfonida savol matni hamda 4 ta rangli variant (matnlari bilan birga) to'liq ko'rinadi.
2. **Jamoviy Musobaqa (Team Competition Mode)**:
   - Ishtirokchilar jamoalarga bo'linadi (masalan: 🔴 *Red Dragons*, 🔵 *Blue Titans*, ⚡ *Golden Eagles*, 🟢 *Cyber Wolves*).
   - Jamoa ballari real vaqtda jamlanadi va jamoaviy reyting yuritiladi.
   - Yakkama-yakka (Individual) rejimga ham 1 tugma bilan o'tish imkoniyati.
3. **100% Dizayn Mosligi (Screenshot asosida)**:
   - Deep royal purple / midnight gradient va glassmorphism effekti.
   - Katta Game PIN kartochkasi (`Copy Link` funksiyasi bilan).
   - Pastki qismdagi quvnoq olomon silueti va oltin porlovchi kubok illyustratsiyasi.
   - Jonli hisoblagich, taymer halqasi va rang-barang javob kartalari (▲ Moviy, ◆ Qizil, ● To'q sariq, ■ Yashil).
4. **Real Vaqtda Sinxronizatsiya (Real-time WebSockets & REST)**:
   - Django Channels va Daphne orqali barcha qatnashchilar va boshlovchi o'rtasida millisekundlik tezlikda aloqa.
5. **Yuqori Darajadagi Responsivlik (Mobile, Tablet, Desktop)**:
   - Smartfonlar, planshetlar va noutbuklarda a'lo darajada moslashuvchan interfeys.
   - Boshlovchi panelida o'rnatilgan *Device Simulator* (Laptop, Tablet, Mobile) orqali bitta brauzerning o'zidayoq barcha qurilmalar ko'rinishini sinovdan o'tkazish imkoniyati.
6. **O'rnatilgan Web Audio Ovoz Effektlari va Konfetti**:
   - Taymer chiqillashi, so'nggi 5 soniyadagi shoshilinch ovoz, to'g'ri/noto'g'ri javob chimalari va podium g'alaba fanfari.

---

## 🛠 Texnologiyalar (Tech Stack)

- **Backend**:
  - Python 3.12 + **Django 6**
  - **Django Channels 4** + **Daphne** (Asinxron ASGI WebSockets)
  - **Django REST Framework** (RESTful API)
  - **Django CORS Headers**
  - SQLite (yoki PostgreSQL)
- **Frontend**:
  - **React 19** + **Vite**
  - **Vanilla CSS** (Yuqori darajadagi zamonaviy dizayn tizimi, HSL palitrasi, shisha effekti)
  - **Lucide React** (Zamonaviy ikonalar)
  - **Canvas Confetti** (Podium va g'alabalar uchun bayramona konfetti)
  - **Web Audio API** (Mustaqil, tashqi fayllarga bog'liq bo'lmagan audio sintezator)

---

## 🚀 Loyihani Ishga Tushirish

### 1. Backend (Django)
```bash
# Virtual muhitni faollashtirish
source venv/bin/activate

# Backend papkasiga o'tish
cd backend

# Migratsiyalarni amalga oshirish va dastlabki savollarni yuklash
python manage.py migrate
python manage.py seed_data

# ASGI serverni ishga tushirish (Port 8001)
python manage.py runserver 0.0.0.0:8001
```

### 2. Frontend (React + Vite)
```bash
# Frontend papkasiga o'tish
cd frontend

# Paketlarni o'rnatish (agar o'rnatilmagan bo'lsa)
npm install

# Dev serverni ishga tushirish (Port 5173)
npm run dev
```

Brauzerda oching: **`http://localhost:5173/`**

---

## 📱 O'yin Oqimi (Game Flow)

1. **Lobby (Kutish xonasi)**:
   - Boshlovchi xonaga kiradi, unga 6 xonali Game PIN beriladi (masalan: `482719` yoki avtomatik generatsiya qilingan PIN).
   - O'yinchilar `http://localhost:5173/?pin=482719` orqali qo'shiladi, ism, avatar va o'z jamoasini tanlaydi.
   - Boshlovchi xohlasa **"+ Test O'yinchilarni qo'shish"** tugmasi orqali zudlik bilan sinov o'yinchilarini kiritishi mumkin.
2. **Savol Bosqichi (Question View)**:
   - Boshlovchi **"Start Question ->"** tugmasini bosadi.
   - Barcha o'yinchilar ekranida savol matni va 4 ta variant paydo bo'ladi.
   - Aylana taymer (20s) teskari hisoblashni boshlaydi.
   - O'yinchi javob tanlagach, tanlov qulflanadi va ball uning tezligiga qarab hisoblanadi.
3. **Natijalar & Tahlil (Review View)**:
   - Vaqt tugagach yoki boshlovchi to'xtatgach, to'g'ri javob yashil bilan yonadi, variantlar bo'yicha qancha odam qaysi javobni tanlaganligi diagrammada aks etadi.
4. **Reyting & Leaderboard**:
   - Jamoalar va alohida o'yinchilar reytingi, ketma-ket to'g'ri javob berish (streak) olovlari ko'rinadi.
5. **Podium**:
   - Oxirgi savoldan so'ng 1-o'rin (Oltin), 2-o'rin (Kumush), 3-o'rin (Bronza) va G'olib Jamoa shohsupaga ko'tariladi, konfetti yog'iladi.

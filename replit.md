# AlphaCoin Miner

## Project Overview
A single-page web application for mining AlphaCoin (α) — a virtual currency. Users sign in with Google via Firebase Auth, mine coins daily (up to 50 times/day earning 0.1–1 α per mine), redeem gift coupons, and compete on a leaderboard.

## File Structure
- `index.html` — Main app (login, mine, leaderboard, profile tabs)
- `admin.html` — Secret admin dashboard (only aialskrani@gmail.com can access)
- `style.css` — Dark gold theme with animations
- `script.js` — App logic (mining, coupons, leaderboard)
- `admin.js` — Admin logic (user management, coupon creation, balance editing)
- `firebase-config.js` — Firebase SDK initialization (shared config)
- `server.js` — Simple Node.js static file server on port 5000
- `rules.json` — Firebase Realtime Database security rules
- `vercel.json` — Vercel deployment routing config

## Tech Stack
- Vanilla HTML/CSS/JS (ES6 modules)
- Firebase SDK v9 (modular) — Auth + Realtime Database
- Node.js static server

## Firebase Project
- Project: `aiph-acon`
- Database: `https://aiph-acon-default-rtdb.asia-southeast1.firebasedatabase.app`
- Admin email: `aialskrani@gmail.com`

## Database Structure
- `/users/{uid}` — email, name, photoURL, balance, totalMined, lastMineDate, dailyMineCount
- `/coupons/{code}` — rewardAmount, usedBy[], createdBy, isActive

## User Preferences
- Arabic RTL interface
- Dark theme (black background, gold accents)
- Orbitron font for headings, Rajdhani for body

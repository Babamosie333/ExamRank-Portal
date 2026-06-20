# 🎯 MCQ Test Platform — Admin Portal
## VIKRAM SINGH
<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Local%2FAtlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

> A full-featured MCQ test management system with a public student portal and a protected admin dashboard.

[🚀 Quick Start](#-quick-start) • [✨ Features](#-features) • [📁 Project Structure](#-project-structure) • [🔐 Admin Login](#-admin-login) • [🛣️ API Routes](#-api-routes) • [⚠️ Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Features

<details open>
<summary>Click to explore key features</summary>

- 🔐 JWT + cookie-based admin authentication.
- 📚 Manage subjects with full CRUD.
- 📝 Create and manage MCQ tests.
- ❓ Add, edit, and organize questions.
- 📊 Track student attempts and scores.
- 📈 View platform-wide statistics.
- 🌐 Public test interface for students.
- ⚡ Lightweight static frontend with Express backend.

</details>

---

## 🖼️ Project Preview

<details>
<summary>What the app includes</summary>

- Public home page for students.
- Test-taking flow with timer and auto-submit.
- Admin login page.
- Admin dashboard for subject/test/question management.
- Attempts and stats tracking.

</details>

---

## 📁 Project Structure

<details>
<summary>See folder layout</summary>

```bash
MCQ-TEST-PLATFORM/
├── admin/              # Admin frontend HTML pages
├── public/             # Public student interface
├── src/
│   ├── config/         # Database connection
│   ├── middleware/     # Auth middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # API route handlers
│   ├── scripts/        # Utility scripts
│   └── services/       # Business logic
├── .env
├── .gitignore
├── package.json
└── server.js
```

</details>

---

## 🚀 Quick Start

<details open>
<summary>Run locally in minutes</summary>

### 1) Clone the repo

```bash
git clone <your-repo-url>
cd mcq-test-platform
```

### 2) Install dependencies

```bash
npm install
```

### 3) Create `.env`

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/mcq_test_platform
JWT_SECRET=this-is-a-long-random-secret-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 4) Start MongoDB

```cmd
net start MongoDB
```

Or verify:

```cmd
mongosh mongodb://127.0.0.1:27017
```

### 5) Run the server

```bash
node server.js
```

For auto-reload:

```bash
npx nodemon server.js
```

</details>

---

## 🌐 Local URLs

| Page | URL |
|---|---|
| Home | `http://localhost:3000/` |
| Admin Login | `http://localhost:3000/admin/login.html` |

---

## 🔐 Admin Login

<details>
<summary>Default credentials</summary>

```txt
Username: admin
Password: admin123
```

> ⚠️ Change these before deploying.

</details>

---

## 🛣️ API Routes

<details>
<summary>View available routes</summary>

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Admin login |
| `POST` | `/api/admin/logout` | Admin logout |
| `GET` | `/api/admin/me` | Current admin info |
| `GET/POST` | `/api/subjects` | Subjects CRUD |
| `GET/POST` | `/api/tests` | Tests CRUD |
| `GET/POST` | `/api/questions` | Questions CRUD |
| `GET/POST` | `/api/attempts` | Attempts tracking |
| `GET` | `/api/stats` | Platform statistics |

</details>

---

## 🗃️ Tech Stack

<details>
<summary>What powers the app</summary>

- **Runtime:** Node.js
- **Framework:** Express.js
- **Auth:** JWT + Cookie Parser
- **Database:** MongoDB
- **Frontend:** Static HTML, CSS, and JavaScript
- **CORS:** Enabled with credentials

</details>

---

## ⚠️ Troubleshooting

<details>
<summary>Invalid credentials on another laptop</summary>

1. Make sure `.env` exists in the project root.
2. Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
3. Restart the server after editing `.env`.
4. Add debug logs in your login route.

```js
console.log("BODY:", req.body);
console.log("ENV USER:", process.env.ADMIN_USERNAME);
console.log("ENV PASS:", process.env.ADMIN_PASSWORD);
```

</details>

<details>
<summary>MongoDB not working on another laptop</summary>

**Option 1: Local MongoDB**

```cmd
winget install -e --id MongoDB.Server
winget install MongoDB.mongosh
net start MongoDB
```

**Option 2: MongoDB Atlas**

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/mcq_test_platform
```

</details>

<details>
<summary>Login still fails</summary>

Make sure your login route directly checks `.env` values if you are not using admin collections.

```js
if (
  username.trim() !== process.env.ADMIN_USERNAME ||
  password.trim() !== process.env.ADMIN_PASSWORD
) {
  return res.status(401).json({ error: "Invalid credentials" });
}
```

</details>

<details>
<summary>Request body JSON errors</summary>

When sending JSON from the frontend, use:

```js
body: JSON.stringify({
  username,
  password
})
```

Also set:

```js
headers: {
  'Content-Type': 'application/json'
}
```

</details>

---

## 📦 .env.example

<details>
<summary>Share this with collaborators</summary>

```env
PORT=3000
MONGODB_URI=
JWT_SECRET=use_any_long_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

</details>

---

## 🔒 Security Notes

- Never commit `.env`.
- Use a strong `JWT_SECRET`.
- Change default admin credentials before deployment.
- Use HTTPS in production.
- Set `secure: true` for auth cookies in production.

---

## 📄 License

MIT — Free to use and modify.

---

<div align="center">

Made with ❤️ by **VIKRAM SINGH**

</div>
```
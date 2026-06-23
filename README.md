# 🇩🇰 Danish Life Simulator

**Learn Danish through real-life scenarios.**

A full-stack web application that feels like a game rather than a traditional language course. Complete realistic Danish life scenarios, talk to AI-powered characters, receive corrections, track weaknesses, and improve through personalized practice.

> Built for learners between A1 and B2 level, especially immigrants living in Denmark.

---

## ✨ Features

- **AI Placement Assessment** — An AI guide evaluates your Danish level through conversation (no boring tests)
- **Real-Life Missions** — Call the doctor, talk to your landlord, ask in Netto, job interviews, and more
- **AI Danish Characters** — Speak with DeepSeek-powered NPCs who correct your mistakes gently
- **Personalized Learning** — Every mistake becomes future learning material. The system tracks your weaknesses and adapts
- **Mistake Tracking** — Review, filter, and master your mistakes
- **Level System** — A1 through B2 with the option to accept AI assessment or override
- **Dark Mode** — Built-in theme switching
- **Mobile-First** — Responsive design that works on all devices
- **Cookie-Based Auth** — Secure JWT authentication with httpOnly cookies

---

## 🏗️ Architecture

```
danish-life-simulator/
├── backend/         # Express + TypeScript API
│   ├── src/
│   │   ├── config/       # Environment, database
│   │   ├── middleware/    # Auth, error handling, validation
│   │   └── modules/      # Auth, missions, conversations, etc.
│   └── package.json
├── frontend/        # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/        # Login, Dashboard, Missions, etc.
│   │   ├── components/   # Layout, LoadingSpinner, ProtectedRoute
│   │   ├── context/      # AuthContext
│   │   └── api/          # API client
│   └── package.json
├── .github/workflows/
│   ├── deploy-backend.yml
│   └── deploy-frontend.yml
└── deploy.sh
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS 3, React Router 7 |
| Backend | Node.js, Express 4, TypeScript |
| Database | MongoDB Atlas via Mongoose |
| Auth | JWT with httpOnly cookies, bcrypt |
| AI | DeepSeek API (with provider abstraction) |
| Validation | Zod |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- DeepSeek API key (optional for dev — built-in mock provider)

### 1. Clone and Install

```bash
git clone <repo-url> danish-life-simulator
cd danish-life-simulator

# Backend
cd backend
cp .env.example .env
npm install

# Frontend (separate terminal)
cd ../frontend
npm install
```

### 2. Set Up MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Get your connection string (e.g., `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net`)
3. Add your IP to the network access whitelist

### 3. Set Up DeepSeek (Optional)

1. Get an API key from [DeepSeek](https://platform.deepseek.com/)
2. The app includes a mock provider for development — works without an API key

### 4. Configure Environment

Edit `backend/.env`:

```env
# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net
DB_NAME=danish-life-simulator

# JWT
JWT_SECRET=your-secret-key-change-in-production

# DeepSeek AI (optional for development)
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Server
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 5. Seed the Database

```bash
cd backend
npm run seed
```

This populates 150 missions across all CEFR levels (A1–C1).

### 6. Start Development

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001
- **Health:** http://localhost:3001/api/health

---

## 📋 Available Scripts

### Backend (`cd backend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API in dev mode with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run start` | Run compiled production build |
| `npm run seed` | Seed missions to database |
| `npm run lint` | Type-check |

### Frontend (`cd frontend`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and bundle for production |
| `npm run preview` | Preview production build |

---

## 🔌 API Endpoints

### Health

```
GET /api/health
```

### Auth

```
POST /api/auth/register    # { email, password, name }
POST /api/auth/login       # { email, password }
POST /api/auth/logout
GET  /api/auth/me          # Get current user
```

### Placement

```
POST /api/placement/start        # Start AI placement
POST /api/placement/message      # { message } — continue placement
POST /api/placement/override     # { selectedLevel: "A1"|"A2"|"B1"|"B2" }
```

### Missions

```
GET /api/missions           # List all missions
GET /api/missions/:slug     # Get mission by slug
```

### Conversations

```
POST /api/conversations/start       # { missionId }
POST /api/conversations/:id/message # { message }
GET  /api/conversations/me          # My conversations
GET  /api/conversations/:id         # Get conversation details
```

### Mistakes

```
GET    /api/mistakes/me          # ?type=&mastered=&page=&limit=
PATCH  /api/mistakes/:id/mastered  # Toggle mastered status
```

### Attempts

```
GET /api/attempts/me  # ?page=&limit=
```

### Dashboard

```
GET /api/dashboard
```

---

## 🧪 Testing

### Manual Testing Flow

1. **Register** at `/register` — create an account
2. **Placement** — answer AI questions (5-10) or override your level
3. **Dashboard** — view your stats, suggested missions
4. **Missions** — browse available scenarios
5. **Mission Detail** — read the scenario before starting
6. **Conversation** — chat with the AI character in Danish
7. **Corrections** — receive real-time feedback
8. **Mistakes** — review and track all your mistakes
9. **History** — review past conversations
10. **Profile** — manage your level and settings

### Backend Tests

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}' \
  -c cookies.txt

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Get missions
curl http://localhost:3001/api/missions -b cookies.txt

# Start conversation
curl -X POST http://localhost:3001/api/conversations/start \
  -H "Content-Type: application/json" \
  -d '{"missionId":"<mission-id>"}' \
  -b cookies.txt
```

---

## 🤖 AI Module

The app uses a **provider abstraction** so you can swap AI providers without changing business logic.

```
src/modules/ai/
├── providers/
│   ├── ai-provider.interface.ts   # Provider contract
│   └── deepseek.provider.ts       # DeepSeek implementation
└── ai.service.ts                  # Service layer with mock fallback
```

**Without a DeepSeek API key**, the app falls back to a mock provider that returns realistic Danish responses — great for development and UI testing.

The AI always returns structured JSON with:
- `npcReply` — Danish character response
- `corrections` — Array of mistake corrections
- `feedback` — Encouraging English feedback
- `score` — 0-100 quality score

---

## 🎨 Design Philosophy

- **Not a school platform** — no boring lessons, no flashcards
- **Mobile-first** — designed for phones from day one
- **Game-like** — missions, levels, streaks, achievements
- **Minimalist** — clean, modern, focused on content
- **Dark mode** — built-in support from the start

---

## 🔒 Security

- Helmet.js for security headers
- Rate limiting on all routes
- httpOnly, secure cookies for JWT
- bcrypt password hashing (12 rounds)
- Zod validation on all inputs
- No sensitive data in logs
- CORS configured for client URL only

---

## 🏗️ Future-Ready Architecture

The project is structured to easily add:

- **Speech-to-text** — voice input for conversations
- **Text-to-speech** — hear NPC responses
- **Pronunciation scoring** — evaluate spoken Danish
- **Leaderboards** — compete with other learners
- **Multiplayer** — practice conversations with peers
- **Payments & subscriptions** — SaaS monetization
- **Admin panel** — manage users, missions, analytics
- **Push notifications** — daily streak reminders
- **Native mobile app** — via API consumption

---

## 🐛 Common Issues

**MongoDB connection fails**
- Check your IP is whitelisted in MongoDB Atlas
- Verify connection string in `.env`
- Ensure `DB_NAME` is set correctly

**Blank page on frontend**
- Ensure the API is running on port 3001
- Check browser console for CORS errors
- Clear cookies and re-login

**Seed fails**
- Ensure MongoDB is running and accessible
- The seed script compiles on-the-fly with tsx — no build step needed

**AI responses are mock**
- Set `DEEPSEEK_API_KEY` to a valid key in `.env`
- Restart the API server

---

## 📄 License

MIT

---

Built with ❤️ for Danish learners everywhere. Held og lykke! 🎉

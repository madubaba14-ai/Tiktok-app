# TikVibe 🎬

A TikTok-like short video social media application built with Next.js 16.

![TikVibe](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)

## ✨ Features

### Core Features
- 🎥 **Video Feed** - Full-screen vertical scroll with auto-play (TikTok-style)
- 🔐 **Authentication** - Email/password sign-up and sign-in
- 📤 **Video Upload** - Drag & drop upload with preview, captions, and hashtags
- ❤️ **Engagement** - Likes (double-tap), comments with nested replies, shares
- 👤 **User Profiles** - Avatar, banner, stats, video grid, follow/unfollow
- 🔍 **Search** - Users, videos, hashtags with recent searches
- 📊 **Recommendation Algorithm** - Trending score based on engagement metrics

### Technical Features
- Dark theme with smooth Framer Motion animations
- Optimistic UI updates for better UX
- Cursor-based pagination for efficient loading
- Video preloading for smooth scrolling
- Mobile-first responsive design

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- SQLite (included)

### Installation

```bash
# Clone the repository
git clone https://github.com/madubaba14-ai/Tiktok-app.git
cd Tiktok-app

# Install dependencies
bun install

# Set up the database
bun run db:push
bun run db:seed

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Test Accounts

After seeding, you can log in with:

| Email | Password |
|-------|----------|
| jessica@example.com | password123 |
| mike@example.com | password123 |
| sarah@example.com | password123 |
| marco@example.com | password123 |
| jake@example.com | password123 |
| alex@example.com | password123 |

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # REST API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── videos/       # Video CRUD operations
│   │   ├── users/        # User profile endpoints
│   │   ├── comments/     # Comment operations
│   │   ├── notifications/# Notification endpoints
│   │   └── search/       # Search functionality
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── components/
│   ├── video/            # Video feed components
│   ├── auth/             # Authentication modal
│   ├── profile/          # User profile sheet
│   ├── upload/           # Video upload modal
│   ├── comments/         # Comments system
│   ├── search/           # Search modal
│   ├── layout/           # Header & navigation
│   └── ui/               # shadcn/ui components
├── stores/               # Zustand state stores
├── hooks/                # Custom React hooks
└── lib/                  # Utility functions
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Database | Prisma ORM + SQLite |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |

## 📱 Flutter Migration

This web app serves as a reference architecture for a Flutter mobile app:

| Web (Next.js) | Mobile (Flutter) |
|---------------|------------------|
| Zustand | Riverpod / Bloc |
| Prisma + SQLite | Firebase Firestore |
| Next.js API Routes | Firebase Cloud Functions |
| Local Storage | Firebase Auth |
| shadcn/ui | Material / Cupertino |

## 🔐 Environment Variables

Create a `.env` file:

```env
DATABASE_URL=file:./db/custom.db

# For production (Firebase)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# For ad network
NEXT_PUBLIC_AD_NETWORK_ID=your_ad_network_id
```

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Framer Motion](https://www.framer.com/motion/) - Smooth animations
- [Lucide Icons](https://lucide.dev/) - Beautiful icons

---

Made with ❤️ by [madubaba14-ai](https://github.com/madubaba14-ai)

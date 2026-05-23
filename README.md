# Mini Ticket Management

A small support ticket management app built with Next.js, MongoDB, NextAuth, React, and Tailwind CSS.

## Features

- Email/password registration and login with NextAuth credentials.
- JWT-based protected dashboard access.
- Create, edit, delete, search, and filter tickets.
- Ticket status and priority tracking.
- Activity timeline with exact date and time for saved changes.
- MongoDB persistence with Mongoose.

## Getting Started

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```bash
MONGODB_URI="your-mongodb-connection-string"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

For deployment, set the same variables in your hosting provider. If `NEXTAUTH_URL` is set in production, use your deployed URL, not `localhost`.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Deployment

The app is ready for Vercel deployment with the standard Next.js build.

Required environment variables:

- `MONGODB_URI`
- `NEXTAUTH_SECRET` or `AUTH_SECRET`
- `NEXTAUTH_URL` if you want to explicitly set the deployed app URL

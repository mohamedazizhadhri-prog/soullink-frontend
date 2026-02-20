---
description: How to run the SoulLink project (Frontend and Backend)
---

To run the SoulLink project correctly, you need to start both the backend and the frontend servers.

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v18+)
- PostgreSQL (or access to the Neon database configured in `.env`)
- Redis (optional, for caching)

### 2. Backend Setup (`soullink-backend`)
Open a terminal in the `soullink-backend` directory:
1.  **Install dependencies**:
    ```powershell
    npm install
    ```
2.  **Environment Variables**:
    Check your `.env` file. Ensure `DATABASE_URL` and `AI_API_KEY` (Groq) are correctly set.
3.  **Database Migration**:
    ```powershell
    npx prisma generate
    npx prisma migrate dev
    ```
4.  **Run in Development Mode**:
    ```powershell
    npm run dev
    ```
    The backend will start on `http://localhost:4000`.

### 3. Frontend Setup (`soullink-frontend`)
Open a **new** terminal in the `soullink-frontend` directory:
1.  **Install dependencies**:
    ```powershell
    npm install
    ```
2.  **Environment Variables**:
    Check `.env.local`. Ensure `NEXT_PUBLIC_API_URL` points to `http://localhost:4000/api`.
3.  **Run in Development Mode**:
    ```powershell
    npm run dev
    ```
    The frontend will start on `http://localhost:3000`.

### 4. Verification
- Visit `http://localhost:3000` in your browser.
- Check the console logs in both terminals to ensure they are connected.
- Test the chat with Nova to verify the backend AI integration is working.

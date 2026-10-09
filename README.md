# Celebro Kitchen

Celebro Kitchen is a skip-only mess management web application built for college messes and canteens. Members are expected by default for all subscribed meals and open the app only to skip a meal, mark a holiday, or purchase extra meals.

## Tech Stack (100% Free Tiers)
- **Framework**: Next.js App Router (TypeScript, Server Actions & Route Handlers)
- **Styling**: Pure Tailwind CSS with native CSS design variables (No web font downloads)
- **Database**: Supabase Postgres with RLS & Service Role access
- **Authentication**: Custom Member ID + PIN with httpOnly session cookies, Supabase Auth for staff/admin
- **Testing**: Vitest unit test suite

---

## Setup & Local Installation

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repo-url>
   cd CelebroKitchen
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and fill in your Supabase project credentials:
   ```bash
   cp .env.example .env
   ```

3. **Run Database Migrations & Seeds**:
   Apply all SQL files inside `supabase/migrations/` in sequential order using the Supabase SQL Editor or CLI, then run `supabase/seed.sql`.

4. **Run Unit Tests**:
   ```bash
   npm run test
   ```

5. **Start Local Development Server**:
   ```bash
   npm run dev
   ```

---

## Privacy Note
- **What is stored**: Member name, Member ID code, phone number, email address, PIN hash, subscription details, meal attendance history, credit ledger, and financial charges/payments.
- **What is NOT stored**: Photos, daily attendance scan records, credit card info, or location data.
- **Data Access & Deletion**: Member data is accessible only by authorized mess administrators. Data deletion requests can be fulfilled by an admin deactivating the member record.

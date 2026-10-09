# Mess Owner Go-Live Checklist & Guide (`TODO.md`)

Welcome to Celebro Kitchen! This document is written specifically for you (the mess owner). It provides a step-by-step checklist to set up your free system and launch it successfully without needing software development skills.

---

## Step 1: Create Your Free Cloud Accounts

Follow these steps to create your free hosting accounts:

### 1. Supabase (Database)
1. Go to [supabase.com](https://supabase.com) and click **Sign Up**.
2. Click **New Project** and name it `celebro-kitchen`.
3. Choose a strong database password and keep it safe.
4. Once created, click **Project Settings** (gear icon) on the left sidebar:
   - Go to **API**: Copy your `Project URL` and `service_role` secret key.
   - Go to **Database**: Copy your Postgres connection URI under Connection String.

### 2. Resend (Free Transactional Email)
1. Go to [resend.com](https://resend.com) and create a free account.
2. Click **API Keys** -> **Create API Key**.
3. Copy the generated key (`re_...`).

### 3. Netlify or Cloudflare Pages (Free Web Hosting)
1. Go to [netlify.com](https://netlify.com) or [pages.cloudflare.com](https://pages.cloudflare.com) and sign up with GitHub.
2. Link your Celebro Kitchen code repository.

---

## Step 2: Set Up Database Tables & Initial Settings

1. Log into your **Supabase Dashboard**.
2. Click **SQL Editor** on the left menu.
3. Open and copy the text from each file in `supabase/migrations/` in order (`001`, `002`, `003`, `004`, `005`, `006`), paste it into the editor, and click **Run**.
4. Finally, copy and run `supabase/seed.sql` to populate default settings and meals (Breakfast, Lunch, Dinner).

---

## Step 3: Configure Environment Variables

In your hosting platform dashboard (Netlify/Cloudflare) under **Environment Variables**, paste the following keys:

| Key | Value Source |
|---|---|
| `SUPABASE_URL` | Supabase -> Settings -> API -> URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase -> Settings -> API -> `service_role` key |
| `DATABASE_URL` | Supabase -> Settings -> Database -> Connection URI |
| `SESSION_SECRET` | Any random 32-character string |
| `CRON_SECRET` | Any random secret passphrase |
| `EMAIL_API_KEY` | Resend -> API Keys |
| `EMAIL_FROM` | Your verified email address |
| `APP_URL` | Your live website link (e.g., `https://celebro-kitchen.netlify.app`) |

---

## Step 4: Import Members & Issue Temporary PINs

1. Log into your app as Admin (`/admin`).
2. Go to **Members** -> **CSV Import**.
3. Prepare a simple CSV file formatted like this:
   ```csv
   full_name,email,phone,member_code
   Rahul Sharma,rahul@example.com,9876543210,CK-0001
   Priya Singh,priya@example.com,9876543211,CK-0002
   ```
4. Click **Upload CSV**.
5. Once imported, click **Download Temporary PIN List**.
6. Print out the temporary PIN slips and hand them to each student.

---

## Step 5: Schedule Automatic Nightly Jobs

To keep headcounts locked and old subscriptions closed automatically:
1. In your **GitHub Repository**, go to **Settings** -> **Secrets and variables** -> **Actions**.
2. Add `DATABASE_URL` and `BACKUP_PASSPHRASE`.
3. The automatic backup workflow in `.github/workflows/backup.yml` will run daily at 03:00 UTC and save an encrypted database snapshot.

---

## Step 6: Mess Staff & Cook Training Guide

Share these simple steps with your cook and mess counter staff:
1. Open `/kitchen` on a phone at meal time.
2. Select the current meal tab (Breakfast, Lunch, or Dinner).
3. Check the **Cook Figure (Net Coming)** at the top of the screen to know exactly how many plates to prepare.
4. Use the **Expected List** for students allowed to eat.
5. Use the **Skipped List** to reject skipped students (if a student turns up anyway, tap **Ate Anyway** to automatically deduct a credit or add a charge).
6. At the end of the meal, enter the total **Plates Served**.

---

## Step 7: Five-Student Pilot Test

Before launching to all students, pick 5 pilot members to test:
- [ ] Have all 5 log in using their Member ID and temporary PIN.
- [ ] Ensure they are forced to set a new 5-digit PIN.
- [ ] Have student 1 skip tomorrow's lunch from the grid dashboard.
- [ ] Have student 2 mark a 3-day holiday and verify total preview credits.
- [ ] Have student 3 undo a skip before the cutoff deadline.
- [ ] Check `/admin` dashboard to verify skip counts match real-time numbers.

---

## Step 8: Go-Live & Ongoing Routine

- **Daily**: Check `/admin` dashboard before cutoffs; share headcount with the cook via WhatsApp button.
- **Weekly**: Check GitHub Actions to ensure encrypted database backups ran cleanly.
- **Monthly**: Review member dues on `/admin/payments` and extend/renew ending subscriptions.

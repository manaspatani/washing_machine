# Mewad Jain Hostel — Washing Machine Booking System

A production-ready, mobile-first web application for managing washing machine slot bookings at Mewad Jain Hostel. Built with **Next.js 14 (App Router)** and **Supabase (PostgreSQL + Auth)**.

---

## Key Features

- **Automated Account Generation**: Single-click generation of all 144 student IDs (`201A–201D` through `1001A–1004D`).
- **Data Import**: CSV/Excel import for batch updating student names, phone numbers, and room numbers.
- **Strict Rule Enforcement (Database Layer)**:
  - 1 booking per student per day across any machine.
  - No consecutive slot bookings.
  - 3-day booking window (current day + next 2 days only).
  - Cancellation cutoff (up to 1 hour before slot start time).
  - Atomic transaction handling via PostgreSQL `create_booking` RPC function to prevent race conditions & double-bookings.
- **Maintenance System**: Mark Left, Right, or Both machines as unavailable. Automatically cancels affected future bookings and sends in-app notifications.
- **WhatsApp Integration**: Modular notification system ready to connect with any WhatsApp API provider.
- **Admin Suite**: Usage analytics, busiest slots, student management, manual booking override, data export (CSV), and issue report management.
- **Mobile-First UI**: Modern, clean responsive design with visual slot indicators and clear hostel rules display.

---

## Tech Stack & Architecture

- **Frontend**: Next.js 14, React, Vanilla CSS (Design Tokens, Glassmorphism, CSS Variables)
- **Backend / API**: Next.js App Router API endpoints + Supabase Server Client
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & Stored Procedures
- **Notification Stub**: Modular WhatsApp notification ready-connector (`lib/whatsapp.ts`)

---

## Getting Started (Local Development)

### 1. Prerequisites
- Node.js 18+ and npm installed.
- A free [Supabase Account](https://supabase.com).

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/manaspatani/washing_machine.git
cd washing_machine
npm install
```

### 3. Setup Supabase Project
1. Create a new project in your Supabase Dashboard.
2. In your Supabase SQL Editor, run the contents of [`supabase/schema.sql`](file:///c:/Users/Asus/OneDrive/Documents/GitHub/washing_machine/supabase/schema.sql).
3. Next, run [`supabase/seed.sql`](file:///c:/Users/Asus/OneDrive/Documents/GitHub/washing_machine/supabase/seed.sql) to populate initial time slots and machine records.

### 4. Admin Account Initialization
The Admin account is **automatically created** when you run `supabase/seed.sql` in step 3!
- **Default Admin ID**: `admin` (or `admin@hostel.local`)
- **Default Password**: `admin@123`

> **Security Warning**: For production deployments, log in as admin and change the password!

### 5. Set Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 6. Generate 144 Student Accounts
1. Start the dev server (`npm run dev`).
2. Log in as admin (ID: `admin`, Password: `admin`).
3. Navigate to **Students** -> Click **⚡ Generate 144 Accounts**.
4. All student accounts (`201A`–`1004D`) will be created automatically with initial password `Room<StudentID>@hostel`.

### 7. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment (Vercel + Supabase)

### Deploy to Vercel
1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Configure Environment Variables in Vercel settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**.

---

## WhatsApp Provider Integration

The app includes a pre-built notification hook in [`lib/whatsapp.ts`](file:///c:/Users/Asus/OneDrive/Documents/GitHub/washing_machine/lib/whatsapp.ts).

To connect a provider (e.g. Twilio, Wati, 2Factor):
1. Add provider environment variables in `.env.local`:
   ```env
   WHATSAPP_API_URL=https://api.yourprovider.com/v1/send
   WHATSAPP_API_KEY=your_api_key
   WHATSAPP_SENDER_NUMBER=+91XXXXXXXXXX
   ```
2. Adjust `sendWhatsAppMessage()` inside [`lib/whatsapp.ts`](file:///c:/Users/Asus/OneDrive/Documents/GitHub/washing_machine/lib/whatsapp.ts) to match your provider's JSON structure.

---

## License

Created for **Mewad Jain Hostel**. All rights reserved.

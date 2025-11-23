This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Registration page for the TWYIF public presentation

I've added a registration page at `/register` that collects full name (title inclusive), email and phone. The image above the form expects a file at `public/diafrica.jpeg` — please copy your provided image to that path so it appears above the form.

When the form is submitted the server-side API at `/api/register` will:

- validate the input;
- generate a calendar invite (.ics) for the event on 2025-12-09 at 12:00 WAT; and
- attempt to send an RSVP email with the .ics attached if SMTP env vars are configured.

Environment variables (optional, only required if you want the server to send emails):

- `SMTP_HOST` - your SMTP server host
- `SMTP_PORT` - SMTP port (465 for secure SSL, 587 or 25 for STARTTLS)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `FROM_EMAIL` - optional from address (defaults to `SMTP_USER`)

Alternatively you can use SendGrid (recommended free tier) to send emails. If using SendGrid set:

- `SENDGRID_API_KEY` - your SendGrid API key
- `FROM_EMAIL` - the sender address (e.g., "WAG <no-reply@yourdomain.com>")

To persist registrations to MongoDB, set:

- `MONGODB_URI` - your MongoDB connection string (e.g., from MongoDB Atlas)
- `MONGODB_DB` - optional database name; if omitted the one in the URI will be used or the driver default

If SMTP is not configured, the API returns the generated .ics as base64 and the client offers a downloadable `.ics` file so the user can add the event to their calendar.

Quick setup:

1. Add your image file to `public/diafrica.jpeg`.
2. Install the new dependency:

```bash
npm install
```

3. (Optional) Set the SMTP environment variables in your environment or in your hosting platform.
4. Start the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000/register` to test the form.

## Admin Dashboard

An admin dashboard is available at `/admin` to view and manage registrations.

Features:
- View all registrations in a table
- Download registrations as CSV
- Resend email invites to individual registrants
- Secure access with `ADMIN_SECRET` environment variable

To access the admin page:

1. Set the `ADMIN_SECRET` environment variable (defaults to "change-me-in-production"):

```bash
export ADMIN_SECRET=your-secure-secret-here
```

2. Visit `http://localhost:3000/admin` and login with your admin secret.

The admin page will:
- Load registrations from MongoDB (if configured) or from `data/registrations.json`
- Allow you to resend emails using the configured email provider (SendGrid or SMTP)
- Let you export all registrations as CSV for further processing

## Complete Environment Variables Reference

For production deployment, configure these environment variables:

**Email Provider (choose one):**
```bash
# Option 1: Resend (recommended - easiest setup)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=onboarding@resend.dev  # Use this for testing

# Option 2: SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
FROM_EMAIL="WAG <no-reply@yourdomain.com>"
```

**Database (optional):**
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
MONGODB_DB=twyif  # optional
```

**Admin Access:**
```bash
ADMIN_SECRET=your-secure-admin-secret
```

## Project Structure

- `/register` - Public registration form
- `/admin` - Admin dashboard (protected)
- `/api/register` - Registration API endpoint
- `/api/admin/registrations` - List all registrations (protected)
- `/api/admin/resend` - Resend email invites (protected)
- `data/` - File-based storage (fallback when MongoDB not configured)
  - `data/registrations.json` - Registration records
  - `data/ics/` - Generated calendar invite files
  - `data/emails/` - Email drafts (when email provider fails)

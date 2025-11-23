# Quick Setup: Get Resend API Key

1. Go to https://resend.com
2. Click "Get Started" (it's free - 3,000 emails/month, 100/day)
3. Sign up with your email/GitHub
4. Once logged in, click "API Keys" in the sidebar
5. Click "Create API Key"
6. Name it (e.g., "TWYIF Event")
7. Copy the API key (starts with `re_`)
8. Paste it in your `.env` file:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=onboarding@resend.dev
```

9. Restart the dev server:
```bash
npm run dev
```

## Testing (No Verification Needed!)

Resend's `onboarding@resend.dev` works immediately - no domain verification required for testing!

Emails will be delivered to any address you use in the registration form.

## For Production

When ready for production, add your own domain:
1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Add your domain (e.g., `diafrica.com`)
4. Add the DNS records they provide
5. Update `FROM_EMAIL` in `.env`:
```bash
FROM_EMAIL=no-reply@yourdomain.com
```

That's it! Much simpler than SendGrid.

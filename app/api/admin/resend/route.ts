import { NextResponse } from 'next/server';
import { generateICS } from '../../../../lib/ics';

// Simple auth check
function checkAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';
  
  if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json({ error: 'Missing email or name' }, { status: 400 });
    }

    // Event details
    const start = new Date('2025-12-09T12:00:00+01:00'); // 12:00 WAT
    const end = new Date('2025-12-09T12:00:00+01:00'); // Same as start time
    const summary = 'Public Presentation: Women & Youth Impact Fund (TWYIF) - 12:00pm (WAT)';
    const description = `Public Presentation of the TWYIF. Hosted by WAG in partnership with DI Africa and NIIA. Time: 12:00pm (WAT)`;
    const location = 'Nigerian Institute of International Affairs (NIIA), Plot 13/15 Kofo Abayomi Street, Victoria Island, Lagos';

    const ics = generateICS({ start, end, summary, description, location });

    const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@diafrica.local';
    let emailSent = false;
    let sendError: string | null = null;

    // Try Resend first
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Resend } = require('resend');
        const resend = new Resend(RESEND_API_KEY);

        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: 'RSVP: Public Presentation of the Women & Youth Impact Fund (TWYIF)',
          text: `Thank you for signing up for the Public Presentation of the 10 Billion Naira Women and Youth Impact Fund (TWYIF).\n\nWe look forward to you gracing the occasion with your participation.\n\nYours truly,\nThe organising committee.`,
          attachments: [
            {
              content: Buffer.from(ics, 'utf8'),
              filename: 'twyif-invite.ics',
            },
          ],
        });
        emailSent = true;
      } catch (e: any) {
        sendError = e?.message || String(e);
      }
    } else {
      // Try SMTP if configured
      const SMTP_HOST = process.env.SMTP_HOST;
      const SMTP_PORT = process.env.SMTP_PORT;
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;

      if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const nodemailer = require('nodemailer');

          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          });

          const mailOptions = {
            from: FROM_EMAIL,
            to: email,
            subject: 'RSVP: Public Presentation of the Women & Youth Impact Fund (TWYIF)',
            text: `Thank you for signing up for the Public Presentation of the 10 Billion Naira Women and Youth Impact Fund (TWYIF).\n\nWe look forward to you gracing the occasion with your participation.\n\nYours truly,\nThe organising committee.`,
            attachments: [
              {
                filename: 'twyif-invite.ics',
                content: ics,
                contentType: 'text/calendar; charset=UTF-8; method=REQUEST',
              },
            ],
          };

          await transporter.sendMail(mailOptions);
          emailSent = true;
        } catch (err: any) {
          sendError = err?.message || String(err);
        }
      } else {
        sendError = 'No email provider configured';
      }
    }

    return NextResponse.json({ success: emailSent, emailSent, sendError });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

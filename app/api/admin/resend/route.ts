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

    const FROM_EMAIL = process.env.FROM_EMAIL || 'emmanx25@gmail.com';
    const FROM_NAME = process.env.FROM_NAME || 'TWYIF Event Team';
    let emailSent = false;
    let sendError: string | null = null;

    // Try Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Resend } = require('resend');
        const resend = new Resend(RESEND_API_KEY);

        await resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
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
        console.error('Resend email error:', sendError);
      }
    } else {
      sendError = 'Email provider not configured';
    }

    return NextResponse.json({ success: emailSent, emailSent, sendError });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

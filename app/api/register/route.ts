import { NextResponse } from 'next/server';
import { generateICS, encodeICSToBase64 } from '../../../lib/ics';
import { connectToDatabase } from '../../../lib/mongo';
import fs from 'fs/promises';
import path from 'path';

type RequestBody = {
  name: string;
  email: string;
  phone?: string;
};

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();

    const { name, email, phone } = body;
    if (!name || !email) {
      return NextResponse.json({ error: 'Missing name or email' }, { status: 400 });
    }

    // Event details
    const start = new Date('2025-12-09T12:00:00+01:00'); // 12:00 WAT
    const end = new Date('2025-12-09T12:00:00+01:00'); // Same as start time
    const summary = 'Public Presentation: Women & Youth Impact Fund (TWYIF) - 12:00pm (WAT)';
    const description = `Public Presentation of the TWYIF. Hosted by WAG in partnership with DI Africa and NIIA. Time: 12:00pm (WAT)`;
    const location = 'Nigerian Institute of International Affairs (NIIA), Plot 13/15 Kofo Abayomi Street, Victoria Island, Lagos';

    const ics = generateICS({ start, end, summary, description, location });

    // Attempt to send email if SMTP config exists
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@diafrica.local';

    let emailSent = false;
    let sendError: string | null = null;

    // Persist registration to disk (data/registrations.json)
    const dataDir = path.join(process.cwd(), 'data');
    const registrationsFile = path.join(dataDir, 'registrations.json');
    const emailsDir = path.join(dataDir, 'emails');
    const icsDir = path.join(dataDir, 'ics');

    await ensureDir(dataDir);
    await ensureDir(emailsDir);
    await ensureDir(icsDir);

    // Save ICS to file for record and download fallback
    const ts = Date.now();
    const icsFilename = `twyif-${ts}.ics`;
    const icsPath = path.join(icsDir, icsFilename);
    await fs.writeFile(icsPath, ics, 'utf8');

    // Try to persist to MongoDB if configured, otherwise keep file fallback
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB = process.env.MONGODB_DB;
    let dbRecord: any = null;
    let dbError: string | null = null;

    if (MONGODB_URI) {
      try {
        const { db } = await connectToDatabase(MONGODB_URI, MONGODB_DB);
        
        // Check for duplicate
        const existing = await db.collection('registrations').findOne({ email });
        if (existing) {
          return NextResponse.json({ 
            error: 'This email is already registered.',
            duplicate: true 
          }, { status: 409 });
        }

        const insert = await db.collection('registrations').insertOne({
          name,
          email,
          phone: phone || null,
          createdAt: new Date(),
          icsPath: `data/ics/${icsFilename}`,
        });
        dbRecord = { insertedId: insert.insertedId };
      } catch (e: any) {
        dbError = e?.message || String(e);
      }
    } else {
      // read existing registrations
      let registrations: any[] = [];
      try {
        const raw = await fs.readFile(registrationsFile, 'utf8');
        registrations = JSON.parse(raw || '[]');
      } catch (e) {
        registrations = [];
      }

      // Check for duplicate
      const existingReg = registrations.find((r) => r.email === email);
      if (existingReg) {
        return NextResponse.json({ 
          error: 'This email is already registered.',
          duplicate: true 
        }, { status: 409 });
      }

      const record = {
        id: `reg-${ts}`,
        name,
        email,
        phone: phone || null,
        createdAt: new Date().toISOString(),
        ics: `data/ics/${icsFilename}`,
      };

      registrations.push(record);
      await fs.writeFile(registrationsFile, JSON.stringify(registrations, null, 2), 'utf8');
      dbRecord = { file: registrationsFile, record };
    }

    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      try {
        // dynamic import to avoid requiring nodemailer on the client
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: Number(SMTP_PORT),
          secure: Number(SMTP_PORT) === 465, // true for 465
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
      // SMTP not configured: try Resend if configured
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        try {
          // dynamic require
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
          const errMsg = e?.message || String(e);
          // If Resend fails, write fallback email file
          const emailText = [
            `From: ${FROM_EMAIL}`,
            `To: ${email}`,
            `Subject: RSVP: Public Presentation of the Women & Youth Impact Fund (TWYIF)`,
            '',
            'Thank you for signing up for the Public Presentation of the 10 Billion Naira Women and Youth Impact Fund (TWYIF).',
            '',
            'We look forward to you gracing the occasion with your participation.',
            '',
            'Yours truly,',
            'The organising committee.',
            '',
            `ICS saved at: ${icsPath}`,
            '',
            `Resend error: ${errMsg}`,
          ].join('\n');

          const emailFilename = `email-${ts}.txt`;
          const emailPath = path.join(emailsDir, emailFilename);
          await fs.writeFile(emailPath, emailText, 'utf8');
          sendError = `Resend failed: ${errMsg}; email saved to ${emailPath}`;
        }
      } else {
        const emailText = [
          `From: ${FROM_EMAIL}`,
          `To: ${email}`,
          `Subject: RSVP: Public Presentation of the Women & Youth Impact Fund (TWYIF)`,
          '',
          'Thank you for signing up for the Public Presentation of the 10 Billion Naira Women and Youth Impact Fund (TWYIF).',
          '',
          'We look forward to you gracing the occasion with your participation.',
          '',
          'Yours truly,',
          'The organising committee.',
          '',
          `ICS saved at: ${icsPath}`,
        ].join('\n');

        const emailFilename = `email-${ts}.txt`;
        const emailPath = path.join(emailsDir, emailFilename);
        await fs.writeFile(emailPath, emailText, 'utf8');
        sendError = 'No email provider configured; email saved to data/emails for manual sending.';
      }
    }

    // Return ICS as base64 so client can offer download if SMTP not configured
    const icsBase64 = encodeICSToBase64(ics);

  return NextResponse.json({ success: true, emailSent, icsBase64, sendError, stored: dbRecord, dbError });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

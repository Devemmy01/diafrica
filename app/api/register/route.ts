import { NextResponse } from "next/server";
import { generateICS, encodeICSToBase64 } from "../../../lib/ics";
import { connectToDatabase } from "../../../lib/mongo";
import fs from "fs";
import path from "path";

type RequestBody = {
  name: string;
  email: string;
  phone?: string;
};

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();

    const { name, email, phone } = body;
    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing name or email" },
        { status: 400 }
      );
    }

    // Event details
    const start = new Date("2025-12-09T12:00:00+01:00"); // 12:00 WAT
    const end = new Date("2025-12-09T12:00:00+01:00"); // Same as start time
    const summary =
      "Public Presentation: Women & Youth Impact Fund (TWYIF) - 12:00pm (WAT)";
    const description = `Public Presentation of the TWYIF. Hosted by WAG in partnership with DI Africa and NIIA. Time: 12:00pm (WAT)`;
    const location =
      "Nigerian Institute of International Affairs (NIIA), Plot 13/15 Kofo Abayomi Street, Victoria Island, Lagos";

    const ics = generateICS({ start, end, summary, description, location });

    // Read the image file
    const imagePath = path.join(process.cwd(), "public", "diafrica3.jpeg");
    const imageBuffer = fs.readFileSync(imagePath);

    const FROM_EMAIL = process.env.FROM_EMAIL || "emmanx25@gmail.com";
    const FROM_NAME = process.env.FROM_NAME || "TWYIF Event Team";

    let emailSent = false;
    let sendError: string | null = null;

    // Try to persist to MongoDB (required for production on Vercel)
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB = process.env.MONGODB_DB;
    let dbRecord: any = null;
    let dbError: string | null = null;

    if (!MONGODB_URI) {
      return NextResponse.json(
        {
          error:
            "Database not configured. Please set MONGODB_URI environment variable.",
          success: false,
        },
        { status: 500 }
      );
    }

    try {
      const { db } = await connectToDatabase(MONGODB_URI, MONGODB_DB);

      // Check for duplicate
      const existing = await db.collection("registrations").findOne({ email });
      if (existing) {
        return NextResponse.json(
          {
            error: "This email is already registered.",
            duplicate: true,
          },
          { status: 409 }
        );
      }

      const insert = await db.collection("registrations").insertOne({
        name,
        email,
        phone: phone || null,
        createdAt: new Date(),
      });
      dbRecord = { insertedId: insert.insertedId };
    } catch (e: any) {
      dbError = e?.message || String(e);
      return NextResponse.json(
        {
          error: "Database error: " + dbError,
          success: false,
        },
        { status: 500 }
      );
    }

    // Try to send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Resend } = require("resend");
        const resend = new Resend(RESEND_API_KEY);

        await resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: email,
          subject:
            "RSVP: Public Presentation of the Women & Youth Impact Fund (TWYIF)",
          html: `
            <div style="font-family: Arial, sans-serif; margin: 0 auto;">
              
              <p>Thank you for signing up for the Public Presentation of the 10 Billion Naira Women and Youth Impact Fund (TWYIF).</p>
              <p>We look forward to you gracing the occasion with your participation.</p>
              <p>Yours truly,<br/>The organising committee.</p>
            </div>
          `,
          text: `Thank you for signing up for the Public Presentation of the 10 Billion Naira Women and Youth Impact Fund (TWYIF).\n\nWe look forward to you gracing the occasion with your participation.\n\nYours truly,\nThe organising committee.`,
          attachments: [
            {
              filename: "twyif-invite.ics",
              content: Buffer.from(ics, "utf8"),
            },
            {
              filename: "diafrica3.jpeg",
              content: imageBuffer,
              content_id: "diafrica-image",
            },
          ],
        });
        emailSent = true;
      } catch (e: any) {
        sendError = e?.message || String(e);
        console.error("Resend email error:", sendError);
      }
    } else {
      sendError =
        "Email provider not configured. Registration saved but no email sent.";
      console.warn(sendError);
    }

    // Return ICS as base64 so client can offer download if email failed
    const icsBase64 = encodeICSToBase64(ics);

    return NextResponse.json({
      success: true,
      emailSent,
      icsBase64,
      sendError,
      stored: dbRecord,
      dbError,
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

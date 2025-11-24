import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongo';

// Simple auth check
function checkAuth(request: Request) {
  const authHeader = request.headers.get('authorization');
  const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me-in-production';
  
  if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB = process.env.MONGODB_DB;

    if (!MONGODB_URI) {
      return NextResponse.json({ 
        error: 'Database not configured',
        source: 'none',
        count: 0,
        registrations: [] 
      }, { status: 500 });
    }

    try {
      const { db } = await connectToDatabase(MONGODB_URI, MONGODB_DB);
      const registrations = await db
        .collection('registrations')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ 
        source: 'mongodb',
        count: registrations.length,
        registrations 
      });
    } catch (mongoErr: any) {
      console.error('MongoDB connection error:', mongoErr);
      return NextResponse.json({ 
        error: 'Database connection failed: ' + mongoErr.message,
        source: 'mongodb-error',
        count: 0,
        registrations: [] 
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: String(err), message: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongo';
import fs from 'fs/promises';
import path from 'path';

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

    if (MONGODB_URI) {
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
        // Fallback to file storage if MongoDB fails
        const dataDir = path.join(process.cwd(), 'data');
        const registrationsFile = path.join(dataDir, 'registrations.json');
        
        try {
          const raw = await fs.readFile(registrationsFile, 'utf8');
          const registrations = JSON.parse(raw || '[]');
          
          return NextResponse.json({ 
            source: 'file-fallback',
            count: registrations.length,
            registrations,
            mongoError: mongoErr.message 
          });
        } catch (e) {
          return NextResponse.json({ 
            source: 'file-fallback',
            count: 0,
            registrations: [],
            mongoError: mongoErr.message 
          });
        }
      }
    } else {
      // Read from file
      const dataDir = path.join(process.cwd(), 'data');
      const registrationsFile = path.join(dataDir, 'registrations.json');
      
      try {
        const raw = await fs.readFile(registrationsFile, 'utf8');
        const registrations = JSON.parse(raw || '[]');
        
        return NextResponse.json({ 
          source: 'file',
          count: registrations.length,
          registrations 
        });
      } catch (e) {
        return NextResponse.json({ 
          source: 'file',
          count: 0,
          registrations: [] 
        });
      }
    }
  } catch (err: any) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: String(err), message: err.message }, { status: 500 });
  }
}

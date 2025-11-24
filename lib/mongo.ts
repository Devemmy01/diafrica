import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(uri: string, dbName?: string) {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000, // 30 second timeout
    connectTimeoutMS: 30000,
    retryWrites: true,
    retryReads: true,
  });
  
  await client.connect();
  const db = dbName ? client.db(dbName) : client.db();

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

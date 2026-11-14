import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/database.js';

const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
if (!process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.CREDENTIAL_ENCRYPTION_KEY.length < 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be set to a different random value of at least 32 characters');
await connectDatabase();
const server = app.listen(port, () => console.log(`DropPilot API listening on http://localhost:${port}`));
const shutdown = signal => { console.log(`${signal}: shutting down`); server.close(() => process.exit(0)); };
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

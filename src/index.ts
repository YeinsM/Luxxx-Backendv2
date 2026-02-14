import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();

// Middleware
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Luxxx Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        registerEscort: 'POST /api/auth/register/escort',
        registerMember: 'POST /api/auth/register/member',
        registerAgency: 'POST /api/auth/register/agency',
        registerClub: 'POST /api/auth/register/club',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
    },
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     🚀 Luxxx Backend API Server          ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  console.log(`🔐 JWT Expiration: ${config.jwt.expiresIn}`);
  console.log('');
  console.log('📍 Endpoints:');
  console.log(`   - Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   - Register Escort: POST http://localhost:${PORT}/api/auth/register/escort`);
  console.log(`   - Register Member: POST http://localhost:${PORT}/api/auth/register/member`);
  console.log(`   - Register Agency: POST http://localhost:${PORT}/api/auth/register/agency`);
  console.log(`   - Register Club: POST http://localhost:${PORT}/api/auth/register/club`);
  console.log(`   - Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - Current User: GET http://localhost:${PORT}/api/auth/me`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('');
});

export default app;

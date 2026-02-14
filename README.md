# Luxxx Backend API

Backend API for the Luxxx platform built with Node.js, TypeScript, and Express.

## Features

- 🔐 Authentication & Authorization (JWT)
- � Email Verification System (required for all new users)
- 👥 Multi-type user registration (Escort, Member, Agency, Club)
- 🗄️ Ready for Supabase integration
- 🔒 Secure password hashing with bcrypt
- ✅ Input validation
- 🚀 TypeScript for type safety
- 🧪 Local development mode
- 📨 Email service (SMTP) for verification and notifications

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update environment variables as needed:
   - **Database:** Set `DB_MODE` to `memory` or `supabase`
   - **Email:** Configure SMTP settings for email verification
   - **Frontend:** Set `FRONTEND_URL` for email links
3. For local development, you can use `DB_MODE=memory`
4. See `.env.example` for all available variables

## Running

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## API Endpoints

### Authentication

#### Register Escort
```
POST /api/auth/register/escort
Body: { name, email, password, phone, city, age }
```

#### Register Member
```
POST /api/auth/register/member
Body: { username, email, password, city }
```

#### Register Agency
```
POST /api/auth/register/agency
Body: { agencyName, email, password, phone, city, website }
```

#### Register Club
```
POST /api/auth/register/club
Body: { clubName, email, password, phone, address, city, website, openingHours }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
```

#### Get Current User
```
GET /api/auth/me
Headers: { Authorization: Bearer <token> }
```

#### Verify Email
```
GET /api/auth/verify-email?token=<verification_token>
```

#### Resend Verification Email
```
POST /api/auth/resend-verification
Body: { email }
```

> **Note:** Email verification is required before users can log in. After registration, users receive a verification email with a link that expires in 24 hours.

## Email Verification System

This API includes a complete email verification system:

- ✅ Users must verify email before first login
- ✅ Verification emails sent automatically on registration
- ✅ Tokens expire after 24 hours
- ✅ Welcome email sent after successful verification
- ✅ Resend verification option available

For detailed documentation, see [EMAIL_VERIFICATION.md](docs/EMAIL_VERIFICATION.md)

### Quick Setup

1. Configure email settings in `.env`:
```env
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@domain.com
FRONTEND_URL=http://localhost:3000
```

2. Apply database migration:
```bash
# For local PostgreSQL
psql -U postgres -d lusty_db -f database/migrations/001_add_email_verification.sql

# For Supabase: Run the migration in SQL Editor
```

3. See [NEXT_STEPS.md](docs/NEXT_STEPS.md) for frontend integration guide

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middleware/     # Express middleware
├── models/         # Data models & types
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── index.ts        # Entry point
```

## 📚 Documentation

Complete documentation is available in the [`docs/`](docs/) folder:

- **[Getting Started](docs/NEXT_STEPS.md)** - Setup and next steps
- **[Email Verification](docs/EMAIL_VERIFICATION.md)** - Email verification system guide
- **[Testing](docs/TESTING_RESULTS.md)** - Test results and examples
- **[API Tests](docs/API_TESTS.md)** - API endpoint examples
- **[Configuration](docs/)** - Service setup guides (Cloudinary, Supabase, PostgreSQL)

For a complete index, see [docs/README.md](docs/README.md)

## Supabase Integration

To enable Supabase:

1. Create a Supabase project
2. Add your credentials to `.env`:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_KEY
3. The app will automatically use Supabase when these are configured

## License

ISC

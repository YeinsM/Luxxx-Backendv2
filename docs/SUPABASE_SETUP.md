# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - Name: `luxxx-platform`
   - Database Password: (create a strong password)
   - Region: (choose closest to your users)

## 2. Get Your API Keys

1. In your Supabase project dashboard, go to Settings → API
2. Copy the following values:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - `anon` public key
   - `service_role` secret key (⚠️ keep this secret!)

## 3. Run the Database Schema

1. In your Supabase project, go to SQL Editor
2. Click "New Query"
3. Copy the entire contents of `database/schema.sql`
4. Paste it into the editor
5. Click "Run" to execute the script

This will create:
- The `users` table with all required fields
- Indexes for better performance
- Row Level Security policies
- Automatic timestamp updates

## 4. Configure Environment Variables

Update your `.env` file:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
```

## 5. Test the Connection

Restart your backend server:

```bash
npm run dev
```

You should see:
```
✅ Using Supabase database
```

## 6. Verify the Setup

Test user registration:

```bash
curl -X POST http://localhost:5000/api/auth/register/member \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "city": "Test City"
  }'
```

Check your Supabase dashboard → Table Editor → users to see the new user.

## 7. Optional: Enable Email Verification

1. Go to Authentication → Settings in Supabase
2. Configure your email provider
3. Enable email confirmations
4. Update the `email_verified` field handling in the backend

## Row Level Security (RLS)

The schema includes basic RLS policies:
- Users can only read their own data
- Users can update their own data
- Anyone can register (insert)

To customize RLS policies, go to Authentication → Policies in Supabase.

## Monitoring

Monitor your database:
- Database → Query Performance
- Database → Backups (configure automatic backups)
- Database → Extensions (enable as needed)

## Security Best Practices

1. ✅ Never commit your `service_role` key to version control
2. ✅ Use environment variables for all secrets
3. ✅ Enable RLS on all tables
4. ✅ Regularly rotate your API keys
5. ✅ Monitor API usage in Supabase dashboard
6. ✅ Set up database backups
7. ✅ Use prepared statements (already handled by our code)

## Switching Between Local and Supabase

**Local Development:**
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

**Supabase:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_KEY=your_key
```

The backend automatically detects which mode to use!

-- ============================================================
-- MIGRATION 002: Full application schema
-- Tables: advertisements, advertisement_services, advertisement_rates,
--         user_media, reviews, messages, notifications,
--         transactions, invoices, saved_searches
-- ============================================================

-- 1. ADVERTISEMENTS (main profile/listing table)
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic info
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200),
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'escort',
  
  -- Status
  is_online BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'draft',
  
  -- Location
  country VARCHAR(100),
  city VARCHAR(100),
  city_part VARCHAR(100),
  zip_code VARCHAR(20),
  
  -- Personal data
  gender VARCHAR(20),
  gender_identity VARCHAR(50),
  orientation VARCHAR(50),
  age INTEGER CHECK (age >= 18 AND age <= 99),
  ethnicity VARCHAR(50),
  nationality VARCHAR(100),
  languages TEXT[],
  
  -- Physical attributes
  height VARCHAR(20),
  weight VARCHAR(20),
  eyes VARCHAR(30),
  hair_color VARCHAR(30),
  hair_length VARCHAR(30),
  pubic_hair VARCHAR(30),
  bust_size VARCHAR(10),
  bust_type VARCHAR(20),
  penis_length VARCHAR(20),
  circumcised VARCHAR(10),
  
  -- Lifestyle
  smoker VARCHAR(20),
  tattoo VARCHAR(30),
  piercing VARCHAR(30),
  
  -- Work preferences
  travel VARCHAR(50),
  available_for VARCHAR(50),
  meeting_with VARCHAR(50),
  
  -- Working hours (JSONB for flexibility)
  working_hours JSONB DEFAULT '{}',
  
  -- Contact
  phone VARCHAR(50),
  phone_verified BOOLEAN DEFAULT false,
  website_url VARCHAR(255),
  
  -- Promo
  promoted_at TIMESTAMPTZ,
  promo_sticker VARCHAR(100),
  budget DECIMAL(10,2),
  
  -- Verification (step 2)
  id_type VARCHAR(30),
  id_number VARCHAR(100),
  verification_status VARCHAR(20) DEFAULT 'pending',
  
  -- Promotion campaign (step 3)
  promotion_type VARCHAR(30),
  target_audience VARCHAR(50),
  campaign_duration VARCHAR(30),
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADVERTISEMENT SERVICES
CREATE TABLE IF NOT EXISTS advertisement_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ADVERTISEMENT RATES
CREATE TABLE IF NOT EXISTS advertisement_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  time_label VARCHAR(50) NOT NULL,
  incall_price VARCHAR(50),
  outcall_price VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. USER MEDIA
CREATE TABLE IF NOT EXISTS user_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(10) NOT NULL DEFAULT 'image',
  width INTEGER,
  height INTEGER,
  format VARCHAR(20),
  duration DECIMAL(10,2),
  thumbnail_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_name VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  description VARCHAR(255),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SAVED SEARCHES
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  query_string TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_advertisements_user_id ON advertisements(user_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_category ON advertisements(category);
CREATE INDEX IF NOT EXISTS idx_advertisements_city ON advertisements(city);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_is_online ON advertisements(is_online);
CREATE INDEX IF NOT EXISTS idx_advertisements_is_premium ON advertisements(is_premium);
CREATE INDEX IF NOT EXISTS idx_advertisements_rating ON advertisements(rating);

CREATE INDEX IF NOT EXISTS idx_ad_services_ad_id ON advertisement_services(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_ad_rates_ad_id ON advertisement_rates(advertisement_id);

CREATE INDEX IF NOT EXISTS idx_user_media_user_id ON user_media(user_id);
CREATE INDEX IF NOT EXISTS idx_user_media_resource_type ON user_media(resource_type);

CREATE INDEX IF NOT EXISTS idx_reviews_ad_id ON reviews(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_reviews_author_id ON reviews(author_id);

CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_advertisements_updated_at') THEN
    CREATE TRIGGER update_advertisements_updated_at BEFORE UPDATE ON advertisements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reviews_updated_at') THEN
    CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Initial database setup for Consider Restoration
-- Production-ready migration script

-- Create database (run separately as superuser)
-- CREATE DATABASE consider_restoration_prod;

-- Connect to the database
\c consider_restoration_prod;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE IF NOT EXISTS "Users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) DEFAULT 'user' CHECK ("role" IN ('user', 'admin')),
    "isActive" BOOLEAN DEFAULT true,
    "emailVerified" BOOLEAN DEFAULT false,
    "emailVerificationToken" VARCHAR(100),
    "passwordResetToken" VARCHAR(100),
    "passwordResetExpires" TIMESTAMP,
    "stripeCustomerId" VARCHAR(100),
    "membershipType" VARCHAR(50) DEFAULT 'none' CHECK ("membershipType" IN ('none', 'wellness', 'restoration-plus', 'therapeutic-elite')),
    "membershipStatus" VARCHAR(20) DEFAULT 'none' CHECK ("membershipStatus" IN ('none', 'active', 'paused', 'cancelled')),
    "membershipStartDate" DATE,
    "membershipSessionsRemaining" INTEGER DEFAULT 0,
    "preferences" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "medicalConditions" TEXT,
    "communicationPreferences" JSONB DEFAULT '{"email": true, "sms": false, "phone": false}',
    "totalVisits" INTEGER DEFAULT 0,
    "lastVisit" DATE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Services table
CREATE TABLE IF NOT EXISTS "Services" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "priceRange" VARCHAR(50),
    "duration" INTEGER DEFAULT 60,
    "category" VARCHAR(50),
    "benefits" TEXT[],
    "techniques" TEXT[],
    "targetAudience" TEXT[],
    "contraindications" TEXT[],
    "specialRequests" TEXT,
    "membershipDiscount" JSONB,
    "bookingEnabled" BOOLEAN DEFAULT true,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Appointments table
CREATE TABLE IF NOT EXISTS "Appointments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "serviceId" UUID NOT NULL REFERENCES "Services"("id") ON DELETE RESTRICT,
    "appointmentDate" DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    "duration" INTEGER DEFAULT 60,
    "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')),
    "price" DECIMAL(10,2) NOT NULL,
    "originalPrice" DECIMAL(10,2),
    "clientName" VARCHAR(100) NOT NULL,
    "clientEmail" VARCHAR(255) NOT NULL,
    "clientPhone" VARCHAR(20) NOT NULL,
    "notes" TEXT,
    "specialRequests" TEXT,
    "membershipSessionUsed" BOOLEAN DEFAULT false,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP,
    "refundEligible" BOOLEAN DEFAULT false,
    "refundPercentage" INTEGER DEFAULT 0,
    "rescheduledAt" TIMESTAMP,
    "source" VARCHAR(50) DEFAULT 'website',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Payments table
CREATE TABLE IF NOT EXISTS "Payments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "appointmentId" UUID REFERENCES "Appointments"("id") ON DELETE SET NULL,
    "userId" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "originalAmount" DECIMAL(10,2),
    "discountAmount" DECIMAL(10,2) DEFAULT 0,
    "currency" VARCHAR(3) DEFAULT 'usd',
    "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'completed', 'failed', 'refunded', 'partially_refunded')),
    "paymentMethod" VARCHAR(50),
    "stripePaymentIntentId" VARCHAR(100),
    "failureReason" TEXT,
    "refundAmount" DECIMAL(10,2) DEFAULT 0,
    "refundDate" TIMESTAMP,
    "refundReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create GiftCertificates table
CREATE TABLE IF NOT EXISTS "GiftCertificates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "code" VARCHAR(20) UNIQUE NOT NULL,
    "purchasedBy" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "recipientName" VARCHAR(100) NOT NULL,
    "recipientEmail" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "message" TEXT,
    "occasion" VARCHAR(50),
    "deliveryDate" DATE,
    "isDelivered" BOOLEAN DEFAULT false,
    "deliveredAt" TIMESTAMP,
    "usageHistory" JSONB DEFAULT '[]',
    "expiryDate" DATE,
    "isActive" BOOLEAN DEFAULT true,
    "paymentIntentId" VARCHAR(100),
    "purchasePrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Waitlist table
CREATE TABLE IF NOT EXISTS "Waitlist" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "serviceId" UUID NOT NULL REFERENCES "Services"("id") ON DELETE CASCADE,
    "preferredDate" DATE NOT NULL,
    "preferredTimeStart" TIME,
    "preferredTimeEnd" TIME,
    "flexibleDates" JSONB DEFAULT '[]',
    "flexibleTimes" BOOLEAN DEFAULT true,
    "priority" VARCHAR(20) DEFAULT 'standard' CHECK ("priority" IN ('standard', 'high', 'urgent')),
    "status" VARCHAR(20) DEFAULT 'active' CHECK ("status" IN ('active', 'notified', 'booked', 'expired', 'cancelled')),
    "clientName" VARCHAR(100) NOT NULL,
    "clientEmail" VARCHAR(255) NOT NULL,
    "clientPhone" VARCHAR(20) NOT NULL,
    "notes" TEXT,
    "notificationPreferences" JSONB DEFAULT '{"email": true, "sms": false, "phone": false}',
    "maxWaitDays" INTEGER DEFAULT 30,
    "expiresAt" TIMESTAMP NOT NULL,
    "notifiedAt" TIMESTAMP,
    "notificationsSent" INTEGER DEFAULT 0,
    "lastNotificationAt" TIMESTAMP,
    "availableSlotOffered" JSONB,
    "offerExpiresAt" TIMESTAMP,
    "responseDeadline" TIMESTAMP,
    "automaticBooking" BOOLEAN DEFAULT false,
    "membershipType" VARCHAR(50) DEFAULT 'none' CHECK ("membershipType" IN ('none', 'wellness', 'restoration-plus', 'therapeutic-elite')),
    "isRecurring" BOOLEAN DEFAULT false,
    "recurringPattern" JSONB,
    "tags" JSONB DEFAULT '[]',
    "source" VARCHAR(50) DEFAULT 'website',
    "referralSource" VARCHAR(100),
    "specialRequests" TEXT,
    "medicalReasons" BOOLEAN DEFAULT false,
    "urgencyLevel" INTEGER DEFAULT 1 CHECK ("urgencyLevel" BETWEEN 1 AND 10),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create BlockedDates table
CREATE TABLE IF NOT EXISTS "BlockedDates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "blockDate" DATE NOT NULL,
    "startTime" TIME,
    "endTime" TIME,
    "reason" TEXT,
    "type" VARCHAR(50) DEFAULT 'vacation' CHECK ("type" IN ('vacation', 'holiday', 'maintenance', 'personal', 'conference')),
    "isAllDay" BOOLEAN DEFAULT true,
    "isRecurring" BOOLEAN DEFAULT false,
    "recurringPattern" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create EmailTemplates table
CREATE TABLE IF NOT EXISTS "EmailTemplates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) UNIQUE NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "template" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Analytics table
CREATE TABLE IF NOT EXISTS "Analytics" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "event" VARCHAR(100) NOT NULL,
    "userId" UUID REFERENCES "Users"("id") ON DELETE SET NULL,
    "sessionId" VARCHAR(100),
    "data" JSONB,
    "ipAddress" INET,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "Users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_membership" ON "Users"("membershipType", "membershipStatus");
CREATE INDEX IF NOT EXISTS "idx_appointments_date" ON "Appointments"("appointmentDate");
CREATE INDEX IF NOT EXISTS "idx_appointments_user" ON "Appointments"("userId");
CREATE INDEX IF NOT EXISTS "idx_appointments_service" ON "Appointments"("serviceId");
CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "Appointments"("status");
CREATE INDEX IF NOT EXISTS "idx_payments_user" ON "Payments"("userId");
CREATE INDEX IF NOT EXISTS "idx_payments_appointment" ON "Payments"("appointmentId");
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "Payments"("status");
CREATE INDEX IF NOT EXISTS "idx_giftcerts_code" ON "GiftCertificates"("code");
CREATE INDEX IF NOT EXISTS "idx_giftcerts_recipient" ON "GiftCertificates"("recipientEmail");
CREATE INDEX IF NOT EXISTS "idx_waitlist_service_date" ON "Waitlist"("serviceId", "preferredDate");
CREATE INDEX IF NOT EXISTS "idx_waitlist_status" ON "Waitlist"("status");
CREATE INDEX IF NOT EXISTS "idx_waitlist_priority" ON "Waitlist"("priority");
CREATE INDEX IF NOT EXISTS "idx_analytics_event" ON "Analytics"("event");
CREATE INDEX IF NOT EXISTS "idx_analytics_user" ON "Analytics"("userId");
CREATE INDEX IF NOT EXISTS "idx_analytics_date" ON "Analytics"("createdAt");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "Users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON "Services" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON "Appointments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON "Payments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_giftcerts_updated_at BEFORE UPDATE ON "GiftCertificates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON "Waitlist" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blocked_dates_updated_at BEFORE UPDATE ON "BlockedDates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON "EmailTemplates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data
INSERT INTO "Services" ("id", "name", "slug", "description", "shortDescription", "basePrice", "priceRange", "duration", "category", "benefits", "techniques", "targetAudience", "membershipDiscount") VALUES
(uuid_generate_v4(), 'Mindful Start', 'mindful-start', 'Personalized bodywork session combining massage techniques tailored to your specific needs. Perfect for first-time clients or those seeking a customized approach to wellness.', 'Customized approach combining massage techniques tailored to your specific needs', 70.00, 'Starting at $70', 60, 'massage', ARRAY['Personalized treatment approach', 'Stress relief and relaxation', 'Improved circulation', 'Muscle tension relief'], ARRAY['Swedish massage', 'Light pressure techniques', 'Relaxation methods'], ARRAY['First-time clients', 'Stress relief seekers', 'General wellness'], '{"wellness": 15, "restoration-plus": 20, "therapeutic-elite": 25}'),
(uuid_generate_v4(), 'Integrated Massage', 'integrated-massage', 'Comprehensive bodywork addressing multiple concerns with various modalities. This session combines different massage techniques to provide maximum therapeutic benefit.', 'Comprehensive bodywork addressing multiple concerns with various modalities', 100.00, '$100+', 75, 'massage', ARRAY['Multiple technique integration', 'Deep muscle tension relief', 'Enhanced flexibility', 'Comprehensive wellness approach'], ARRAY['Swedish massage', 'Deep tissue', 'Trigger point therapy', 'Myofascial release'], ARRAY['Regular clients', 'Multiple concern areas', 'Comprehensive wellness'], '{"wellness": 15, "restoration-plus": 20, "therapeutic-elite": 25}'),
(uuid_generate_v4(), 'Thai-Stretch Fusion', 'thai-stretch-fusion', 'Dynamic stretching combined with massage for improved mobility and flexibility. This unique approach combines traditional Thai massage techniques with targeted stretching.', 'Dynamic stretching combined with massage for improved mobility and flexibility', 120.00, '$120+', 90, 'bodywork', ARRAY['Improved flexibility and range of motion', 'Enhanced athletic performance', 'Stress relief through movement', 'Better posture and alignment'], ARRAY['Thai massage', 'Assisted stretching', 'Joint mobilization', 'Energy line work'], ARRAY['Athletes', 'Flexibility improvement', 'Movement enthusiasts'], '{"wellness": 15, "restoration-plus": 20, "therapeutic-elite": 25}'),
(uuid_generate_v4(), 'Applied Neurology Consultation', 'applied-neurology', 'Specialized assessment and treatment using neurology-based techniques. This advanced approach addresses pain and dysfunction at the neurological level.', 'Specialized assessment and treatment using neurology-based techniques', 150.00, '$150+', 90, 'consultation', ARRAY['Neurological assessment and treatment', 'Advanced pain management', 'Functional movement improvement', 'Root cause analysis'], ARRAY['Neurological testing', 'Applied kinesiology', 'Functional neurology', 'Corrective exercise'], ARRAY['Chronic pain sufferers', 'Complex conditions', 'Neurological concerns'], '{"wellness": 15, "restoration-plus": 20, "therapeutic-elite": 25}'),
(uuid_generate_v4(), 'Prenatal Massage', 'prenatal', 'Safe, gentle massage therapy specifically designed for expecting mothers. Specialized techniques and positioning ensure comfort and safety throughout pregnancy.', 'Safe, gentle massage therapy specifically designed for expecting mothers', 90.00, '$90', 60, 'specialty', ARRAY['Pregnancy-related discomfort relief', 'Reduced swelling', 'Better sleep quality', 'Stress and anxiety reduction'], ARRAY['Prenatal positioning', 'Gentle Swedish massage', 'Lymphatic drainage'], ARRAY['Pregnant women (2nd & 3rd trimester)'], '{"wellness": 15, "restoration-plus": 20, "therapeutic-elite": 25}');

-- Insert admin user (password: admin123)
INSERT INTO "Users" ("id", "name", "email", "phone", "password", "role", "emailVerified", "isActive") VALUES
(uuid_generate_v4(), 'Christopher Rembisz', 'admin@considerrestoration.com', '(734) 419-4116', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewreQiOBFPGRWq8W', 'admin', true, true);

-- Insert email templates
INSERT INTO "EmailTemplates" ("name", "subject", "template", "isActive") VALUES
('appointment_confirmation', 'Appointment Confirmed - Consider Restoration', 'appointmentConfirmation', true),
('appointment_reminder', 'Appointment Reminder - Tomorrow at {{appointmentTime}}', 'appointmentReminder', true),
('gift_certificate', 'Your Gift Certificate from Consider Restoration', 'giftCertificate', true),
('welcome', 'Welcome to Consider Restoration!', 'welcome', true);

-- Migration completed successfully
SELECT 'Database migration completed successfully!' as result;
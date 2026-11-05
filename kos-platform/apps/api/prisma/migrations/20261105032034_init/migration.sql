-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('TENANT', 'OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "owner_verification_status" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "document_verification_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('IDENTITY_CARD', 'SELFIE', 'BUSINESS_PERMIT', 'PROPERTY_DEED', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR');

-- CreateEnum
CREATE TYPE "gender_policy" AS ENUM ('MALE_ONLY', 'FEMALE_ONLY', 'MIXED');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "room_type" AS ENUM ('SINGLE', 'DOUBLE', 'TWIN', 'STUDIO', 'SHARED');

-- CreateEnum
CREATE TYPE "bathroom_type" AS ENUM ('INSIDE', 'OUTSIDE');

-- CreateEnum
CREATE TYPE "room_availability_status" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "facility_category" AS ENUM ('GENERAL', 'ROOM', 'SECURITY', 'PARKING', 'UTILITY', 'KITCHEN', 'OTHER');

-- CreateEnum
CREATE TYPE "billing_type" AS ENUM ('FIXED', 'VARIABLE', 'ONE_TIME', 'MONTHLY');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "invoice_item_cost_type" AS ENUM ('RENT', 'DEPOSIT', 'UTILITY', 'SERVICE', 'PENALTY', 'OTHER');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('MIDTRANS', 'MANUAL', 'SIMULATED');

-- CreateEnum
CREATE TYPE "webhook_processing_status" AS ENUM ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "maintenance_category" AS ENUM ('PLUMBING', 'ELECTRICAL', 'FURNITURE', 'CLEANING', 'INTERNET', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "maintenance_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "maintenance_status" AS ENUM ('OPEN', 'REVIEWING', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "room_condition_report_type" AS ENUM ('CHECK_IN', 'PERIODIC_INSPECTION', 'CHECK_OUT');

-- CreateEnum
CREATE TYPE "condition_status" AS ENUM ('GOOD', 'FAIR', 'DAMAGED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "condition_report_status" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'DISPUTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "acknowledgement_type" AS ENUM ('APPROVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "visit_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "report_target_type" AS ENUM ('USER', 'PROPERTY', 'BOOKING', 'PAYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "report_category" AS ENUM ('INCORRECT_INFORMATION', 'PRICE_TRANSPARENCY', 'UNAVAILABLE_PROPERTY', 'FRAUD_SUSPICION', 'INAPPROPRIATE_BEHAVIOR', 'PAYMENT_ISSUE', 'SERVICE_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('BOOKING_CREATED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'BOOKING_CANCELLED', 'BOOKING_EXPIRED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'INVOICE_CREATED', 'INVOICE_DUE_SOON', 'MAINTENANCE_CREATED', 'MAINTENANCE_UPDATED', 'CONTRACT_CREATED', 'CONTRACT_EXPIRING', 'ROOM_AVAILABILITY_REMINDER', 'PROPERTY_VERIFIED', 'PROPERTY_REJECTED', 'OWNER_VERIFICATION_SUBMITTED', 'REPORT_CREATED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('MAINTENANCE', 'ELECTRICITY', 'WATER', 'INTERNET', 'CLEANING', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "verification_decision" AS ENUM ('APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "destination_category" AS ENUM ('CAMPUS', 'OFFICE', 'STATION', 'TERMINAL', 'LANDMARK', 'OTHER');

-- CreateEnum
CREATE TYPE "nearby_category" AS ENUM ('MINIMARKET', 'HOSPITAL', 'CLINIC', 'PHARMACY', 'RESTAURANT', 'WORSHIP', 'ATM', 'BUS_STOP', 'STATION', 'CAMPUS', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone_number" VARCHAR(30),
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'TENANT',
    "account_status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMPTZ(6),
    "phone_verified_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" VARCHAR(150),
    "description" TEXT,
    "identity_verification_status" "owner_verification_status" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "owner_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "occupation" VARCHAR(100),
    "institution_name" VARCHAR(150),
    "emergency_contact_name" VARCHAR(150),
    "emergency_contact_phone" VARCHAR(30),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_agent" TEXT,
    "ip_address" VARCHAR(64),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_verification_documents" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "document_type" "document_type" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "verification_status" "document_verification_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owner_verification_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "subdistrict" VARCHAR(100),
    "postal_code" VARCHAR(10),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "property_type" "property_type" NOT NULL,
    "gender_policy" "gender_policy" NOT NULL,
    "total_rooms" INTEGER NOT NULL DEFAULT 0,
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "publication_status" "publication_status" NOT NULL DEFAULT 'DRAFT',
    "last_availability_confirmation_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt_text" VARCHAR(200),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_number" VARCHAR(30) NOT NULL,
    "room_name" VARCHAR(120),
    "description" TEXT,
    "room_type" "room_type" NOT NULL,
    "area_width" DECIMAL(5,2),
    "area_length" DECIMAL(5,2),
    "monthly_price" DECIMAL(14,2) NOT NULL,
    "maximum_occupants" INTEGER NOT NULL DEFAULT 1,
    "bathroom_type" "bathroom_type" NOT NULL,
    "floor_number" INTEGER,
    "availability_status" "room_availability_status" NOT NULL DEFAULT 'AVAILABLE',
    "last_availability_confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_images" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt_text" VARCHAR(200),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "category" "facility_category" NOT NULL DEFAULT 'GENERAL',
    "icon" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_facilities" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,

    CONSTRAINT "property_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_facilities" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,

    CONSTRAINT "room_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_rules" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "property_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_components" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "billing_type" "billing_type" NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_refundable" BOOLEAN NOT NULL DEFAULT false,
    "is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cost_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "destination_category" NOT NULL,
    "address" TEXT,
    "city" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nearby_places" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "category" "nearby_category" NOT NULL,
    "address" TEXT,
    "distance_meters" INTEGER,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "source" VARCHAR(20) NOT NULL DEFAULT 'SEED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nearby_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_views" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "user_id" UUID,
    "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "minimum_budget" DECIMAL(14,2),
    "maximum_budget" DECIMAL(14,2),
    "preferred_city" VARCHAR(100),
    "preferred_district" VARCHAR(100),
    "preferred_gender_policy" "gender_policy",
    "preferred_room_type" "room_type",
    "preferred_bathroom_type" "bathroom_type",
    "maximum_distance_km" DECIMAL(6,2),
    "preferred_transportation" VARCHAR(50),
    "preferred_destination_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference_facilities" (
    "id" UUID NOT NULL,
    "preference_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,

    CONSTRAINT "user_preference_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "cleanliness_rating" INTEGER,
    "location_rating" INTEGER,
    "facilities_rating" INTEGER,
    "owner_service_rating" INTEGER,
    "content" TEXT NOT NULL,
    "status" "review_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "visit_status" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_checklists" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "checklist_item" VARCHAR(160) NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_images" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_notes" (
    "id" UUID NOT NULL,
    "visit_id" UUID NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "visit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "booking_code" VARCHAR(40) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "monthly_price_snapshot" DECIMAL(14,2) NOT NULL,
    "deposit_amount_snapshot" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "additional_cost_snapshot" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'PENDING',
    "tenant_notes" TEXT,
    "owner_notes" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_histories" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "previous_status" "booking_status",
    "new_status" "booking_status" NOT NULL,
    "changed_by_id" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "contract_number" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "monthly_rent" DECIMAL(14,2) NOT NULL,
    "deposit_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "terms" TEXT NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT 'DRAFT',
    "owner_accepted_at" TIMESTAMPTZ(6),
    "tenant_accepted_at" TIMESTAMPTZ(6),
    "signed_at" TIMESTAMPTZ(6),
    "document_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_documents" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "document_type" "document_type" NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "booking_id" UUID,
    "contract_id" UUID,
    "invoice_number" VARCHAR(50) NOT NULL,
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "property_id" UUID,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "cost_type" "invoice_item_cost_type" NOT NULL DEFAULT 'RENT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "payment_code" VARCHAR(50) NOT NULL,
    "payment_provider" "payment_provider" NOT NULL,
    "provider_transaction_id" VARCHAR(120),
    "order_id" VARCHAR(120) NOT NULL,
    "payment_method" VARCHAR(80),
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'IDR',
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "snap_token" TEXT,
    "snap_redirect_url" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "expired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_status_histories" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "previous_status" "payment_status",
    "new_status" "payment_status" NOT NULL,
    "source" VARCHAR(40) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "idempotency_key" VARCHAR(160) NOT NULL,
    "provider_transaction_id" VARCHAR(120),
    "order_id" VARCHAR(120),
    "payload" JSONB NOT NULL,
    "processing_status" "webhook_processing_status" NOT NULL DEFAULT 'RECEIVED',
    "error_message" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_expenses" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "category" "expense_category" NOT NULL,
    "description" VARCHAR(250) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "receipt_storage_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "property_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "maintenance_category" NOT NULL,
    "priority" "maintenance_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "maintenance_status" NOT NULL DEFAULT 'OPEN',
    "assigned_to_id" UUID,
    "reported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_images" (
    "id" UUID NOT NULL,
    "maintenance_request_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_status_histories" (
    "id" UUID NOT NULL,
    "maintenance_request_id" UUID NOT NULL,
    "previous_status" "maintenance_status",
    "new_status" "maintenance_status" NOT NULL,
    "changed_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_condition_reports" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "contract_id" UUID,
    "report_type" "room_condition_report_type" NOT NULL,
    "report_date" DATE NOT NULL,
    "general_condition" "condition_status" NOT NULL,
    "notes" TEXT,
    "status" "condition_report_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "property_id" UUID,

    CONSTRAINT "room_condition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_condition_images" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "area_name" VARCHAR(100),
    "description" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_condition_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_condition_checklist_items" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "item_name" VARCHAR(100) NOT NULL,
    "condition_status" "condition_status" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_condition_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_condition_acknowledgements" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "acknowledgement_type" "acknowledgement_type" NOT NULL,
    "notes" TEXT,
    "acknowledged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_condition_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_verification_histories" (
    "id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "previous_status" "verification_status",
    "new_status" "verification_status" NOT NULL,
    "decision" "verification_decision" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_verification_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "target_type" "report_target_type" NOT NULL,
    "target_id" UUID,
    "category" "report_category" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_storage_path" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'OPEN',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(80),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_type" VARCHAR(60),
    "related_entity_id" VARCHAR(80),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "booking_notifications" BOOLEAN NOT NULL DEFAULT true,
    "payment_notifications" BOOLEAN NOT NULL DEFAULT true,
    "maintenance_notifications" BOOLEAN NOT NULL DEFAULT true,
    "marketing_notifications" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "cover_image_path" TEXT,
    "status" "article_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_account_status_idx" ON "users"("account_status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "owner_profiles_user_id_key" ON "owner_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_profiles_user_id_key" ON "tenant_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "owner_verification_documents_owner_id_verification_status_idx" ON "owner_verification_documents"("owner_id", "verification_status");

-- CreateIndex
CREATE INDEX "owner_verification_documents_reviewed_by_id_idx" ON "owner_verification_documents"("reviewed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_owner_id_idx" ON "properties"("owner_id");

-- CreateIndex
CREATE INDEX "properties_city_idx" ON "properties"("city");

-- CreateIndex
CREATE INDEX "properties_district_idx" ON "properties"("district");

-- CreateIndex
CREATE INDEX "properties_verification_status_idx" ON "properties"("verification_status");

-- CreateIndex
CREATE INDEX "properties_publication_status_idx" ON "properties"("publication_status");

-- CreateIndex
CREATE INDEX "properties_latitude_longitude_idx" ON "properties"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "properties_publication_status_verification_status_city_idx" ON "properties"("publication_status", "verification_status", "city");

-- CreateIndex
CREATE INDEX "property_images_property_id_display_order_idx" ON "property_images"("property_id", "display_order");

-- CreateIndex
CREATE INDEX "rooms_property_id_availability_status_idx" ON "rooms"("property_id", "availability_status");

-- CreateIndex
CREATE INDEX "rooms_monthly_price_idx" ON "rooms"("monthly_price");

-- CreateIndex
CREATE INDEX "rooms_last_availability_confirmed_at_idx" ON "rooms"("last_availability_confirmed_at");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_property_id_room_number_key" ON "rooms"("property_id", "room_number");

-- CreateIndex
CREATE INDEX "room_images_room_id_display_order_idx" ON "room_images"("room_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_name_key" ON "facilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_slug_key" ON "facilities"("slug");

-- CreateIndex
CREATE INDEX "facilities_category_idx" ON "facilities"("category");

-- CreateIndex
CREATE INDEX "property_facilities_facility_id_idx" ON "property_facilities"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "property_facilities_property_id_facility_id_key" ON "property_facilities"("property_id", "facility_id");

-- CreateIndex
CREATE INDEX "room_facilities_facility_id_idx" ON "room_facilities"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_facilities_room_id_facility_id_key" ON "room_facilities"("room_id", "facility_id");

-- CreateIndex
CREATE INDEX "property_rules_property_id_idx" ON "property_rules"("property_id");

-- CreateIndex
CREATE INDEX "cost_components_property_id_idx" ON "cost_components"("property_id");

-- CreateIndex
CREATE INDEX "cost_components_room_id_idx" ON "cost_components"("room_id");

-- CreateIndex
CREATE INDEX "destinations_city_idx" ON "destinations"("city");

-- CreateIndex
CREATE INDEX "nearby_places_property_id_category_idx" ON "nearby_places"("property_id", "category");

-- CreateIndex
CREATE INDEX "property_views_property_id_viewed_at_idx" ON "property_views"("property_id", "viewed_at");

-- CreateIndex
CREATE INDEX "property_views_user_id_idx" ON "property_views"("user_id");

-- CreateIndex
CREATE INDEX "favorites_property_id_idx" ON "favorites"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_property_id_key" ON "favorites"("user_id", "property_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "user_preferences_preferred_city_idx" ON "user_preferences"("preferred_city");

-- CreateIndex
CREATE INDEX "user_preference_facilities_facility_id_idx" ON "user_preference_facilities"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_facilities_preference_id_facility_id_key" ON "user_preference_facilities"("preference_id", "facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_property_id_status_idx" ON "reviews"("property_id", "status");

-- CreateIndex
CREATE INDEX "reviews_tenant_id_idx" ON "reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "visits_tenant_id_status_idx" ON "visits"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "visits_property_id_idx" ON "visits"("property_id");

-- CreateIndex
CREATE INDEX "visit_checklists_visit_id_idx" ON "visit_checklists"("visit_id");

-- CreateIndex
CREATE INDEX "visit_images_visit_id_idx" ON "visit_images"("visit_id");

-- CreateIndex
CREATE INDEX "visit_notes_visit_id_idx" ON "visit_notes"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "bookings_tenant_id_status_idx" ON "bookings"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "bookings_owner_id_status_idx" ON "bookings"("owner_id", "status");

-- CreateIndex
CREATE INDEX "bookings_room_id_start_date_end_date_idx" ON "bookings"("room_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "bookings_status_expires_at_idx" ON "bookings"("status", "expires_at");

-- CreateIndex
CREATE INDEX "booking_status_histories_booking_id_created_at_idx" ON "booking_status_histories"("booking_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_booking_id_key" ON "contracts"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

-- CreateIndex
CREATE INDEX "contracts_tenant_id_status_idx" ON "contracts"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "contracts_owner_id_status_idx" ON "contracts"("owner_id", "status");

-- CreateIndex
CREATE INDEX "contracts_property_id_idx" ON "contracts"("property_id");

-- CreateIndex
CREATE INDEX "contract_documents_contract_id_idx" ON "contract_documents"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_owner_id_status_idx" ON "invoices"("owner_id", "status");

-- CreateIndex
CREATE INDEX "invoices_booking_id_idx" ON "invoices"("booking_id");

-- CreateIndex
CREATE INDEX "invoices_property_id_idx" ON "invoices"("property_id");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_code_key" ON "payments"("payment_code");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payment_status_histories_payment_id_created_at_idx" ON "payment_status_histories"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_webhook_events_order_id_idx" ON "payment_webhook_events"("order_id");

-- CreateIndex
CREATE INDEX "payment_webhook_events_processing_status_idx" ON "payment_webhook_events"("processing_status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhook_events_provider_idempotency_key_key" ON "payment_webhook_events"("provider", "idempotency_key");

-- CreateIndex
CREATE INDEX "property_expenses_owner_id_expense_date_idx" ON "property_expenses"("owner_id", "expense_date");

-- CreateIndex
CREATE INDEX "property_expenses_property_id_expense_date_idx" ON "property_expenses"("property_id", "expense_date");

-- CreateIndex
CREATE INDEX "maintenance_requests_tenant_id_status_idx" ON "maintenance_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_requests_owner_id_status_idx" ON "maintenance_requests"("owner_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_requests_room_id_status_idx" ON "maintenance_requests"("room_id", "status");

-- CreateIndex
CREATE INDEX "maintenance_images_maintenance_request_id_idx" ON "maintenance_images"("maintenance_request_id");

-- CreateIndex
CREATE INDEX "maintenance_status_histories_maintenance_request_id_created_idx" ON "maintenance_status_histories"("maintenance_request_id", "created_at");

-- CreateIndex
CREATE INDEX "room_condition_reports_room_id_report_type_idx" ON "room_condition_reports"("room_id", "report_type");

-- CreateIndex
CREATE INDEX "room_condition_reports_tenant_id_idx" ON "room_condition_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "room_condition_reports_owner_id_idx" ON "room_condition_reports"("owner_id");

-- CreateIndex
CREATE INDEX "room_condition_reports_contract_id_idx" ON "room_condition_reports"("contract_id");

-- CreateIndex
CREATE INDEX "room_condition_reports_property_id_idx" ON "room_condition_reports"("property_id");

-- CreateIndex
CREATE INDEX "room_condition_images_report_id_idx" ON "room_condition_images"("report_id");

-- CreateIndex
CREATE INDEX "room_condition_checklist_items_report_id_idx" ON "room_condition_checklist_items"("report_id");

-- CreateIndex
CREATE INDEX "room_condition_acknowledgements_user_id_idx" ON "room_condition_acknowledgements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_condition_acknowledgements_report_id_user_id_key" ON "room_condition_acknowledgements"("report_id", "user_id");

-- CreateIndex
CREATE INDEX "property_verification_histories_property_id_created_at_idx" ON "property_verification_histories"("property_id", "created_at");

-- CreateIndex
CREATE INDEX "property_verification_histories_admin_id_idx" ON "property_verification_histories"("admin_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_status_published_at_idx" ON "articles"("status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- AddForeignKey
ALTER TABLE "owner_profiles" ADD CONSTRAINT "owner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_verification_documents" ADD CONSTRAINT "owner_verification_documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_verification_documents" ADD CONSTRAINT "owner_verification_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_facilities" ADD CONSTRAINT "room_facilities_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_facilities" ADD CONSTRAINT "room_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_rules" ADD CONSTRAINT "property_rules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_components" ADD CONSTRAINT "cost_components_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_components" ADD CONSTRAINT "cost_components_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nearby_places" ADD CONSTRAINT "nearby_places_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_preferred_destination_id_fkey" FOREIGN KEY ("preferred_destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference_facilities" ADD CONSTRAINT "user_preference_facilities_preference_id_fkey" FOREIGN KEY ("preference_id") REFERENCES "user_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference_facilities" ADD CONSTRAINT "user_preference_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_checklists" ADD CONSTRAINT "visit_checklists_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_images" ADD CONSTRAINT "visit_images_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_status_histories" ADD CONSTRAINT "payment_status_histories_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_expenses" ADD CONSTRAINT "property_expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_images" ADD CONSTRAINT "maintenance_images_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_images" ADD CONSTRAINT "maintenance_images_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_status_histories" ADD CONSTRAINT "maintenance_status_histories_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_status_histories" ADD CONSTRAINT "maintenance_status_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_images" ADD CONSTRAINT "room_condition_images_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "room_condition_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_images" ADD CONSTRAINT "room_condition_images_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_checklist_items" ADD CONSTRAINT "room_condition_checklist_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "room_condition_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_acknowledgements" ADD CONSTRAINT "room_condition_acknowledgements_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "room_condition_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_condition_acknowledgements" ADD CONSTRAINT "room_condition_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_verification_histories" ADD CONSTRAINT "property_verification_histories_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_verification_histories" ADD CONSTRAINT "property_verification_histories_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- Nestari hardening migration (hand-written, applied after Prisma DDL)
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Keep updated_at correct for writes that do not go through Prisma.
CREATE OR REPLACE FUNCTION nestari_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users','owner_profiles','tenant_profiles','properties','rooms',
    'property_rules','cost_components','user_preferences','visits','visit_notes',
    'bookings','contracts','invoices','payments','maintenance_requests',
    'property_expenses','room_condition_reports','reports','notification_preferences',
    'articles','platform_settings'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION nestari_set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  END LOOP;
END;
$$;

-- Audit logs are append-only for all application roles.
CREATE OR REPLACE FUNCTION nestari_block_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION nestari_block_audit_mutation();

-- Domain checks: coordinates
ALTER TABLE properties
  ADD CONSTRAINT properties_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT properties_longitude_check CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT properties_name_not_blank CHECK (length(btrim(name)) > 0);

-- Inventory checks
ALTER TABLE rooms
  ADD CONSTRAINT rooms_price_non_negative CHECK (monthly_price >= 0),
  ADD CONSTRAINT rooms_occupants_positive CHECK (maximum_occupants > 0),
  ADD CONSTRAINT rooms_area_positive CHECK (
    (area_width IS NULL OR area_width > 0) AND
    (area_length IS NULL OR area_length > 0)
  );

ALTER TABLE cost_components
  ADD CONSTRAINT cost_components_amount_non_negative CHECK (amount >= 0);

-- Booking period and money checks
ALTER TABLE bookings
  ADD CONSTRAINT bookings_period_valid CHECK (end_date > start_date),
  ADD CONSTRAINT bookings_amounts_non_negative CHECK (
    monthly_price_snapshot >= 0 AND
    deposit_amount_snapshot >= 0 AND
    additional_cost_snapshot >= 0 AND
    total_amount >= 0
  ),
  ADD CONSTRAINT bookings_expiry_after_creation CHECK (expires_at > created_at);

-- The database is the final guard against double booking. Only inventory-holding
-- states participate; expired/cancelled/rejected/completed rows release the room.
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_active_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'APPROVED', 'AWAITING_PAYMENT', 'CONFIRMED'));

ALTER TABLE contracts
  ADD CONSTRAINT contracts_period_valid CHECK (end_date > start_date),
  ADD CONSTRAINT contracts_money_non_negative CHECK (monthly_rent >= 0 AND deposit_amount >= 0);

ALTER TABLE invoices
  ADD CONSTRAINT invoices_period_valid CHECK (billing_period_end >= billing_period_start),
  ADD CONSTRAINT invoices_dates_valid CHECK (due_date >= issue_date),
  ADD CONSTRAINT invoices_money_valid CHECK (
    subtotal >= 0 AND discount_amount >= 0 AND total_amount >= 0 AND total_amount >= discount_amount
  );

ALTER TABLE invoice_items
  ADD CONSTRAINT invoice_items_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT invoice_items_money_valid CHECK (unit_price >= 0 AND subtotal >= 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_valid CHECK (rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_cleanliness_valid CHECK (cleanliness_rating IS NULL OR cleanliness_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_location_valid CHECK (location_rating IS NULL OR location_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_facilities_valid CHECK (facilities_rating IS NULL OR facilities_rating BETWEEN 1 AND 5),
  ADD CONSTRAINT reviews_owner_service_valid CHECK (owner_service_rating IS NULL OR owner_service_rating BETWEEN 1 AND 5);

ALTER TABLE property_expenses
  ADD CONSTRAINT property_expenses_amount_non_negative CHECK (amount >= 0);

ALTER TABLE maintenance_requests
  ADD CONSTRAINT maintenance_title_not_blank CHECK (length(btrim(title)) > 0);

-- One primary image per property.
CREATE UNIQUE INDEX property_images_one_primary
  ON property_images (property_id)
  WHERE is_primary = true;

-- Trigram search indexes for case-insensitive public search.
CREATE INDEX properties_name_trgm_idx ON properties USING gin (name gin_trgm_ops);
CREATE INDEX properties_city_trgm_idx ON properties USING gin (city gin_trgm_ops);
CREATE INDEX properties_district_trgm_idx ON properties USING gin (district gin_trgm_ops);
CREATE INDEX properties_address_trgm_idx ON properties USING gin (address gin_trgm_ops);
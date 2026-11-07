-- ════════════════════════════════════════════════════════════════════════════
-- KosPlatform — skema awal untuk Supabase (PostgreSQL)
--
-- Dibuat untuk dijalankan di SQL Editor Supabase atau lewat Supabase CLI
-- (`supabase db push`). Menggantikan migration Prisma: seluruh skema kini
-- dipegang SQL, tanpa Prisma di aplikasi maupun di tooling.
--
-- Catatan rancangan:
--   * `id` memakai DEFAULT gen_random_uuid() — dulu Prisma yang membuat UUID
--     di kode aplikasi, sekarang database sendiri yang menjamin.
--   * `created_at` dan `updated_at` memakai DEFAULT now(), dan updated_at
--     diperbarui otomatis oleh trigger set_updated_at() di setiap tabel yang
--     memilikinya, sehingga tidak bisa terlupa di query UPDATE.
--   * Enum memakai tipe enum PostgreSQL agar nilainya dijaga database.
--   * Skema ini aman dijalankan pada database kosong.
-- ════════════════════════════════════════════════════════════════════════════

-- pgcrypto: gen_random_uuid() sudah bawaan PostgreSQL 13+, tetapi Supabase
-- menyediakan pgcrypto dan sebagian tooling lama masih mengharapkannya.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Tipe enum ─────────────────────────────────────────────────────────────

CREATE TYPE "Role" AS ENUM ('TENANT', 'OWNER', 'ADMIN');

CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION');

CREATE TYPE "PropertyType" AS ENUM ('KOS_PUTRA', 'KOS_PUTRI', 'KOS_CAMPUR');

CREATE TYPE "PropertyVerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

CREATE TYPE "RoomAvailabilityStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');

CREATE TYPE "FacilityCategory" AS ENUM ('PROPERTY', 'ROOM');

CREATE TYPE "BillingType" AS ENUM ('FIXED', 'VARIABLE', 'ONE_TIME', 'MONTHLY');

CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED');

CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED');

CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'REVIEWING', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'RESOLVED', 'REJECTED', 'CLOSED');

CREATE TYPE "ReportType" AS ENUM ('CHECK_IN', 'PERIODIC_INSPECTION', 'CHECK_OUT');

CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'DISPUTED', 'COMPLETED');

CREATE TYPE "AcknowledgementType" AS ENUM ('TENANT', 'OWNER');

CREATE TYPE "VisitStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

CREATE TYPE "ReviewStatus" AS ENUM ('PENDING_MODERATION', 'APPROVED', 'REJECTED', 'HIDDEN');

CREATE TYPE "ReportCategory" AS ENUM ('PROPERTY_INACCURATE', 'PRICE_NOT_TRANSPARENT', 'PROPERTY_NOT_AVAILABLE', 'SUSPECTED_FRAUD', 'INAPPROPRIATE_BEHAVIOR', 'PAYMENT_ISSUE', 'SERVICE_ISSUE');

CREATE TYPE "ReportStatusAdmin" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED');

CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CREATED', 'BOOKING_APPROVED', 'BOOKING_REJECTED', 'PAYMENT_SUCCESS', 'NEW_INVOICE', 'INVOICE_DUE_SOON', 'MAINTENANCE_UPDATED', 'CONTRACT_EXPIRING', 'NEW_BOOKING', 'PAYMENT_RECEIVED', 'NEW_MAINTENANCE_REPORT', 'CONTRACT_EXPIRING_OWNER', 'AVAILABILITY_REMINDER', 'PROPERTY_VERIFIED', 'OWNER_VERIFICATION_SUBMITTED', 'PROPERTY_WAITING_REVIEW', 'NEW_REPORT', 'NEW_COMPLAINT');

CREATE TYPE "CostConfidence" AS ENUM ('COMPLETE', 'PARTIAL', 'NEEDS_CONFIRMATION');

-- ─── Tabel ─────────────────────────────────────────────────────────────────
CREATE TABLE "users" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "avatar_url" TEXT,
    "role" "Role" NOT NULL DEFAULT 'TENANT',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "email_verified_at" TIMESTAMPTZ(3),
    "phone_verified_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "owner_profiles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "identity_verification_status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "identity_document_status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "business_name" TEXT,
    "description" TEXT,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "owner_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_profiles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "occupation" TEXT,
    "institution_name" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "properties" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "subdistrict" TEXT,
    "postal_code" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "property_type" "PropertyType" NOT NULL DEFAULT 'KOS_CAMPUR',
    "gender_policy" TEXT NOT NULL DEFAULT 'campur',
    "total_rooms" INTEGER NOT NULL DEFAULT 0,
    "verification_status" "PropertyVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "last_availability_confirmation_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "cost_confidence" "CostConfidence" NOT NULL DEFAULT 'NEEDS_CONFIRMATION',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rooms" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "room_number" TEXT NOT NULL,
    "room_name" TEXT,
    "description" TEXT,
    "room_type" TEXT NOT NULL DEFAULT 'reguler',
    "area_width" DECIMAL(65,30),
    "area_length" DECIMAL(65,30),
    "monthly_price" DECIMAL(14,2) NOT NULL,
    "maximum_occupants" INTEGER NOT NULL DEFAULT 1,
    "bathroom_type" TEXT NOT NULL DEFAULT 'shared',
    "floor_number" INTEGER,
    "availability_status" "RoomAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_images" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "image_url" TEXT,
    "alt_text" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_images" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt_text" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "room_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "facilities" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "FacilityCategory" NOT NULL DEFAULT 'PROPERTY',
    "icon" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_facilities" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,

    CONSTRAINT "property_facilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_facilities" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "facility_id" UUID NOT NULL,

    CONSTRAINT "room_facilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_rules" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "rule_title" TEXT NOT NULL,
    "rule_description" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "property_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cost_components" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "billing_type" "BillingType" NOT NULL DEFAULT 'MONTHLY',
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_refundable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "cost_confidence" "CostConfidence" NOT NULL DEFAULT 'NEEDS_CONFIRMATION',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "cost_components_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bookings" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "booking_code" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "end_date" TIMESTAMPTZ(3),
    "monthly_price_snapshot" DECIMAL(14,2) NOT NULL,
    "deposit_amount_snapshot" DECIMAL(14,2) NOT NULL,
    "additional_cost_snapshot" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "tenant_notes" TEXT,
    "owner_notes" TEXT,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),
    "owner_id" UUID,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_status_histories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "previous_status" "BookingStatus",
    "new_status" "BookingStatus" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "booking_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_visitors" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "booking_visitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contracts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "contract_number" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "end_date" TIMESTAMPTZ(3),
    "monthly_rent" DECIMAL(14,2) NOT NULL,
    "deposit_amount" DECIMAL(14,2) NOT NULL,
    "contract_status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_documents" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "booking_id" UUID,
    "contract_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "billing_period_start" TIMESTAMPTZ(3),
    "billing_period_end" TIMESTAMPTZ(3),
    "issue_date" TIMESTAMPTZ(3),
    "due_date" TIMESTAMPTZ(3),
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "invoice_status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "cost_type" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID,
    "tenant_id" UUID NOT NULL,
    "booking_id" UUID,
    "payment_code" TEXT NOT NULL,
    "payment_provider" TEXT NOT NULL DEFAULT 'midtrans',
    "provider_transaction_id" TEXT,
    "provider_order_id" TEXT,
    "payment_method" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(3),
    "expired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_status_histories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "previous_status" "PaymentStatus",
    "new_status" "PaymentStatus" NOT NULL,
    "source" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "payment_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_webhook_events" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider_transaction_id" TEXT,
    "payload" JSONB,
    "processing_status" TEXT NOT NULL DEFAULT 'processed',
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_requests" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" UUID,
    "reported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_images" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_request_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "maintenance_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_status_histories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "maintenance_request_id" UUID NOT NULL,
    "previous_status" "MaintenanceStatus",
    "new_status" "MaintenanceStatus" NOT NULL,
    "changed_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "maintenance_status_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_condition_reports" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID,
    "contract_id" UUID,
    "report_type" "ReportType" NOT NULL DEFAULT 'CHECK_IN',
    "report_date" TIMESTAMPTZ(3),
    "general_condition" TEXT,
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "room_condition_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_condition_images" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "area_name" TEXT,
    "description" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "room_condition_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_condition_checklist_items" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "condition_status" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "room_condition_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "room_condition_acknowledgements" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "acknowledgement_type" "AcknowledgementType" NOT NULL,
    "notes" TEXT,
    "acknowledged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "room_condition_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visits" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "room_id" UUID,
    "scheduled_at" TIMESTAMPTZ(3),
    "visit_status" "VisitStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visit_checklists" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "visit_id" UUID NOT NULL,
    "checklist_item" TEXT NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "visit_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visit_images" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "visit_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "visit_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "visit_notes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "visit_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "visit_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_preferences" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "minimum_budget" DECIMAL(14,2),
    "maximum_budget" DECIMAL(14,2),
    "preferred_city" TEXT,
    "preferred_district" TEXT,
    "preferred_gender_policy" TEXT,
    "maximum_distance_km" DECIMAL(10,2),
    "preferred_facilities" TEXT,
    "preferred_transportation" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "favorites" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_views" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "property_id" UUID NOT NULL,
    "viewed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "property_views_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reviews" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "booking_id" UUID,
    "rating" INTEGER NOT NULL,
    "cleanliness_rating" INTEGER,
    "location_rating" INTEGER,
    "facilities_rating" INTEGER,
    "owner_service_rating" INTEGER,
    "review_content" TEXT,
    "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING_MODERATION',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "owner_verification_documents" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "owner_verification_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "property_verification_histories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "admin_id" UUID,
    "previous_status" "PropertyVerificationStatus",
    "new_status" "PropertyVerificationStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "property_verification_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_storage_path" TEXT,
    "status" "ReportStatusAdmin" NOT NULL DEFAULT 'OPEN',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expenses" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "date" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "password_reset_tokens" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_sessions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_articles" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "author_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    "updated_at" timestamptz(3) NOT NULL DEFAULT now(),

    CONSTRAINT "content_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX "owner_profiles_user_id_key" ON "owner_profiles"("user_id");

CREATE UNIQUE INDEX "tenant_profiles_user_id_key" ON "tenant_profiles"("user_id");

CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

CREATE UNIQUE INDEX "rooms_property_id_room_number_key" ON "rooms"("property_id", "room_number");

CREATE UNIQUE INDEX "facilities_name_key" ON "facilities"("name");

CREATE UNIQUE INDEX "facilities_slug_key" ON "facilities"("slug");

CREATE UNIQUE INDEX "property_facilities_property_id_facility_id_key" ON "property_facilities"("property_id", "facility_id");

CREATE UNIQUE INDEX "room_facilities_room_id_facility_id_key" ON "room_facilities"("room_id", "facility_id");

CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

CREATE UNIQUE INDEX "contracts_booking_id_key" ON "contracts"("booking_id");

CREATE UNIQUE INDEX "contracts_contract_number_key" ON "contracts"("contract_number");

CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

CREATE UNIQUE INDEX "payments_payment_code_key" ON "payments"("payment_code");

CREATE UNIQUE INDEX "payment_webhook_events_event_id_key" ON "payment_webhook_events"("event_id");

CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

CREATE UNIQUE INDEX "favorites_user_id_property_id_key" ON "favorites"("user_id", "property_id");

CREATE UNIQUE INDEX "password_reset_tokens_user_id_key" ON "password_reset_tokens"("user_id");

CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

CREATE UNIQUE INDEX "refresh_sessions_token_key" ON "refresh_sessions"("token");

CREATE UNIQUE INDEX "content_articles_slug_key" ON "content_articles"("slug");

ALTER TABLE "owner_profiles" ADD CONSTRAINT "owner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_facilities" ADD CONSTRAINT "property_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_facilities" ADD CONSTRAINT "room_facilities_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_facilities" ADD CONSTRAINT "room_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_rules" ADD CONSTRAINT "property_rules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_components" ADD CONSTRAINT "cost_components_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_components" ADD CONSTRAINT "cost_components_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_visitors" ADD CONSTRAINT "booking_visitors_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_visitors" ADD CONSTRAINT "booking_visitors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_status_histories" ADD CONSTRAINT "payment_status_histories_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "maintenance_images" ADD CONSTRAINT "maintenance_images_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_images" ADD CONSTRAINT "maintenance_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_status_histories" ADD CONSTRAINT "maintenance_status_histories_maintenance_request_id_fkey" FOREIGN KEY ("maintenance_request_id") REFERENCES "maintenance_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "room_condition_reports" ADD CONSTRAINT "room_condition_reports_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "room_condition_images" ADD CONSTRAINT "room_condition_images_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "room_condition_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_condition_images" ADD CONSTRAINT "room_condition_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "room_condition_checklist_items" ADD CONSTRAINT "room_condition_checklist_items_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "room_condition_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_condition_acknowledgements" ADD CONSTRAINT "room_condition_acknowledgements_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "room_condition_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "room_condition_acknowledgements" ADD CONSTRAINT "room_condition_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "visits" ADD CONSTRAINT "visits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "visits" ADD CONSTRAINT "visits_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "visits" ADD CONSTRAINT "visits_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "visit_checklists" ADD CONSTRAINT "visit_checklists_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visit_images" ADD CONSTRAINT "visit_images_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "visit_notes" ADD CONSTRAINT "visit_notes_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "property_views" ADD CONSTRAINT "property_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_views" ADD CONSTRAINT "property_views_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "owner_verification_documents" ADD CONSTRAINT "owner_verification_documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "owner_verification_documents" ADD CONSTRAINT "owner_verification_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "property_verification_histories" ADD CONSTRAINT "property_verification_histories_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "property_verification_histories" ADD CONSTRAINT "property_verification_histories_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_articles" ADD CONSTRAINT "content_articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Trigger updated_at ────────────────────────────────────────────────────
-- updated_at diurus database, bukan pemanggil query.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "users_set_updated_at"
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "owner_profiles_set_updated_at"
  BEFORE UPDATE ON "owner_profiles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "tenant_profiles_set_updated_at"
  BEFORE UPDATE ON "tenant_profiles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "properties_set_updated_at"
  BEFORE UPDATE ON "properties"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "rooms_set_updated_at"
  BEFORE UPDATE ON "rooms"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "property_rules_set_updated_at"
  BEFORE UPDATE ON "property_rules"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "cost_components_set_updated_at"
  BEFORE UPDATE ON "cost_components"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "bookings_set_updated_at"
  BEFORE UPDATE ON "bookings"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "contracts_set_updated_at"
  BEFORE UPDATE ON "contracts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "invoices_set_updated_at"
  BEFORE UPDATE ON "invoices"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "payments_set_updated_at"
  BEFORE UPDATE ON "payments"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "maintenance_requests_set_updated_at"
  BEFORE UPDATE ON "maintenance_requests"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "room_condition_reports_set_updated_at"
  BEFORE UPDATE ON "room_condition_reports"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "visits_set_updated_at"
  BEFORE UPDATE ON "visits"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "visit_notes_set_updated_at"
  BEFORE UPDATE ON "visit_notes"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "user_preferences_set_updated_at"
  BEFORE UPDATE ON "user_preferences"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "reviews_set_updated_at"
  BEFORE UPDATE ON "reviews"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "reports_set_updated_at"
  BEFORE UPDATE ON "reports"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "expenses_set_updated_at"
  BEFORE UPDATE ON "expenses"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "content_articles_set_updated_at"
  BEFORE UPDATE ON "content_articles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

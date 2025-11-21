-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "plan" VARCHAR(50) NOT NULL DEFAULT 'free',
    "approval_levels" INTEGER NOT NULL DEFAULT 0,
    "logo_url" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "approval_level" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "permit_number" VARCHAR(100),
    "address" TEXT,
    "contact_name" VARCHAR(100),
    "contact_phone" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "facility_info" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system_template" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "options" JSONB NOT NULL DEFAULT '{}',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "inspector_id" UUID NOT NULL,
    "inspection_date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "summary" TEXT,
    "current_approval_level" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_id" UUID NOT NULL,
    "template_item_id" UUID NOT NULL,
    "value" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_id" UUID NOT NULL,
    "inspection_item_id" UUID,
    "file_path" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "edited_data" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspection_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "approval_level" INTEGER NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "sites_organization_id_idx" ON "sites"("organization_id");

-- CreateIndex
CREATE INDEX "templates_organization_id_idx" ON "templates"("organization_id");

-- CreateIndex
CREATE INDEX "templates_category_idx" ON "templates"("category");

-- CreateIndex
CREATE INDEX "template_items_template_id_idx" ON "template_items"("template_id");

-- CreateIndex
CREATE INDEX "inspections_organization_id_idx" ON "inspections"("organization_id");

-- CreateIndex
CREATE INDEX "inspections_site_id_idx" ON "inspections"("site_id");

-- CreateIndex
CREATE INDEX "inspections_inspector_id_idx" ON "inspections"("inspector_id");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "inspections_inspection_date_idx" ON "inspections"("inspection_date" DESC);

-- CreateIndex
CREATE INDEX "inspection_items_inspection_id_idx" ON "inspection_items"("inspection_id");

-- CreateIndex
CREATE INDEX "inspection_items_template_item_id_idx" ON "inspection_items"("template_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_items_inspection_id_template_item_id_key" ON "inspection_items"("inspection_id", "template_item_id");

-- CreateIndex
CREATE INDEX "photos_inspection_id_idx" ON "photos"("inspection_id");

-- CreateIndex
CREATE INDEX "photos_inspection_item_id_idx" ON "photos"("inspection_item_id");

-- CreateIndex
CREATE INDEX "approval_logs_inspection_id_idx" ON "approval_logs"("inspection_id");

-- CreateIndex
CREATE INDEX "approval_logs_approver_id_idx" ON "approval_logs"("approver_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_items" ADD CONSTRAINT "template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_inspection_item_id_fkey" FOREIGN KEY ("inspection_item_id") REFERENCES "inspection_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


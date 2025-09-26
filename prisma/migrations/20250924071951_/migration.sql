-- CreateEnum
CREATE TYPE "public"."PublishStatus" AS ENUM ('PUBLIC', 'COMMUNITY_INTERNAL', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."Source" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "public"."LineRichMenuType" AS ENUM ('ADMIN', 'USER', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."SysRole" AS ENUM ('SYS_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."CurrentPrefecture" AS ENUM ('KAGAWA', 'TOKUSHIMA', 'KOCHI', 'EHIME', 'OUTSIDE_SHIKOKU', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."IdentityPlatform" AS ENUM ('LINE', 'FACEBOOK', 'PHONE');

-- CreateEnum
CREATE TYPE "public"."DIDIssuanceStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."VCIssuanceStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('OWNER', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."MembershipStatus" AS ENUM ('PENDING', 'JOINED', 'LEFT');

-- CreateEnum
CREATE TYPE "public"."MembershipStatusReason" AS ENUM ('CREATED_COMMUNITY', 'INVITED', 'CANCELED_INVITATION', 'ACCEPTED_INVITATION', 'DECLINED_INVITATION', 'WITHDRAWN', 'REMOVED', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "public"."ParticipationType" AS ENUM ('HOSTED', 'PARTICIPATED');

-- CreateEnum
CREATE TYPE "public"."WalletType" AS ENUM ('COMMUNITY', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."ArticleCategory" AS ENUM ('ACTIVITY_REPORT', 'INTERVIEW');

-- CreateEnum
CREATE TYPE "public"."OpportunityCategory" AS ENUM ('QUEST', 'EVENT', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "public"."OpportunitySlotHostingStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('APPLIED', 'ACCEPTED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."ParticipationStatus" AS ENUM ('PENDING', 'PARTICIPATING', 'PARTICIPATED', 'NOT_PARTICIPATING');

-- CreateEnum
CREATE TYPE "public"."ParticipationStatusReason" AS ENUM ('PERSONAL_RECORD', 'RESERVATION_JOINED', 'RESERVATION_APPLIED', 'RESERVATION_CANCELED', 'RESERVATION_ACCEPTED', 'RESERVATION_REJECTED', 'OPPORTUNITY_CANCELED');

-- CreateEnum
CREATE TYPE "public"."EvaluationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ClaimLinkStatus" AS ENUM ('ISSUED', 'CLAIMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('AVAILABLE', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."TicketStatusReason" AS ENUM ('GIFTED', 'PURCHASED', 'REFUNDED', 'RESERVED', 'CANCELED', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."TransactionReason" AS ENUM ('POINT_ISSUED', 'POINT_REWARD', 'ONBOARDING', 'DONATION', 'GRANT', 'TICKET_PURCHASED', 'TICKET_REFUNDED', 'OPPORTUNITY_RESERVATION_CREATED', 'OPPORTUNITY_RESERVATION_CANCELED', 'OPPORTUNITY_RESERVATION_REJECTED');

-- CreateEnum
CREATE TYPE "public"."Position" AS ENUM ('LEFT', 'RIGHT');

-- CreateTable
CREATE TABLE "public"."t_images" (
    "id" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL,
    "url" TEXT NOT NULL,
    "original_url" TEXT,
    "bucket" TEXT NOT NULL,
    "folder_path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "mime" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "alt" TEXT,
    "caption" TEXT,
    "strapi_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."m_states" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,

    CONSTRAINT "m_states_pkey" PRIMARY KEY ("code","country_code")
);

-- CreateTable
CREATE TABLE "public"."m_cities" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,

    CONSTRAINT "m_cities_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "public"."t_places" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(65,30) NOT NULL,
    "longitude" DECIMAL(65,30) NOT NULL,
    "image_id" TEXT,
    "is_manual" BOOLEAN NOT NULL,
    "google_place_id" TEXT,
    "map_location" JSONB,
    "city_code" TEXT NOT NULL,
    "community_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "point_name" TEXT NOT NULL,
    "bio" TEXT,
    "established_at" TIMESTAMP(3),
    "website" TEXT,
    "image_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_community_configs" (
    "id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_community_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_community_firebase_configs" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_community_firebase_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_community_line_configs" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "channel_secret" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "liff_id" TEXT NOT NULL,
    "liff_base_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_community_line_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_community_line_rich_menus" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "type" "public"."LineRichMenuType" NOT NULL,
    "rich_menu_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_community_line_rich_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "sys_role" "public"."SysRole" NOT NULL DEFAULT 'USER',
    "current_prefecture" "public"."CurrentPrefecture" NOT NULL,
    "phone_number" TEXT,
    "url_website" TEXT,
    "url_x" TEXT,
    "url_facebook" TEXT,
    "url_instagram" TEXT,
    "url_youtube" TEXT,
    "url_tiktok" TEXT,
    "image_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_identities" (
    "uid" TEXT NOT NULL,
    "platform" "public"."IdentityPlatform" NOT NULL,
    "user_id" TEXT NOT NULL,
    "community_id" TEXT,
    "auth_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_identities_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "public"."t_did_issuance_requests" (
    "id" TEXT NOT NULL,
    "status" "public"."DIDIssuanceStatus" NOT NULL DEFAULT 'PENDING',
    "job_id" TEXT,
    "did_value" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_did_issuance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_vc_issuance_requests" (
    "id" TEXT NOT NULL,
    "status" "public"."VCIssuanceStatus" NOT NULL DEFAULT 'PENDING',
    "job_id" TEXT,
    "vc_record_id" TEXT,
    "claims" JSONB NOT NULL,
    "credential_format" TEXT,
    "schema_id" TEXT,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "evaluation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_vc_issuance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_memberships" (
    "user_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "status" "public"."MembershipStatus" NOT NULL,
    "reason" "public"."MembershipStatusReason" NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_memberships_pkey" PRIMARY KEY ("user_id","community_id")
);

-- CreateTable
CREATE TABLE "public"."t_membership_histories" (
    "id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBER',
    "status" "public"."MembershipStatus" NOT NULL,
    "reason" "public"."MembershipStatusReason" NOT NULL,
    "user_id" TEXT NOT NULL,
    "community_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_membership_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_wallets" (
    "id" TEXT NOT NULL,
    "type" "public"."WalletType" NOT NULL DEFAULT 'MEMBER',
    "community_id" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "category" "public"."ArticleCategory" NOT NULL,
    "publish_status" "public"."PublishStatus" NOT NULL DEFAULT 'PUBLIC',
    "body" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "thumbnail_id" TEXT,
    "community_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_opportunities" (
    "id" TEXT NOT NULL,
    "publish_status" "public"."PublishStatus" NOT NULL DEFAULT 'PUBLIC',
    "require_approval" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "category" "public"."OpportunityCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "body" TEXT,
    "points_to_earn" INTEGER,
    "fee_required" INTEGER,
    "points_required" INTEGER,
    "community_id" TEXT,
    "place_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_opportunity_slots" (
    "id" TEXT NOT NULL,
    "hosting_status" "public"."OpportunitySlotHostingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER,
    "opportunity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_opportunity_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_reservations" (
    "id" TEXT NOT NULL,
    "opportunity_slot_id" TEXT NOT NULL,
    "comment" TEXT,
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'APPLIED',
    "participant_count_with_point" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_reservation_histories" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "status" "public"."ReservationStatus" NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_reservation_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_participations" (
    "id" TEXT NOT NULL,
    "source" "public"."Source" NOT NULL DEFAULT 'INTERNAL',
    "status" "public"."ParticipationStatus" NOT NULL DEFAULT 'PENDING',
    "reason" "public"."ParticipationStatusReason" NOT NULL,
    "description" TEXT,
    "user_id" TEXT,
    "opportunity_slot_id" TEXT,
    "reservation_id" TEXT,
    "community_id" TEXT,
    "evaluation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_participation_status_histories" (
    "id" TEXT NOT NULL,
    "participation_id" TEXT NOT NULL,
    "status" "public"."ParticipationStatus" NOT NULL,
    "reason" "public"."ParticipationStatusReason" NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_participation_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_evaluations" (
    "id" TEXT NOT NULL,
    "status" "public"."EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "credential_url" TEXT,
    "issued_at" TIMESTAMP(3),
    "participation_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_evaluation_histories" (
    "id" TEXT NOT NULL,
    "status" "public"."EvaluationStatus" NOT NULL,
    "comment" TEXT,
    "evaluation_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_evaluation_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_utilities" (
    "id" TEXT NOT NULL,
    "publish_status" "public"."PublishStatus" NOT NULL DEFAULT 'PUBLIC',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "points_required" INTEGER NOT NULL,
    "community_id" TEXT NOT NULL,
    "owner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_utilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_ticket_issuers" (
    "id" TEXT NOT NULL,
    "qty_to_be_issued" INTEGER NOT NULL DEFAULT 1,
    "utility_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_ticket_issuers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_ticket_claim_links" (
    "id" TEXT NOT NULL,
    "status" "public"."ClaimLinkStatus" NOT NULL DEFAULT 'ISSUED',
    "qty" INTEGER NOT NULL DEFAULT 0,
    "issuer_id" TEXT NOT NULL,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_ticket_claim_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_tickets" (
    "id" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'AVAILABLE',
    "reason" "public"."TicketStatusReason" NOT NULL DEFAULT 'GIFTED',
    "wallet_id" TEXT NOT NULL,
    "utility_id" TEXT NOT NULL,
    "claim_link_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_ticket_status_histories" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'AVAILABLE',
    "reason" "public"."TicketStatusReason" NOT NULL DEFAULT 'PURCHASED',
    "transaction_id" TEXT,
    "participation_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_ticket_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_transactions" (
    "id" TEXT NOT NULL,
    "reason" "public"."TransactionReason" NOT NULL,
    "from" TEXT,
    "from_point_change" INTEGER NOT NULL,
    "to" TEXT,
    "to_point_change" INTEGER NOT NULL,
    "participation_id" TEXT,
    "reservation_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."m_api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "m_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_nft_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_nft_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_nft_tokens" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "symbol" TEXT,
    "type" TEXT NOT NULL,
    "json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "t_nft_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_nft_instances" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "nft_wallet_id" TEXT NOT NULL,
    "nft_token_id" TEXT,

    CONSTRAINT "t_nft_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_merkle_commits" (
    "id" TEXT NOT NULL,
    "rootHash" TEXT NOT NULL,
    "label" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "committed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "t_merkle_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."t_merkle_proofs" (
    "id" TEXT NOT NULL,
    "txId" TEXT NOT NULL,
    "commitId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "sibling" TEXT NOT NULL,
    "position" "public"."Position" NOT NULL,

    CONSTRAINT "t_merkle_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_t_images_on_opportunities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_t_images_on_opportunities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_t_images_on_participations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_t_images_on_participations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_t_images_on_utilities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_t_images_on_utilities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_t_author_users_on_articles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_t_author_users_on_articles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_t_related_users_on_articles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_t_related_users_on_articles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_t_opportunities_on_articles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_t_opportunities_on_articles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_t_required_opportunities_on_utilities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_t_required_opportunities_on_utilities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_community_configs_community_id_key" ON "public"."t_community_configs"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_community_firebase_configs_config_id_key" ON "public"."t_community_firebase_configs"("config_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_community_line_configs_config_id_key" ON "public"."t_community_line_configs"("config_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_community_line_rich_menus_config_id_type_key" ON "public"."t_community_line_rich_menus"("config_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "t_vc_issuance_requests_evaluation_id_key" ON "public"."t_vc_issuance_requests"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_evaluations_participation_id_key" ON "public"."t_evaluations"("participation_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_ticket_claim_links_issuer_id_key" ON "public"."t_ticket_claim_links"("issuer_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_ticket_status_histories_transaction_id_key" ON "public"."t_ticket_status_histories"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "m_api_keys_key_key" ON "public"."m_api_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "t_nft_wallets_user_id_key" ON "public"."t_nft_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "t_nft_tokens_address_key" ON "public"."t_nft_tokens"("address");

-- CreateIndex
CREATE UNIQUE INDEX "t_nft_instances_nft_wallet_id_instance_id_key" ON "public"."t_nft_instances"("nft_wallet_id", "instance_id");

-- CreateIndex
CREATE INDEX "_t_images_on_opportunities_B_index" ON "public"."_t_images_on_opportunities"("B");

-- CreateIndex
CREATE INDEX "_t_images_on_participations_B_index" ON "public"."_t_images_on_participations"("B");

-- CreateIndex
CREATE INDEX "_t_images_on_utilities_B_index" ON "public"."_t_images_on_utilities"("B");

-- CreateIndex
CREATE INDEX "_t_author_users_on_articles_B_index" ON "public"."_t_author_users_on_articles"("B");

-- CreateIndex
CREATE INDEX "_t_related_users_on_articles_B_index" ON "public"."_t_related_users_on_articles"("B");

-- CreateIndex
CREATE INDEX "_t_opportunities_on_articles_B_index" ON "public"."_t_opportunities_on_articles"("B");

-- CreateIndex
CREATE INDEX "_t_required_opportunities_on_utilities_B_index" ON "public"."_t_required_opportunities_on_utilities"("B");

-- AddForeignKey
ALTER TABLE "public"."m_cities" ADD CONSTRAINT "m_cities_state_code_country_code_fkey" FOREIGN KEY ("state_code", "country_code") REFERENCES "public"."m_states"("code", "country_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_places" ADD CONSTRAINT "t_places_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."t_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_places" ADD CONSTRAINT "t_places_city_code_fkey" FOREIGN KEY ("city_code") REFERENCES "public"."m_cities"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_places" ADD CONSTRAINT "t_places_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_communities" ADD CONSTRAINT "t_communities_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."t_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_community_configs" ADD CONSTRAINT "t_community_configs_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_community_firebase_configs" ADD CONSTRAINT "t_community_firebase_configs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."t_community_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_community_line_configs" ADD CONSTRAINT "t_community_line_configs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."t_community_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_community_line_rich_menus" ADD CONSTRAINT "t_community_line_rich_menus_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."t_community_line_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_users" ADD CONSTRAINT "t_users_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."t_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_identities" ADD CONSTRAINT "t_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_identities" ADD CONSTRAINT "t_identities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_did_issuance_requests" ADD CONSTRAINT "t_did_issuance_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_vc_issuance_requests" ADD CONSTRAINT "t_vc_issuance_requests_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "public"."t_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_vc_issuance_requests" ADD CONSTRAINT "t_vc_issuance_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_memberships" ADD CONSTRAINT "t_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_memberships" ADD CONSTRAINT "t_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_membership_histories" ADD CONSTRAINT "t_membership_histories_user_id_community_id_fkey" FOREIGN KEY ("user_id", "community_id") REFERENCES "public"."t_memberships"("user_id", "community_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_membership_histories" ADD CONSTRAINT "t_membership_histories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_wallets" ADD CONSTRAINT "t_wallets_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_wallets" ADD CONSTRAINT "t_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_articles" ADD CONSTRAINT "t_articles_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."t_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_articles" ADD CONSTRAINT "t_articles_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_opportunities" ADD CONSTRAINT "t_opportunities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_opportunities" ADD CONSTRAINT "t_opportunities_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."t_places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_opportunities" ADD CONSTRAINT "t_opportunities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_opportunity_slots" ADD CONSTRAINT "t_opportunity_slots_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."t_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_reservations" ADD CONSTRAINT "t_reservations_opportunity_slot_id_fkey" FOREIGN KEY ("opportunity_slot_id") REFERENCES "public"."t_opportunity_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_reservations" ADD CONSTRAINT "t_reservations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_reservation_histories" ADD CONSTRAINT "t_reservation_histories_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."t_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_reservation_histories" ADD CONSTRAINT "t_reservation_histories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_participations" ADD CONSTRAINT "t_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_participations" ADD CONSTRAINT "t_participations_opportunity_slot_id_fkey" FOREIGN KEY ("opportunity_slot_id") REFERENCES "public"."t_opportunity_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_participations" ADD CONSTRAINT "t_participations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."t_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_participations" ADD CONSTRAINT "t_participations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_participation_status_histories" ADD CONSTRAINT "t_participation_status_histories_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "public"."t_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_participation_status_histories" ADD CONSTRAINT "t_participation_status_histories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_evaluations" ADD CONSTRAINT "t_evaluations_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "public"."t_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_evaluations" ADD CONSTRAINT "t_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_evaluation_histories" ADD CONSTRAINT "t_evaluation_histories_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "public"."t_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_evaluation_histories" ADD CONSTRAINT "t_evaluation_histories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_utilities" ADD CONSTRAINT "t_utilities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."t_communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_utilities" ADD CONSTRAINT "t_utilities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_ticket_issuers" ADD CONSTRAINT "t_ticket_issuers_utility_id_fkey" FOREIGN KEY ("utility_id") REFERENCES "public"."t_utilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_ticket_issuers" ADD CONSTRAINT "t_ticket_issuers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."t_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_ticket_claim_links" ADD CONSTRAINT "t_ticket_claim_links_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "public"."t_ticket_issuers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_tickets" ADD CONSTRAINT "t_tickets_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."t_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_tickets" ADD CONSTRAINT "t_tickets_utility_id_fkey" FOREIGN KEY ("utility_id") REFERENCES "public"."t_utilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_tickets" ADD CONSTRAINT "t_tickets_claim_link_id_fkey" FOREIGN KEY ("claim_link_id") REFERENCES "public"."t_ticket_claim_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_ticket_status_histories" ADD CONSTRAINT "t_ticket_status_histories_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."t_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_ticket_status_histories" ADD CONSTRAINT "t_ticket_status_histories_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."t_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_ticket_status_histories" ADD CONSTRAINT "t_ticket_status_histories_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "public"."t_participations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_ticket_status_histories" ADD CONSTRAINT "t_ticket_status_histories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_transactions" ADD CONSTRAINT "t_transactions_from_fkey" FOREIGN KEY ("from") REFERENCES "public"."t_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_transactions" ADD CONSTRAINT "t_transactions_to_fkey" FOREIGN KEY ("to") REFERENCES "public"."t_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_transactions" ADD CONSTRAINT "t_transactions_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "public"."t_participations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_transactions" ADD CONSTRAINT "t_transactions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."t_reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_transactions" ADD CONSTRAINT "t_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."t_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_nft_wallets" ADD CONSTRAINT "t_nft_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_nft_instances" ADD CONSTRAINT "t_nft_instances_nft_wallet_id_fkey" FOREIGN KEY ("nft_wallet_id") REFERENCES "public"."t_nft_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_nft_instances" ADD CONSTRAINT "t_nft_instances_nft_token_id_fkey" FOREIGN KEY ("nft_token_id") REFERENCES "public"."t_nft_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_merkle_proofs" ADD CONSTRAINT "t_merkle_proofs_txId_fkey" FOREIGN KEY ("txId") REFERENCES "public"."t_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."t_merkle_proofs" ADD CONSTRAINT "t_merkle_proofs_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "public"."t_merkle_commits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_images_on_opportunities" ADD CONSTRAINT "_t_images_on_opportunities_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."t_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_images_on_opportunities" ADD CONSTRAINT "_t_images_on_opportunities_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."t_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_images_on_participations" ADD CONSTRAINT "_t_images_on_participations_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."t_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_images_on_participations" ADD CONSTRAINT "_t_images_on_participations_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."t_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_images_on_utilities" ADD CONSTRAINT "_t_images_on_utilities_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."t_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_images_on_utilities" ADD CONSTRAINT "_t_images_on_utilities_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."t_utilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_author_users_on_articles" ADD CONSTRAINT "_t_author_users_on_articles_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."t_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_author_users_on_articles" ADD CONSTRAINT "_t_author_users_on_articles_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_related_users_on_articles" ADD CONSTRAINT "_t_related_users_on_articles_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."t_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_related_users_on_articles" ADD CONSTRAINT "_t_related_users_on_articles_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."t_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_opportunities_on_articles" ADD CONSTRAINT "_t_opportunities_on_articles_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."t_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_opportunities_on_articles" ADD CONSTRAINT "_t_opportunities_on_articles_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."t_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_required_opportunities_on_utilities" ADD CONSTRAINT "_t_required_opportunities_on_utilities_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."t_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_t_required_opportunities_on_utilities" ADD CONSTRAINT "_t_required_opportunities_on_utilities_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."t_utilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

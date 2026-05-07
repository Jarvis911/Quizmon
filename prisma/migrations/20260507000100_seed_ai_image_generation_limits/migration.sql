-- Data migration: add dedicated AI image generation limits per plan.
-- This does NOT create sample content; it only upserts PlanFeature rows.

INSERT INTO "PlanFeature" ("planId", "featureKey", "limit", "enabled")
SELECT p."id", 'AI_IMAGE_GENERATION'::"FeatureKey", 0, false
FROM "Plan" p
WHERE p."type" = 'FREE'::"PlanType"
ON CONFLICT ("planId", "featureKey") DO UPDATE
SET "limit" = EXCLUDED."limit",
    "enabled" = EXCLUDED."enabled";

INSERT INTO "PlanFeature" ("planId", "featureKey", "limit", "enabled")
SELECT p."id", 'AI_IMAGE_GENERATION'::"FeatureKey", 20, true
FROM "Plan" p
WHERE p."type" = 'TEACHER_PRO'::"PlanType"
ON CONFLICT ("planId", "featureKey") DO UPDATE
SET "limit" = EXCLUDED."limit",
    "enabled" = EXCLUDED."enabled";

INSERT INTO "PlanFeature" ("planId", "featureKey", "limit", "enabled")
SELECT p."id", 'AI_IMAGE_GENERATION'::"FeatureKey", 100, true
FROM "Plan" p
WHERE p."type" = 'SCHOOL'::"PlanType"
ON CONFLICT ("planId", "featureKey") DO UPDATE
SET "limit" = EXCLUDED."limit",
    "enabled" = EXCLUDED."enabled";

INSERT INTO "PlanFeature" ("planId", "featureKey", "limit", "enabled")
SELECT p."id", 'AI_IMAGE_GENERATION'::"FeatureKey", NULL, true
FROM "Plan" p
WHERE p."type" = 'ENTERPRISE'::"PlanType"
ON CONFLICT ("planId", "featureKey") DO UPDATE
SET "limit" = EXCLUDED."limit",
    "enabled" = EXCLUDED."enabled";


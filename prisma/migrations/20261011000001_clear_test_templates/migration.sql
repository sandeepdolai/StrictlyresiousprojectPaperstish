-- Pre-launch cleanup: remove only test community-template records.
-- There are no user websites to preserve at this stage. Published websites
-- live in Publication and are intentionally not touched.
DELETE FROM "CommunityTemplate";

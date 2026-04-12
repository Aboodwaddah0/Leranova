-- CreateTable
CREATE TABLE feature (
  id INT NOT NULL AUTO_INCREMENT,
  featureKey VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  hasLimit BOOLEAN NOT NULL DEFAULT false,
  defaultLimit INT NULL,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (id),
  UNIQUE INDEX uq_feature_feature_key(featureKey),
  INDEX idx_feature_feature_key(featureKey)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE plan_feature (
  id INT NOT NULL AUTO_INCREMENT,
  planId INT NOT NULL,
  featureId INT NOT NULL,
  featureLimit INT NULL,
  createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (id),
  UNIQUE INDEX uq_plan_feature_plan_feature(planId, featureId),
  INDEX idx_plan_feature_plan_id(planId),
  INDEX idx_plan_feature_feature_id(featureId),
  CONSTRAINT fk_plan_feature_plan
    FOREIGN KEY (planId) REFERENCES plan(id)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_plan_feature_feature
    FOREIGN KEY (featureId) REFERENCES feature(id)
    ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed core feature catalog
INSERT INTO feature (featureKey, name, description, hasLimit, defaultLimit)
VALUES
  ('AI_CHAT', 'AI Chat', 'AI powered assistant access', false, NULL),
  ('GROUP_CHAT', 'Group Chat', 'Group messaging and rooms', false, NULL),
  ('NOTIFICATIONS', 'Notifications', 'System notifications and alerts', false, NULL),
  ('ANALYTICS', 'Analytics', 'Advanced analytics dashboards', false, NULL),
  ('REPORTS', 'Reports', 'Reports and exports', false, NULL),
  ('MAX_USERS', 'Max Users', 'Maximum allowed users', true, 50)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  hasLimit = VALUES(hasLimit),
  defaultLimit = VALUES(defaultLimit),
  updatedAt = CURRENT_TIMESTAMP(0);

-- Backfill feature rows from legacy plan.features JSON arrays
INSERT INTO feature (featureKey, name, description, hasLimit, defaultLimit)
SELECT DISTINCT
  UPPER(TRIM(j.feature_name)) AS featureKey,
  REPLACE(UPPER(TRIM(j.feature_name)), '_', ' ') AS name,
  NULL AS description,
  false AS hasLimit,
  NULL AS defaultLimit
FROM plan p
JOIN JSON_TABLE(
  CASE
    WHEN JSON_TYPE(p.features) = 'ARRAY' THEN p.features
    ELSE JSON_ARRAY()
  END,
  '$[*]' COLUMNS (
    feature_name VARCHAR(100) PATH '$'
  )
) AS j
WHERE p.features IS NOT NULL
ON DUPLICATE KEY UPDATE
  updatedAt = CURRENT_TIMESTAMP(0);

-- Backfill plan-to-feature assignments from legacy JSON arrays
INSERT IGNORE INTO plan_feature (planId, featureId, featureLimit)
SELECT DISTINCT
  p.id AS planId,
  f.id AS featureId,
  NULL AS featureLimit
FROM plan p
JOIN JSON_TABLE(
  CASE
    WHEN JSON_TYPE(p.features) = 'ARRAY' THEN p.features
    ELSE JSON_ARRAY()
  END,
  '$[*]' COLUMNS (
    feature_name VARCHAR(100) PATH '$'
  )
) AS j
JOIN feature f
  ON f.featureKey = UPPER(TRIM(j.feature_name)) COLLATE utf8mb4_unicode_ci
WHERE p.features IS NOT NULL;
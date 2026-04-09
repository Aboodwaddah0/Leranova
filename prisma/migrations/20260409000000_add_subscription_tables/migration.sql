-- CreateTable plan
CREATE TABLE `plan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `description` TEXT,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_plan_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable subscription
CREATE TABLE `subscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organizationId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `startDate` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `endDate` TIMESTAMP(0) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `autoRenew` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_subscription_org_id`(`organizationId`),
    INDEX `idx_subscription_plan_id`(`planId`),
    INDEX `idx_subscription_status`(`status`),
    INDEX `idx_subscription_end_date`(`endDate`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_subscription_org` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_subscription_plan` FOREIGN KEY (`planId`) REFERENCES `plan` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable payment
CREATE TABLE `payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriptionId` INTEGER,
    `organizationId` INTEGER NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `paymentDate` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `paymentMethod` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_payment_org_id`(`organizationId`),
    INDEX `idx_payment_subscription_id`(`subscriptionId`),
    INDEX `idx_payment_status`(`status`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_payment_org` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT `fk_payment_subscription` FOREIGN KEY (`subscriptionId`) REFERENCES `subscription` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add index to organization
ALTER TABLE `organization` ADD INDEX `idx_org_status`(`status`);

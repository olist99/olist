/*
 Navicat Premium Dump SQL

 Source Server         : localhost_3306
 Source Server Type    : MySQL
 Source Server Version : 80045 (8.0.45)
 Source Host           : localhost:3306
 Source Schema         : arcturus

 Target Server Type    : MySQL
 Target Server Version : 80045 (8.0.45)
 File Encoding         : 65001

 Date: 16/03/2026 07:40:51
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for achievements
-- ----------------------------
DROP TABLE IF EXISTS `achievements`;
CREATE TABLE `achievements`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'ACH_',
  `category` enum('identity','explore','music','social','games','room_builder','pets','tools','events') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'identity',
  `level` int NOT NULL DEFAULT 1,
  `reward_amount` int NOT NULL DEFAULT 100,
  `reward_type` int NOT NULL DEFAULT 0,
  `points` int NULL DEFAULT 10,
  `progress_needed` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`name`, `level`) USING BTREE,
  UNIQUE INDEX `id`(`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 2762 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for achievements_talents
-- ----------------------------
DROP TABLE IF EXISTS `achievements_talents`;
CREATE TABLE `achievements_talents`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('citizenship','helper') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'citizenship',
  `level` int NOT NULL DEFAULT 0,
  `achievement_ids` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `achievement_levels` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `reward_furni` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `reward_perks` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `reward_badges` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for bans
-- ----------------------------
DROP TABLE IF EXISTS `bans`;
CREATE TABLE `bans`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ip` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `machine_id` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `user_staff_id` int NOT NULL,
  `timestamp` int NOT NULL,
  `ban_expire` int NOT NULL DEFAULT 0,
  `ban_reason` varchar(200) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `type` enum('account','ip','machine','super') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'account' COMMENT 'Account is the entry in the users table banned.\nIP is any client that connects with that IP.\nMachine is the computer that logged in.\nSuper is all of the above.',
  `cfh_topic` int NOT NULL DEFAULT -1,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `user_data`(`user_id` ASC, `ip` ASC, `machine_id` ASC, `ban_expire` ASC, `timestamp` ASC, `ban_reason` ASC) USING BTREE,
  INDEX `general`(`id` ASC, `type` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for bot_serves
-- ----------------------------
DROP TABLE IF EXISTS `bot_serves`;
CREATE TABLE `bot_serves`  (
  `keys` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `item` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for bots
-- ----------------------------
DROP TABLE IF EXISTS `bots`;
CREATE TABLE `bots`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT 0,
  `room_id` int NOT NULL DEFAULT 0,
  `name` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `motto` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `figure` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `gender` enum('M','F') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'M',
  `x` int NOT NULL DEFAULT 0,
  `y` int NOT NULL DEFAULT 0,
  `z` double(11, 1) NOT NULL DEFAULT 0.0,
  `rot` int NOT NULL DEFAULT 0,
  `chat_lines` varchar(5112) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `chat_auto` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `chat_random` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `chat_delay` int NOT NULL DEFAULT 5,
  `dance` int NOT NULL DEFAULT 0,
  `freeroam` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `type` enum('generic','visitor_log','bartender','weapons_dealer') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'generic',
  `effect` int NOT NULL DEFAULT 0,
  `bubble_id` int NULL DEFAULT 31,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `general_data`(`id` ASC, `user_id` ASC, `room_id` ASC, `name` ASC, `motto` ASC, `gender` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for calendar_campaigns
-- ----------------------------
DROP TABLE IF EXISTS `calendar_campaigns`;
CREATE TABLE `calendar_campaigns`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `start_timestamp` int NOT NULL DEFAULT 0,
  `total_days` int NOT NULL DEFAULT 30,
  `lock_expired` enum('1','0') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '1',
  `enabled` enum('1','0') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '1',
  UNIQUE INDEX `id`(`id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for calendar_rewards
-- ----------------------------
DROP TABLE IF EXISTS `calendar_rewards`;
CREATE TABLE `calendar_rewards`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaign_id` int NOT NULL DEFAULT 0,
  `product_name` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `custom_image` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `credits` int NOT NULL DEFAULT 0,
  `pixels` int NOT NULL DEFAULT 0,
  `points` int NOT NULL DEFAULT 0,
  `points_type` int NOT NULL DEFAULT 0,
  `badge` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `item_id` int NOT NULL DEFAULT 0,
  `subscription_type` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT '',
  `subscription_days` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for calendar_rewards_claimed
-- ----------------------------
DROP TABLE IF EXISTS `calendar_rewards_claimed`;
CREATE TABLE `calendar_rewards_claimed`  (
  `user_id` int NOT NULL,
  `campaign_id` int NOT NULL DEFAULT 0,
  `day` int NOT NULL,
  `reward_id` int NOT NULL,
  `timestamp` int NOT NULL
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for camera_web
-- ----------------------------
DROP TABLE IF EXISTS `camera_web`;
CREATE TABLE `camera_web`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `room_id` int NOT NULL DEFAULT 0,
  `timestamp` int NOT NULL,
  `url` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `id`(`id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_clothing
-- ----------------------------
DROP TABLE IF EXISTS `catalog_clothing`;
CREATE TABLE `catalog_clothing`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(75) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `setid` varchar(75) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 845 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_club_offers
-- ----------------------------
DROP TABLE IF EXISTS `catalog_club_offers`;
CREATE TABLE `catalog_club_offers`  (
  `id` int NOT NULL,
  `enabled` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `name` varchar(35) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `days` int NOT NULL,
  `credits` int NOT NULL DEFAULT 10,
  `points` int NOT NULL DEFAULT 0,
  `points_type` int NOT NULL DEFAULT 0,
  `type` enum('HC','VIP') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'HC',
  `deal` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `giftable` enum('1','0') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_featured_pages
-- ----------------------------
DROP TABLE IF EXISTS `catalog_featured_pages`;
CREATE TABLE `catalog_featured_pages`  (
  `slot_id` int NOT NULL,
  `image` varchar(70) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `caption` varchar(130) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `type` enum('page_name','page_id','product_name') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'page_name',
  `expire_timestamp` int NOT NULL DEFAULT -1,
  `page_name` varchar(30) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `page_id` int NOT NULL DEFAULT 0,
  `product_name` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`slot_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_items
-- ----------------------------
DROP TABLE IF EXISTS `catalog_items`;
CREATE TABLE `catalog_items`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_ids` varchar(666) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `page_id` int NOT NULL DEFAULT 14,
  `offer_id` int NOT NULL DEFAULT -1,
  `song_id` int UNSIGNED NOT NULL DEFAULT 0,
  `order_number` int NOT NULL DEFAULT 1,
  `catalog_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '0',
  `cost_credits` int NOT NULL DEFAULT 3,
  `cost_points` int NOT NULL DEFAULT 0,
  `points_type` int NOT NULL DEFAULT 0 COMMENT '0 for duckets; 5 for diamonds; and any seasonal/GOTW currencies you have in your emu_settings table.',
  `amount` int NOT NULL DEFAULT 1,
  `limited_sells` int NOT NULL DEFAULT 0 COMMENT 'This automatically logs from the emu; do not change it.',
  `limited_stack` int NOT NULL DEFAULT 0 COMMENT 'Change this number to make the item limited.',
  `extradata` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `badge` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `have_offer` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `club_only` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `rate` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`, `extradata`) USING BTREE,
  INDEX `page_id`(`page_id` ASC) USING BTREE,
  INDEX `catalog_name`(`catalog_name` ASC) USING BTREE,
  INDEX `costs`(`cost_credits` ASC, `cost_points` ASC, `points_type` ASC) USING BTREE,
  INDEX `id`(`id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1996671443 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_items_bc
-- ----------------------------
DROP TABLE IF EXISTS `catalog_items_bc`;
CREATE TABLE `catalog_items_bc`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_ids` varchar(666) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `page_id` int NOT NULL,
  `catalog_name` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `order_number` int NOT NULL DEFAULT 1,
  `extradata` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_items_limited
-- ----------------------------
DROP TABLE IF EXISTS `catalog_items_limited`;
CREATE TABLE `catalog_items_limited`  (
  `catalog_item_id` int NOT NULL,
  `number` int NOT NULL,
  `user_id` int NOT NULL DEFAULT 0,
  `timestamp` int NOT NULL DEFAULT 0,
  `item_id` int NOT NULL DEFAULT 0,
  UNIQUE INDEX `catalog_item_id`(`catalog_item_id`, `number`) USING BTREE,
  INDEX `user_timestamp_index`(`user_id`, `timestamp`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for catalog_pages
-- ----------------------------
DROP TABLE IF EXISTS `catalog_pages`;
CREATE TABLE `catalog_pages`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL DEFAULT -1,
  `caption_save` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `caption` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `page_layout` enum('default_3x3','club_buy','club_gift','frontpage','spaces','recycler','recycler_info','recycler_prizes','trophies','plasto','marketplace','marketplace_own_items','spaces_new','soundmachine','guilds','guild_furni','info_duckets','info_rentables','info_pets','roomads','single_bundle','sold_ltd_items','badge_display','bots','pets','pets2','pets3','productpage1','room_bundle','recent_purchases','default_3x3_color_grouping','guild_forum','vip_buy','info_loyalty','loyalty_vip_buy','collectibles','petcustomization','frontpage_featured') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'default_3x3',
  `icon_color` int NOT NULL DEFAULT 1,
  `icon_image` int NOT NULL DEFAULT 1,
  `min_rank` int NOT NULL DEFAULT 1,
  `order_num` int NOT NULL DEFAULT 1,
  `visible` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `enabled` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `club_only` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `vip_only` enum('1','0') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `page_headline` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `page_teaser` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `page_special` varchar(2048) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT '' COMMENT 'Gold Bubble: catalog_special_txtbg1 // Speech Bubble: catalog_special_txtbg2 // Place normal text in page_text_teaser',
  `page_text1` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `page_text2` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `page_text_details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `page_text_teaser` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `room_id` int NULL DEFAULT 0,
  `includes` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '' COMMENT 'Example usage: 1;2;3\r\n This will include page 1, 2 and 3 in the current page.\r\n Note that permissions are only used for the current entry.',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `id`(`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 9965779 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_pages_bc
-- ----------------------------
DROP TABLE IF EXISTS `catalog_pages_bc`;
CREATE TABLE `catalog_pages_bc`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL DEFAULT -1,
  `caption` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `page_layout` enum('default_3x3','club_buy','club_gift','frontpage','spaces','recycler','recycler_info','recycler_prizes','trophies','plasto','marketplace','marketplace_own_items','spaces_new','soundmachine','guilds','guild_furni','info_duckets','info_rentables','info_pets','roomads','single_bundle','sold_ltd_items','badge_display','bots','pets','pets2','pets3','productpage1','room_bundle','recent_purchases','default_3x3_color_grouping','guild_forum','vip_buy','info_loyalty','loyalty_vip_buy','collectibles','petcustomization','frontpage_featured') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'default_3x3',
  `icon_color` int NOT NULL DEFAULT 1,
  `icon_image` int NOT NULL DEFAULT 1,
  `order_num` int NOT NULL DEFAULT 1,
  `visible` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `enabled` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `page_headline` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `page_teaser` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `page_special` varchar(2048) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT '' COMMENT 'Gold Bubble: catalog_special_txtbg1 // Speech Bubble: catalog_special_txtbg2 // Place normal text in page_text_teaser',
  `page_text1` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL,
  `page_text2` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL,
  `page_text_details` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL,
  `page_text_teaser` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 3 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for catalog_target_offers
-- ----------------------------
DROP TABLE IF EXISTS `catalog_target_offers`;
CREATE TABLE `catalog_target_offers`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `offer_code` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `title` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `description` varchar(2048) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `image` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `icon` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `end_timestamp` int NOT NULL,
  `credits` int NOT NULL DEFAULT 10,
  `points` int NOT NULL DEFAULT 10,
  `points_type` int NOT NULL DEFAULT 5,
  `purchase_limit` int NOT NULL DEFAULT 5,
  `catalog_item` int NOT NULL,
  `vars` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '' COMMENT 'List of strings seperated by a ;',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for chat_bubbles
-- ----------------------------
DROP TABLE IF EXISTS `chat_bubbles`;
CREATE TABLE `chat_bubbles`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` int NOT NULL DEFAULT 0,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `bubble_id` int NOT NULL DEFAULT 0,
  `permission` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `overridable` tinyint(1) NOT NULL DEFAULT 1,
  `triggers_talking_furniture` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for chatlogs_private
-- ----------------------------
DROP TABLE IF EXISTS `chatlogs_private`;
CREATE TABLE `chatlogs_private`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_from_id` int NOT NULL,
  `user_to_id` int NOT NULL,
  `message` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `timestamp` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `id`(`id`) USING BTREE,
  INDEX `user_from_id`(`user_from_id`) USING BTREE,
  INDEX `user_to_id`(`user_to_id`) USING BTREE,
  INDEX `message`(`message`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for chatlogs_room
-- ----------------------------
DROP TABLE IF EXISTS `chatlogs_room`;
CREATE TABLE `chatlogs_room`  (
  `room_id` int NOT NULL DEFAULT 0,
  `user_from_id` int NOT NULL,
  `user_to_id` int NOT NULL DEFAULT 0,
  `message` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `timestamp` int NOT NULL,
  INDEX `user_from_id`(`user_from_id`) USING BTREE,
  INDEX `timestamp`(`timestamp`) USING BTREE,
  INDEX `user_to_id`(`user_to_id`) USING BTREE,
  INDEX `message`(`message`) USING BTREE,
  INDEX `room_id`(`room_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_admin_log
-- ----------------------------
DROP TABLE IF EXISTS `cms_admin_log`;
CREATE TABLE `cms_admin_log`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `admin_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `target_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `target_id` int NULL DEFAULT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `ip` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_admin`(`admin_id` ASC) USING BTREE,
  INDEX `idx_created`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_auction_bids
-- ----------------------------
DROP TABLE IF EXISTS `cms_auction_bids`;
CREATE TABLE `cms_auction_bids`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `auction_id` int UNSIGNED NOT NULL,
  `user_id` int NOT NULL,
  `amount` int UNSIGNED NOT NULL,
  `currency` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'credits',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uniq_user_auction`(`auction_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_auction`(`auction_id` ASC) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_auctions
-- ----------------------------
DROP TABLE IF EXISTS `cms_auctions`;
CREATE TABLE `cms_auctions`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `is_official` tinyint(1) NOT NULL DEFAULT 0,
  `item_id` int UNSIGNED NULL DEFAULT NULL COMMENT 'Held item from items table (user auctions)',
  `item_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `start_bid` int UNSIGNED NOT NULL DEFAULT 1,
  `currency` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'credits',
  `end_time` datetime NOT NULL,
  `created_by` int NOT NULL,
  `status` enum('active','ended') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_end_time`(`end_time` ASC) USING BTREE,
  INDEX `idx_created_by`(`created_by` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 15 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_badge_designs
-- ----------------------------
DROP TABLE IF EXISTS `cms_badge_designs`;
CREATE TABLE `cms_badge_designs`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `badge_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `layers` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'JSON array of badge layers',
  `approved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_camera_likes
-- ----------------------------
DROP TABLE IF EXISTS `cms_camera_likes`;
CREATE TABLE `cms_camera_likes`  (
  `photo_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`photo_id`, `user_id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_camera_photos
-- ----------------------------
DROP TABLE IF EXISTS `cms_camera_photos`;
CREATE TABLE `cms_camera_photos`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `photo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `room_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  INDEX `idx_created`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_campaigns
-- ----------------------------
DROP TABLE IF EXISTS `cms_campaigns`;
CREATE TABLE `cms_campaigns`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `active` tinyint(1) NULL DEFAULT 1,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_case_items
-- ----------------------------
DROP TABLE IF EXISTS `cms_case_items`;
CREATE TABLE `cms_case_items`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `case_id` int UNSIGNED NOT NULL,
  `name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `rarity` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'common',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `reward_furni_base_id` int UNSIGNED NULL DEFAULT NULL,
  `drop_chance` decimal(8, 3) NOT NULL DEFAULT 10.000,
  `reward_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'credits',
  `reward_amount` int NOT NULL DEFAULT 0,
  `reward_badge` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_case`(`case_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 140 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_cases
-- ----------------------------
DROP TABLE IF EXISTS `cms_cases`;
CREATE TABLE `cms_cases`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `price` int UNSIGNED NOT NULL DEFAULT 100,
  `active` tinyint(1) NULL DEFAULT 1,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 34 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_coinflip_battles
-- ----------------------------
DROP TABLE IF EXISTS `cms_coinflip_battles`;
CREATE TABLE `cms_coinflip_battles`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `creator_id` int NOT NULL,
  `opponent_id` int NULL DEFAULT NULL,
  `bet` int UNSIGNED NOT NULL,
  `creator_choice` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `result` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `winner_id` int NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'waiting',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 28 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_content_reports
-- ----------------------------
DROP TABLE IF EXISTS `cms_content_reports`;
CREATE TABLE `cms_content_reports`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `reporter_id` int UNSIGNED NOT NULL,
  `content_type` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'post' COMMENT 'post, thread, profile, guestbook, etc.',
  `content_id` int UNSIGNED NOT NULL,
  `target_id` int UNSIGNED NULL DEFAULT NULL COMMENT 'User ID of the content author',
  `reason` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `status` enum('pending','resolved','dismissed') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending',
  `resolved_by` int UNSIGNED NULL DEFAULT NULL,
  `resolved_at` datetime NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_reporter_id`(`reporter_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_contest_entries
-- ----------------------------
DROP TABLE IF EXISTS `cms_contest_entries`;
CREATE TABLE `cms_contest_entries`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `contest_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `entry_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `ux_contest_user`(`contest_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_contest_id`(`contest_id` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_contests
-- ----------------------------
DROP TABLE IF EXISTS `cms_contests`;
CREATE TABLE `cms_contests`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `prize` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `end_date` datetime NOT NULL,
  `status` enum('open','closed','archived') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'open',
  `created_by` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_end_date`(`end_date` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_credit_log
-- ----------------------------
DROP TABLE IF EXISTS `cms_credit_log`;
CREATE TABLE `cms_credit_log`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `admin_id` int UNSIGNED NULL DEFAULT NULL COMMENT 'NULL = system/automated',
  `currency` enum('credits','pixels','points') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'credits',
  `amount` int NOT NULL COMMENT 'Positive = give, negative = take',
  `balance_after` int NULL DEFAULT NULL,
  `reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_custom_badges
-- ----------------------------
DROP TABLE IF EXISTS `cms_custom_badges`;
CREATE TABLE `cms_custom_badges`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `badge_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `image_data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_daily_claims
-- ----------------------------
DROP TABLE IF EXISTS `cms_daily_claims`;
CREATE TABLE `cms_daily_claims`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `streak_day` int NOT NULL DEFAULT 1,
  `claimed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 60 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_daily_rewards
-- ----------------------------
DROP TABLE IF EXISTS `cms_daily_rewards`;
CREATE TABLE `cms_daily_rewards`  (
  `day` int NOT NULL,
  `label` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `credits` int NULL DEFAULT 0,
  `pixels` int NULL DEFAULT 0,
  `points` int NULL DEFAULT 0,
  PRIMARY KEY (`day`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_duel_rooms
-- ----------------------------
DROP TABLE IF EXISTS `cms_duel_rooms`;
CREATE TABLE `cms_duel_rooms`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `game_type` enum('dice','highcard') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `mode` enum('2way','3way','4way') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '2way',
  `bet` int NOT NULL,
  `player1_id` int NOT NULL,
  `player2_id` int NULL DEFAULT NULL,
  `player3_id` int NULL DEFAULT NULL,
  `player4_id` int NULL DEFAULT NULL,
  `status` enum('waiting','done','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'waiting',
  `result` json NULL COMMENT 'Stores roll/card results per player',
  `winner_id` int NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_game`(`game_type` ASC) USING BTREE,
  INDEX `idx_player1`(`player1_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_events
-- ----------------------------
DROP TABLE IF EXISTS `cms_events`;
CREATE TABLE `cms_events`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `location` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `event_date` datetime NOT NULL,
  `end_date` datetime NULL DEFAULT NULL,
  `staff_id` int NOT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_date`(`event_date` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_forum_categories
-- ----------------------------
DROP TABLE IF EXISTS `cms_forum_categories`;
CREATE TABLE `cms_forum_categories`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `icon` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '?',
  `min_rank` int NOT NULL DEFAULT 0,
  `post_min_rank` int NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_forum_likes
-- ----------------------------
DROP TABLE IF EXISTS `cms_forum_likes`;
CREATE TABLE `cms_forum_likes`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `target_type` enum('thread','reply') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `target_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_like`(`user_id` ASC, `target_type` ASC, `target_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_forum_posts
-- ----------------------------
DROP TABLE IF EXISTS `cms_forum_posts`;
CREATE TABLE `cms_forum_posts`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `thread_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_thread_id`(`thread_id` ASC) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_forum_replies
-- ----------------------------
DROP TABLE IF EXISTS `cms_forum_replies`;
CREATE TABLE `cms_forum_replies`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` int NOT NULL,
  `user_id` int NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `thread_id`(`thread_id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_forum_threads
-- ----------------------------
DROP TABLE IF EXISTS `cms_forum_threads`;
CREATE TABLE `cms_forum_threads`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `pinned` tinyint(1) NOT NULL DEFAULT 0,
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `views` int NOT NULL DEFAULT 0,
  `reply_count` int NOT NULL DEFAULT 0,
  `last_reply_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_reply_user_id` int NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `category_id`(`category_id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_gambling_log
-- ----------------------------
DROP TABLE IF EXISTS `cms_gambling_log`;
CREATE TABLE `cms_gambling_log`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `game` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `bet` int UNSIGNED NOT NULL DEFAULT 0,
  `profit` int NOT NULL DEFAULT 0,
  `detail` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  INDEX `idx_game`(`game` ASC) USING BTREE,
  INDEX `idx_created`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 928 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_guestbook_entries
-- ----------------------------
DROP TABLE IF EXISTS `cms_guestbook_entries`;
CREATE TABLE `cms_guestbook_entries`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `profile_id` int UNSIGNED NOT NULL COMMENT 'User whose profile guestbook this belongs to',
  `author_id` int UNSIGNED NOT NULL COMMENT 'User who wrote the message',
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_profile_id`(`profile_id` ASC) USING BTREE,
  INDEX `idx_author_id`(`author_id` ASC) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_login_history
-- ----------------------------
DROP TABLE IF EXISTS `cms_login_history`;
CREATE TABLE `cms_login_history`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `user_agent` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 25 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_marketplace
-- ----------------------------
DROP TABLE IF EXISTS `cms_marketplace`;
CREATE TABLE `cms_marketplace`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `seller_id` int NOT NULL,
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `item_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `item_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `item_id` int UNSIGNED NULL DEFAULT NULL,
  `item_base_id` int UNSIGNED NULL DEFAULT NULL,
  `price` int UNSIGNED NOT NULL,
  `currency` enum('credits','pixels','points') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'credits',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'Furni',
  `quantity` int UNSIGNED NULL DEFAULT 1,
  `status` enum('active','sold','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'active',
  `buyer_id` int NULL DEFAULT NULL,
  `sold_at` datetime NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_seller`(`seller_id` ASC) USING BTREE,
  INDEX `idx_buyer`(`buyer_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE,
  INDEX `idx_category`(`category` ASC) USING BTREE,
  INDEX `idx_item_base`(`item_base_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 53 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_marketplace_offers
-- ----------------------------
DROP TABLE IF EXISTS `cms_marketplace_offers`;
CREATE TABLE `cms_marketplace_offers`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `listing_id` int UNSIGNED NOT NULL,
  `buyer_id` int NOT NULL,
  `amount` int UNSIGNED NOT NULL,
  `currency` enum('credits','pixels','points') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'credits',
  `status` enum('pending','accepted','rejected','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'pending',
  `message` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_listing`(`listing_id` ASC) USING BTREE,
  INDEX `idx_buyer`(`buyer_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_marketplace_price_history
-- ----------------------------
DROP TABLE IF EXISTS `cms_marketplace_price_history`;
CREATE TABLE `cms_marketplace_price_history`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_base_id` int UNSIGNED NOT NULL COMMENT 'items_base.id',
  `item_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `price` int UNSIGNED NOT NULL,
  `currency` enum('credits','pixels','points') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'credits',
  `listing_id` int UNSIGNED NULL DEFAULT NULL,
  `sold_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_base_id`(`item_base_id` ASC) USING BTREE,
  INDEX `idx_item_name`(`item_name` ASC) USING BTREE,
  INDEX `idx_sold_at`(`sold_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 16 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_news
-- ----------------------------
DROP TABLE IF EXISTS `cms_news`;
CREATE TABLE `cms_news`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `slug` varchar(220) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `short_desc` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `tag` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'NEWS',
  `author_id` int NOT NULL,
  `views` int UNSIGNED NULL DEFAULT 0,
  `pinned` tinyint(1) NULL DEFAULT 0,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `slug`(`slug` ASC) USING BTREE,
  INDEX `idx_author`(`author_id` ASC) USING BTREE,
  INDEX `idx_created`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_news_comments
-- ----------------------------
DROP TABLE IF EXISTS `cms_news_comments`;
CREATE TABLE `cms_news_comments`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `news_id` int UNSIGNED NOT NULL,
  `user_id` int NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_news`(`news_id` ASC) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_news_reactions
-- ----------------------------
DROP TABLE IF EXISTS `cms_news_reactions`;
CREATE TABLE `cms_news_reactions`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `news_id` int UNSIGNED NOT NULL,
  `user_id` int NOT NULL,
  `reaction` enum('like','love','laugh','wow','sad') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'like',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uniq_user_news`(`news_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_notifications
-- ----------------------------
DROP TABLE IF EXISTS `cms_notifications`;
CREATE TABLE `cms_notifications`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'info',
  `message` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  INDEX `idx_read`(`is_read` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 57 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_plugins
-- ----------------------------
DROP TABLE IF EXISTS `cms_plugins`;
CREATE TABLE `cms_plugins`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `slug` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `version` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '1.0.0',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `active` tinyint(1) NOT NULL DEFAULT 0,
  `installed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `slug`(`slug` ASC) USING BTREE,
  INDEX `idx_active`(`active` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_quests
-- ----------------------------
DROP TABLE IF EXISTS `cms_quests`;
CREATE TABLE `cms_quests`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `category` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'General',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `goal_type` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'login',
  `goal_value` int UNSIGNED NOT NULL DEFAULT 1,
  `reward_type` enum('credits','pixels','points','badge') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'credits',
  `reward_amount` int UNSIGNED NOT NULL DEFAULT 0,
  `reward_badge` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `start_date` datetime NULL DEFAULT NULL,
  `end_date` datetime NULL DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_category`(`category` ASC) USING BTREE,
  INDEX `idx_active`(`active` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_rank_log
-- ----------------------------
DROP TABLE IF EXISTS `cms_rank_log`;
CREATE TABLE `cms_rank_log`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `admin_id` int UNSIGNED NOT NULL,
  `old_rank` tinyint UNSIGNED NOT NULL DEFAULT 1,
  `new_rank` tinyint UNSIGNED NOT NULL DEFAULT 1,
  `reason` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_rare_spawn_log
-- ----------------------------
DROP TABLE IF EXISTS `cms_rare_spawn_log`;
CREATE TABLE `cms_rare_spawn_log`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` int UNSIGNED NOT NULL,
  `admin_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `target_id` int UNSIGNED NOT NULL,
  `target_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `item_id` int UNSIGNED NOT NULL,
  `item_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `quantity` tinyint UNSIGNED NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_admin_id`(`admin_id` ASC) USING BTREE,
  INDEX `idx_target_id`(`target_id` ASC) USING BTREE,
  INDEX `idx_created_at`(`created_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_rare_value_history
-- ----------------------------
DROP TABLE IF EXISTS `cms_rare_value_history`;
CREATE TABLE `cms_rare_value_history`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `rare_id` int UNSIGNED NOT NULL,
  `item_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `old_credits` int UNSIGNED NOT NULL DEFAULT 0,
  `new_credits` int UNSIGNED NOT NULL DEFAULT 0,
  `old_pixels` int UNSIGNED NOT NULL DEFAULT 0,
  `new_pixels` int UNSIGNED NOT NULL DEFAULT 0,
  `changed_by` int UNSIGNED NULL DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_rare_id`(`rare_id` ASC) USING BTREE,
  INDEX `idx_changed_at`(`changed_at` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_rare_values
-- ----------------------------
DROP TABLE IF EXISTS `cms_rare_values`;
CREATE TABLE `cms_rare_values`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `item_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `item_image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `value` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `trend` enum('up','down','stable') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'stable',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'Furni',
  `is_new` tinyint(1) NULL DEFAULT 0,
  `color` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT '#4a6741',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 25 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_referrals
-- ----------------------------
DROP TABLE IF EXISTS `cms_referrals`;
CREATE TABLE `cms_referrals`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `referrer_id` int NOT NULL,
  `referred_id` int NOT NULL,
  `referral_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `reward_claimed` tinyint(1) NULL DEFAULT 0,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uniq_referred`(`referred_id` ASC) USING BTREE,
  INDEX `idx_referrer`(`referrer_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_settings
-- ----------------------------
DROP TABLE IF EXISTS `cms_settings`;
CREATE TABLE `cms_settings`  (
  `key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_shop_items
-- ----------------------------
DROP TABLE IF EXISTS `cms_shop_items`;
CREATE TABLE `cms_shop_items`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `image` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `price` int UNSIGNED NOT NULL,
  `currency` enum('credits','pixels','points') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'credits',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'General',
  `stock` int NULL DEFAULT -1,
  `give_badge` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `give_rank` int NULL DEFAULT NULL,
  `give_credits` int NULL DEFAULT 0,
  `give_pixels` int NULL DEFAULT 0,
  `give_points` int NULL DEFAULT 0,
  `active` tinyint(1) NULL DEFAULT 1,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_shop_purchases
-- ----------------------------
DROP TABLE IF EXISTS `cms_shop_purchases`;
CREATE TABLE `cms_shop_purchases`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int UNSIGNED NOT NULL,
  `price_paid` int UNSIGNED NOT NULL,
  `currency_used` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_ticket_messages
-- ----------------------------
DROP TABLE IF EXISTS `cms_ticket_messages`;
CREATE TABLE `cms_ticket_messages`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` int UNSIGNED NOT NULL,
  `user_id` int NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_staff` tinyint(1) NULL DEFAULT 0,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_ticket`(`ticket_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_ticket_replies
-- ----------------------------
DROP TABLE IF EXISTS `cms_ticket_replies`;
CREATE TABLE `cms_ticket_replies`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_staff` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_ticket_id`(`ticket_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_tickets
-- ----------------------------
DROP TABLE IF EXISTS `cms_tickets`;
CREATE TABLE `cms_tickets`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subject` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'general',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'open',
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user`(`user_id` ASC) USING BTREE,
  INDEX `idx_status`(`status` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for cms_user_warnings
-- ----------------------------
DROP TABLE IF EXISTS `cms_user_warnings`;
CREATE TABLE `cms_user_warnings`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `case_id` int UNSIGNED NULL DEFAULT NULL,
  `reason` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `issued_by` int UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cms_word_filter
-- ----------------------------
DROP TABLE IF EXISTS `cms_word_filter`;
CREATE TABLE `cms_word_filter`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `word` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `replacement` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '***',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `added_by` int UNSIGNED NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `ux_word`(`word` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for commandlogs
-- ----------------------------
DROP TABLE IF EXISTS `commandlogs`;
CREATE TABLE `commandlogs`  (
  `user_id` int NOT NULL,
  `timestamp` int NOT NULL,
  `command` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `params` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `succes` enum('no','yes') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'yes',
  INDEX `user_id`(`user_id`) USING BTREE,
  INDEX `user_data`(`user_id`, `timestamp`) USING BTREE,
  INDEX `command`(`command`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for crafting_altars_recipes
-- ----------------------------
DROP TABLE IF EXISTS `crafting_altars_recipes`;
CREATE TABLE `crafting_altars_recipes`  (
  `altar_id` int NOT NULL,
  `recipe_id` int NOT NULL,
  UNIQUE INDEX `altar_id`(`altar_id`, `recipe_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for crafting_recipes
-- ----------------------------
DROP TABLE IF EXISTS `crafting_recipes`;
CREATE TABLE `crafting_recipes`  (
  `id` int NOT NULL,
  `product_name` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'WARNING! This field must match a entry in your productdata or crafting WILL NOT WORK!',
  `reward` int NOT NULL,
  `enabled` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `achievement` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `secret` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `limited` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `remaining` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `id`(`id`) USING BTREE,
  UNIQUE INDEX `name`(`product_name`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for crafting_recipes_ingredients
-- ----------------------------
DROP TABLE IF EXISTS `crafting_recipes_ingredients`;
CREATE TABLE `crafting_recipes_ingredients`  (
  `recipe_id` int NOT NULL,
  `item_id` int NOT NULL,
  `amount` int NOT NULL DEFAULT 1
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for emulator_errors
-- ----------------------------
DROP TABLE IF EXISTS `emulator_errors`;
CREATE TABLE `emulator_errors`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` int NOT NULL DEFAULT 0,
  `version` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `build_hash` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `type` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'Exception',
  `stacktrace` blob NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for emulator_settings
-- ----------------------------
DROP TABLE IF EXISTS `emulator_settings`;
CREATE TABLE `emulator_settings`  (
  `key` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `value` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for emulator_texts
-- ----------------------------
DROP TABLE IF EXISTS `emulator_texts`;
CREATE TABLE `emulator_texts`  (
  `key` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `value` varchar(4096) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for gift_wrappers
-- ----------------------------
DROP TABLE IF EXISTS `gift_wrappers`;
CREATE TABLE `gift_wrappers`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `sprite_id` int NOT NULL,
  `item_id` int NOT NULL,
  `type` enum('gift','wrapper') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'wrapper',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 18 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for groups_items
-- ----------------------------
DROP TABLE IF EXISTS `groups_items`;
CREATE TABLE `groups_items`  (
  `type` enum('base','symbol','color','color2','color3') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `id` int NOT NULL,
  `firstvalue` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `secondvalue` varchar(2000) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `enabled` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`, `type`) USING BTREE,
  INDEX `type`(`type` ASC) USING BTREE,
  INDEX `id`(`id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for guild_forum_views
-- ----------------------------
DROP TABLE IF EXISTS `guild_forum_views`;
CREATE TABLE `guild_forum_views`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `guild_id` int NOT NULL,
  `timestamp` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for guilds
-- ----------------------------
DROP TABLE IF EXISTS `guilds`;
CREATE TABLE `guilds`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT 0,
  `name` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `description` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `room_id` int NOT NULL DEFAULT 0,
  `state` int NOT NULL DEFAULT 0,
  `rights` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `color_one` int NOT NULL DEFAULT 0,
  `color_two` int NOT NULL DEFAULT 0,
  `badge` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `date_created` int NOT NULL,
  `forum` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `read_forum` enum('EVERYONE','MEMBERS','ADMINS') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'EVERYONE',
  `post_messages` enum('EVERYONE','MEMBERS','ADMINS','OWNER') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'EVERYONE',
  `post_threads` enum('EVERYONE','MEMBERS','ADMINS','OWNER') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'EVERYONE',
  `mod_forum` enum('ADMINS','OWNER') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'ADMINS',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `id`(`id` ASC) USING BTREE,
  INDEX `data`(`room_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `name`(`name` ASC) USING BTREE,
  INDEX `description`(`description` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for guilds_elements
-- ----------------------------
DROP TABLE IF EXISTS `guilds_elements`;
CREATE TABLE `guilds_elements`  (
  `id` int NOT NULL,
  `firstvalue` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `secondvalue` varchar(300) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `type` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `enabled` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  UNIQUE INDEX `id`(`id` ASC, `type` ASC) USING BTREE,
  UNIQUE INDEX `data`(`id` ASC, `type` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for guilds_forums_comments
-- ----------------------------
DROP TABLE IF EXISTS `guilds_forums_comments`;
CREATE TABLE `guilds_forums_comments`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `thread_id` int NOT NULL DEFAULT 0,
  `user_id` int NOT NULL DEFAULT 0,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` int NOT NULL DEFAULT 0,
  `state` int NOT NULL DEFAULT 0,
  `admin_id` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `id`(`id` ASC) USING BTREE,
  INDEX `thread_data`(`thread_id` ASC, `user_id` ASC, `created_at` ASC, `state` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for guilds_forums_threads
-- ----------------------------
DROP TABLE IF EXISTS `guilds_forums_threads`;
CREATE TABLE `guilds_forums_threads`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `guild_id` int NULL DEFAULT 0,
  `opener_id` int NULL DEFAULT 0,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT '',
  `posts_count` int NULL DEFAULT 0,
  `created_at` int NULL DEFAULT 0,
  `updated_at` int NULL DEFAULT 0,
  `state` int NULL DEFAULT 0,
  `pinned` tinyint NULL DEFAULT 0,
  `locked` tinyint NULL DEFAULT 0,
  `admin_id` int NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for guilds_members
-- ----------------------------
DROP TABLE IF EXISTS `guilds_members`;
CREATE TABLE `guilds_members`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `guild_id` int NOT NULL DEFAULT 0,
  `user_id` int NOT NULL DEFAULT 0,
  `level_id` int NOT NULL DEFAULT 0,
  `member_since` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `id`(`id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE,
  INDEX `guild_id`(`guild_id` ASC) USING BTREE,
  INDEX `userdata`(`user_id` ASC, `guild_id` ASC) USING BTREE,
  INDEX `level_id`(`level_id` ASC) USING BTREE,
  INDEX `member_since`(`member_since` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for hotelview_news
-- ----------------------------
DROP TABLE IF EXISTS `hotelview_news`;
CREATE TABLE `hotelview_news`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `text` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `button_text` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `button_type` enum('client','web') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'web',
  `button_link` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `image` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for items
-- ----------------------------
DROP TABLE IF EXISTS `items`;
CREATE TABLE `items`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT 0,
  `room_id` int NOT NULL DEFAULT 0,
  `item_id` int NULL DEFAULT 0,
  `wall_pos` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `x` int NOT NULL DEFAULT 0,
  `y` int NOT NULL DEFAULT 0,
  `z` double(10, 6) NOT NULL DEFAULT 0.000000,
  `rot` int NOT NULL DEFAULT 0,
  `extra_data` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `wired_data` varchar(10000) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `limited_data` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0:0',
  `guild_id` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `room_id`(`user_id` ASC, `room_id` ASC) USING BTREE,
  INDEX `itemsdata`(`room_id` ASC, `item_id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE,
  INDEX `extra_data`(`extra_data` ASC) USING BTREE,
  INDEX `wired_data`(`wired_data`(3072) ASC) USING BTREE,
  INDEX `id`(`id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 375 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for items_base
-- ----------------------------
DROP TABLE IF EXISTS `items_base`;
CREATE TABLE `items_base`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `sprite_id` int NOT NULL DEFAULT 0,
  `item_name` varchar(70) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `public_name` varchar(56) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '0',
  `width` int NOT NULL DEFAULT 1,
  `length` int NOT NULL DEFAULT 1,
  `stack_height` double(4, 2) NOT NULL DEFAULT 0.00,
  `allow_stack` tinyint(1) NOT NULL DEFAULT 1,
  `allow_sit` tinyint(1) NOT NULL DEFAULT 0,
  `allow_lay` tinyint(1) NOT NULL DEFAULT 0,
  `allow_walk` tinyint(1) NOT NULL DEFAULT 0,
  `allow_gift` tinyint(1) NOT NULL DEFAULT 1,
  `allow_trade` tinyint(1) NOT NULL DEFAULT 1,
  `allow_recycle` tinyint(1) NOT NULL DEFAULT 0,
  `allow_marketplace_sell` tinyint(1) NOT NULL DEFAULT 0,
  `allow_inventory_stack` tinyint(1) NOT NULL DEFAULT 1,
  `type` varchar(3) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 's',
  `interaction_type` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'default',
  `interaction_modes_count` int NOT NULL DEFAULT 1,
  `vending_ids` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `multiheight` varchar(50) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `customparams` varchar(25600) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `effect_id_male` int NOT NULL DEFAULT 0,
  `effect_id_female` int NOT NULL DEFAULT 0,
  `clothing_on_walk` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `page_id` varchar(250) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `rare` enum('4','3','2','1','0') CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `sprite_id`(`sprite_id` ASC) USING BTREE,
  INDEX `type`(`type` ASC) USING BTREE,
  FULLTEXT INDEX `item_name`(`item_name`)
) ENGINE = InnoDB AUTO_INCREMENT = 1996663545 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for items_crackable
-- ----------------------------
DROP TABLE IF EXISTS `items_crackable`;
CREATE TABLE `items_crackable`  (
  `item_id` int NOT NULL,
  `item_name` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'Item name for identification',
  `count` int NOT NULL,
  `prizes` varchar(860) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '179:1' COMMENT 'Used in the format of item_id:chance;item_id_2:chance. item_id must be id in the items_base table. Default value for chance is 100.',
  `achievement_tick` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `achievement_cracked` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `required_effect` int NOT NULL DEFAULT 0,
  `subscription_duration` int NULL DEFAULT NULL,
  `subscription_type` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL COMMENT 'hc for Habbo Club, bc for Builders Club',
  PRIMARY KEY (`item_id`) USING BTREE,
  UNIQUE INDEX `id`(`item_id`) USING BTREE,
  INDEX `data`(`count`, `prizes`, `achievement_tick`, `achievement_cracked`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for items_highscore_data
-- ----------------------------
DROP TABLE IF EXISTS `items_highscore_data`;
CREATE TABLE `items_highscore_data`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `user_ids` varchar(500) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `score` int NOT NULL,
  `is_win` tinyint(1) NULL DEFAULT 0,
  `timestamp` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `id`(`id` ASC) USING BTREE,
  INDEX `data`(`item_id` ASC, `user_ids` ASC) USING BTREE,
  INDEX `status`(`is_win` ASC, `score` ASC, `timestamp` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for items_hoppers
-- ----------------------------
DROP TABLE IF EXISTS `items_hoppers`;
CREATE TABLE `items_hoppers`  (
  `item_id` int NOT NULL,
  `base_item` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for items_presents
-- ----------------------------
DROP TABLE IF EXISTS `items_presents`;
CREATE TABLE `items_presents`  (
  `item_id` int NOT NULL,
  `base_item_reward` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for items_teleports
-- ----------------------------
DROP TABLE IF EXISTS `items_teleports`;
CREATE TABLE `items_teleports`  (
  `teleport_one_id` int NOT NULL,
  `teleport_two_id` int NOT NULL,
  INDEX `teleport_one_id`(`teleport_one_id`) USING BTREE,
  INDEX `teleport_two_id`(`teleport_two_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for login_log
-- ----------------------------
DROP TABLE IF EXISTS `login_log`;
CREATE TABLE `login_log`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `ip` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '',
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_agent` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_user_id`(`user_id` ASC) USING BTREE,
  INDEX `idx_timestamp`(`timestamp` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for logs_hc_payday
-- ----------------------------
DROP TABLE IF EXISTS `logs_hc_payday`;
CREATE TABLE `logs_hc_payday`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `timestamp` int UNSIGNED NULL DEFAULT NULL,
  `user_id` int UNSIGNED NULL DEFAULT NULL,
  `hc_streak` int UNSIGNED NULL DEFAULT NULL,
  `total_coins_spent` int UNSIGNED NULL DEFAULT NULL,
  `reward_coins_spent` int UNSIGNED NULL DEFAULT NULL,
  `reward_streak` int UNSIGNED NULL DEFAULT NULL,
  `total_payout` int UNSIGNED NULL DEFAULT NULL,
  `currency` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `claimed` tinyint(1) NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `timestamp`(`timestamp` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for logs_shop_purchases
-- ----------------------------
DROP TABLE IF EXISTS `logs_shop_purchases`;
CREATE TABLE `logs_shop_purchases`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `timestamp` int UNSIGNED NULL DEFAULT NULL,
  `user_id` int UNSIGNED NULL DEFAULT NULL,
  `catalog_item_id` int UNSIGNED NULL DEFAULT NULL,
  `item_ids` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `catalog_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `cost_credits` int NULL DEFAULT NULL,
  `cost_points` int NULL DEFAULT NULL,
  `points_type` int NULL DEFAULT NULL,
  `amount` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `timestamp`(`timestamp` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for marketplace_items
-- ----------------------------
DROP TABLE IF EXISTS `marketplace_items`;
CREATE TABLE `marketplace_items`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `user_id` int NOT NULL,
  `price` int NOT NULL,
  `timestamp` int NOT NULL,
  `sold_timestamp` int NOT NULL DEFAULT 0,
  `state` int NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `itemdata`(`item_id`, `user_id`) USING BTREE,
  INDEX `price`(`price`) USING BTREE,
  INDEX `time`(`timestamp`, `sold_timestamp`) USING BTREE,
  INDEX `status`(`state`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for messenger_categories
-- ----------------------------
DROP TABLE IF EXISTS `messenger_categories`;
CREATE TABLE `messenger_categories`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_id` int NOT NULL,
  UNIQUE INDEX `identifier`(`id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for messenger_friendrequests
-- ----------------------------
DROP TABLE IF EXISTS `messenger_friendrequests`;
CREATE TABLE `messenger_friendrequests`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_to_id` int NOT NULL DEFAULT 0,
  `user_from_id` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `id`(`id` ASC) USING BTREE,
  INDEX `users`(`user_to_id` ASC, `user_from_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for messenger_friendships
-- ----------------------------
DROP TABLE IF EXISTS `messenger_friendships`;
CREATE TABLE `messenger_friendships`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_one_id` int NOT NULL DEFAULT 0,
  `user_two_id` int NOT NULL DEFAULT 0,
  `relation` int NOT NULL DEFAULT 0,
  `friends_since` int NOT NULL DEFAULT 0,
  `category` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `id`(`id` ASC) USING BTREE,
  INDEX `user_one_id`(`user_one_id` ASC) USING BTREE,
  INDEX `user_two_id`(`user_two_id` ASC) USING BTREE,
  INDEX `userdata`(`user_one_id` ASC, `user_two_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for messenger_offline
-- ----------------------------
DROP TABLE IF EXISTS `messenger_offline`;
CREATE TABLE `messenger_offline`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT 0,
  `user_from_id` int NOT NULL DEFAULT 0,
  `message` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `sended_on` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for namechange_log
-- ----------------------------
DROP TABLE IF EXISTS `namechange_log`;
CREATE TABLE `namechange_log`  (
  `user_id` int NOT NULL,
  `old_name` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `new_name` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `timestamp` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for navigator_filter
-- ----------------------------
DROP TABLE IF EXISTS `navigator_filter`;
CREATE TABLE `navigator_filter`  (
  `key` varchar(11) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `field` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `compare` enum('equals','equals_ignore_case','contains') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `database_query` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`key`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for navigator_flatcats
-- ----------------------------
DROP TABLE IF EXISTS `navigator_flatcats`;
CREATE TABLE `navigator_flatcats`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `min_rank` int NOT NULL DEFAULT 0,
  `caption_save` varchar(32) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'caption_save',
  `caption` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `can_trade` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `max_user_count` int NOT NULL DEFAULT 100,
  `public` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `list_type` int NOT NULL DEFAULT 0 COMMENT 'Display mode in the navigator. 0 for list, 1 for thumbnails.',
  `order_num` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for navigator_publiccats
-- ----------------------------
DROP TABLE IF EXISTS `navigator_publiccats`;
CREATE TABLE `navigator_publiccats`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'Staff Picks',
  `image` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `visible` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1',
  `order_num` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 7 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for navigator_publics
-- ----------------------------
DROP TABLE IF EXISTS `navigator_publics`;
CREATE TABLE `navigator_publics`  (
  `public_cat_id` int NOT NULL,
  `room_id` int NOT NULL,
  `visible` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '1'
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for nux_gifts
-- ----------------------------
DROP TABLE IF EXISTS `nux_gifts`;
CREATE TABLE `nux_gifts`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('item','room') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'item',
  `value` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'If type item then items.item_name. If type room then room id to copy.',
  `image` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 4 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for old_guilds_forums
-- ----------------------------
DROP TABLE IF EXISTS `old_guilds_forums`;
CREATE TABLE `old_guilds_forums`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `guild_id` int NOT NULL,
  `user_id` int NOT NULL,
  `subject` mediumtext CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `message` longtext CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `state` enum('OPEN','CLOSED','HIDDEN_BY_ADMIN','HIDDEN_BY_STAFF') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'OPEN',
  `admin_id` int NOT NULL DEFAULT 0,
  `pinned` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `locked` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `timestamp` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for old_guilds_forums_comments
-- ----------------------------
DROP TABLE IF EXISTS `old_guilds_forums_comments`;
CREATE TABLE `old_guilds_forums_comments`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` int NOT NULL,
  `user_id` int NOT NULL,
  `timestamp` int NOT NULL,
  `message` longtext CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `state` enum('OPEN','CLOSED','HIDDEN_BY_ADMIN','HIDDEN_BY_STAFF') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'OPEN',
  `admin_id` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for permissions
-- ----------------------------
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `rank_name` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `badge` varchar(12) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `level` int NOT NULL DEFAULT 1,
  `room_effect` int NOT NULL DEFAULT 0,
  `log_commands` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `prefix` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `prefix_color` varchar(7) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `cmd_about` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_alert` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_allow_trading` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_badge` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_ban` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_blockalert` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_bots` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_bundle` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_calendar` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_changename` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_chatcolor` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_commands` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_connect_camera` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_control` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_coords` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_credits` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_subscription` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT '0',
  `cmd_danceall` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_diagonal` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_disconnect` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_duckets` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_ejectall` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_empty` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_empty_bots` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_empty_pets` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_enable` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_event` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_faceless` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_fastwalk` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_filterword` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_freeze` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_freeze_bots` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_gift` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_give_rank` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_ha` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_can_stalk` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_hal` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_invisible` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_ip_ban` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_machine_ban` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_hand_item` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_happyhour` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_hidewired` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_kickall` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_softkick` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_massbadge` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roombadge` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_masscredits` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_massduckets` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_massgift` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_masspoints` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_moonwalk` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_mimic` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_multi` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_mute` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_pet_info` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_pickall` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_plugins` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_points` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_promote_offer` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_pull` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_push` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_redeem` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_reload_room` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_roomalert` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roomcredits` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roomeffect` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roomgift` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roomitem` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roommute` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roompixels` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_roompoints` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_say` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_say_all` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_setmax` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_set_poll` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_setpublic` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_setspeed` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_shout` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_shout_all` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_shutdown` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_sitdown` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_staffalert` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_staffonline` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_summon` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_summonrank` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_super_ban` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_stalk` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_superpull` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_take_badge` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_talk` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_teleport` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_trash` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_transform` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_unban` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_unload` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_unmute` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_achievements` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_bots` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_catalogue` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_config` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_guildparts` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_hotel_view` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_items` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_navigator` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_permissions` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_pet_data` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_plugins` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_polls` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_texts` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_wordfilter` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_userinfo` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_word_quiz` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_warp` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_anychatcolor` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_anyroomowner` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_empty_others` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_enable_others` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_see_whispers` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_see_tentchat` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_superwired` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_supporttool` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_unkickable` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_guildgate` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_moverotate` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_placefurni` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_unlimited_bots` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0' COMMENT 'Overrides the bot restriction to the inventory and room.',
  `acc_unlimited_pets` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0' COMMENT 'Overrides the pet restriction to the inventory and room.',
  `acc_hide_ip` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_hide_mail` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_not_mimiced` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_chat_no_flood` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_staff_chat` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_staff_pick` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_enteranyroom` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_fullrooms` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_infinite_credits` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_infinite_pixels` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_infinite_points` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_ambassador` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_debug` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_chat_no_limit` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0' COMMENT 'People with this permission node are always heard and can see all chat in the room regarding of maximum hearing distance in the room settings (In game)',
  `acc_chat_no_filter` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_nomute` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_guild_admin` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_catalog_ids` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_modtool_ticket_q` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_modtool_user_logs` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_modtool_user_alert` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_modtool_user_kick` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_modtool_user_ban` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_modtool_room_info` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_modtool_room_logs` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_trade_anywhere` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_update_notifications` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_helper_use_guide_tool` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_helper_give_guide_tours` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_helper_judge_chat_reviews` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_floorplan_editor` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_camera` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_ads_background` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_wordquiz` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_room_staff_tags` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_infinite_friends` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_unignorable` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_mimic_unredeemed` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_youtube_playlists` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_add_youtube_playlist` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `auto_credits_amount` int NULL DEFAULT 0,
  `auto_pixels_amount` int NULL DEFAULT 0,
  `auto_gotw_amount` int NULL DEFAULT 0,
  `auto_points_amount` int NULL DEFAULT 0,
  `acc_mention` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_setstate` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_buildheight` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_setrotation` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_sellroom` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_buyroom` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_pay` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_kill` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_hoverboard` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_kiss` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_hug` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_welcome` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_disable_effects` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_brb` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_nuke` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_slime` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_explain` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_closedice` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `acc_closedice_room` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2',
  `cmd_set` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `cmd_furnidata` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `kiss_cmd` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `acc_calendar_force` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT '0',
  `cmd_update_calendar` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `cmd_update_chat_bubbles` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for pet_actions
-- ----------------------------
DROP TABLE IF EXISTS `pet_actions`;
CREATE TABLE `pet_actions`  (
  `ID` int NOT NULL AUTO_INCREMENT,
  `pet_type` int NOT NULL,
  `pet_name` varchar(32) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `offspring_type` int NOT NULL DEFAULT -1,
  `happy_actions` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `tired_actions` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `random_actions` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `can_swim` enum('1','0') CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT '0',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 77 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for pet_breeding
-- ----------------------------
DROP TABLE IF EXISTS `pet_breeding`;
CREATE TABLE `pet_breeding`  (
  `pet_id` int NOT NULL,
  `offspring_id` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for pet_breeding_races
-- ----------------------------
DROP TABLE IF EXISTS `pet_breeding_races`;
CREATE TABLE `pet_breeding_races`  (
  `pet_type` int NOT NULL,
  `rarity_level` int NOT NULL,
  `breed` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for pet_breeds
-- ----------------------------
DROP TABLE IF EXISTS `pet_breeds`;
CREATE TABLE `pet_breeds`  (
  `race` int NOT NULL,
  `color_one` int NOT NULL,
  `color_two` int NOT NULL,
  `has_color_one` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `has_color_two` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  UNIQUE INDEX `idx_name`(`race`, `color_one`, `color_two`, `has_color_one`, `has_color_two`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for pet_commands
-- ----------------------------
DROP TABLE IF EXISTS `pet_commands`;
CREATE TABLE `pet_commands`  (
  `pet_id` int NOT NULL,
  `command_id` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for pet_commands_data
-- ----------------------------
DROP TABLE IF EXISTS `pet_commands_data`;
CREATE TABLE `pet_commands_data`  (
  `command_id` int NOT NULL,
  `text` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `required_level` int NOT NULL,
  `reward_xp` int NOT NULL DEFAULT 5,
  `cost_happiness` int NOT NULL DEFAULT 0,
  `cost_energy` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`command_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for pet_drinks
-- ----------------------------
DROP TABLE IF EXISTS `pet_drinks`;
CREATE TABLE `pet_drinks`  (
  `pet_id` int NOT NULL DEFAULT 0 COMMENT 'Leave 0 to have it affect all pet types.',
  `item_id` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for pet_foods
-- ----------------------------
DROP TABLE IF EXISTS `pet_foods`;
CREATE TABLE `pet_foods`  (
  `pet_id` int NOT NULL DEFAULT 0 COMMENT 'Leave 0 to have it affect all pet types.',
  `item_id` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for pet_items
-- ----------------------------
DROP TABLE IF EXISTS `pet_items`;
CREATE TABLE `pet_items`  (
  `pet_id` int NOT NULL COMMENT 'Leave 0 to have it affect all pet types.',
  `item_id` int NOT NULL COMMENT 'Item id of a item having one of the following interactions: nest, pet_food, pet_drink'
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for pet_vocals
-- ----------------------------
DROP TABLE IF EXISTS `pet_vocals`;
CREATE TABLE `pet_vocals`  (
  `pet_id` int NOT NULL DEFAULT 0 COMMENT 'Leave 0 to have it apply to all pet types.',
  `type` enum('DISOBEY','DRINKING','EATING','GENERIC_HAPPY','GENERIC_NEUTRAL','GENERIC_SAD','GREET_OWNER','HUNGRY','LEVEL_UP','MUTED','PLAYFUL','SLEEPING','THIRSTY','TIRED','UNKNOWN_COMMAND') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'GENERIC_HAPPY',
  `message` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for polls
-- ----------------------------
DROP TABLE IF EXISTS `polls`;
CREATE TABLE `polls`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'Hey! We\'d appreciate it if you could take some time to answer these questions. It will help improve our hotel.',
  `thanks_message` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `reward_badge` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for polls_answers
-- ----------------------------
DROP TABLE IF EXISTS `polls_answers`;
CREATE TABLE `polls_answers`  (
  `poll_id` int NOT NULL,
  `user_id` int NOT NULL,
  `question_id` int NOT NULL,
  `answer` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  UNIQUE INDEX `unique_index`(`poll_id`, `user_id`, `question_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for polls_questions
-- ----------------------------
DROP TABLE IF EXISTS `polls_questions`;
CREATE TABLE `polls_questions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL DEFAULT 0,
  `poll_id` int NOT NULL,
  `order` int NOT NULL,
  `question` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `type` int NOT NULL DEFAULT 2,
  `min_selections` int NOT NULL DEFAULT 1,
  `options` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for recycler_prizes
-- ----------------------------
DROP TABLE IF EXISTS `recycler_prizes`;
CREATE TABLE `recycler_prizes`  (
  `rarity` int NOT NULL,
  `item_id` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for room_bans
-- ----------------------------
DROP TABLE IF EXISTS `room_bans`;
CREATE TABLE `room_bans`  (
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `ends` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for room_enter_log
-- ----------------------------
DROP TABLE IF EXISTS `room_enter_log`;
CREATE TABLE `room_enter_log`  (
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `timestamp` int NOT NULL,
  `exit_timestamp` int NOT NULL DEFAULT 0,
  INDEX `room_enter_log_room_id`(`room_id`) USING BTREE,
  INDEX `room_enter_log_user_entry`(`user_id`, `timestamp`) USING BTREE,
  INDEX `room_id`(`room_id`) USING BTREE,
  INDEX `exit_timestamp`(`exit_timestamp`) USING BTREE,
  INDEX `timestamps`(`timestamp`, `exit_timestamp`) USING BTREE,
  INDEX `user_id`(`user_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for room_game_scores
-- ----------------------------
DROP TABLE IF EXISTS `room_game_scores`;
CREATE TABLE `room_game_scores`  (
  `room_id` int NOT NULL,
  `game_start_timestamp` int NOT NULL,
  `game_name` varchar(64) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `user_id` int NOT NULL,
  `team_id` int NOT NULL,
  `score` int NOT NULL,
  `team_score` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for room_models
-- ----------------------------
DROP TABLE IF EXISTS `room_models`;
CREATE TABLE `room_models`  (
  `name` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `door_x` int NOT NULL,
  `door_y` int NOT NULL,
  `door_dir` int NOT NULL DEFAULT 2,
  `heightmap` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `public_items` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `club_only` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  PRIMARY KEY (`name`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for room_models_custom
-- ----------------------------
DROP TABLE IF EXISTS `room_models_custom`;
CREATE TABLE `room_models_custom`  (
  `id` int NOT NULL,
  `name` varchar(100) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `door_x` int NOT NULL,
  `door_y` int NOT NULL,
  `door_dir` int NOT NULL,
  `heightmap` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  UNIQUE INDEX `id`(`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for room_mutes
-- ----------------------------
DROP TABLE IF EXISTS `room_mutes`;
CREATE TABLE `room_mutes`  (
  `room_id` int NOT NULL,
  `user_id` int NOT NULL,
  `ends` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for room_promotions
-- ----------------------------
DROP TABLE IF EXISTS `room_promotions`;
CREATE TABLE `room_promotions`  (
  `room_id` int NOT NULL,
  `title` varchar(127) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `description` varchar(1024) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `end_timestamp` int NOT NULL DEFAULT 0,
  `start_timestamp` int NOT NULL DEFAULT -1,
  `category` int NOT NULL DEFAULT 0,
  UNIQUE INDEX `room_id`(`room_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for room_rights
-- ----------------------------
DROP TABLE IF EXISTS `room_rights`;
CREATE TABLE `room_rights`  (
  `room_id` int NOT NULL,
  `user_id` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for room_trade_log
-- ----------------------------
DROP TABLE IF EXISTS `room_trade_log`;
CREATE TABLE `room_trade_log`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_one_id` int NOT NULL,
  `user_two_id` int NOT NULL,
  `user_one_ip` varchar(45) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `user_two_ip` varchar(45) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `timestamp` int NOT NULL,
  `user_one_item_count` int NOT NULL,
  `user_two_item_count` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `user_one_id`(`user_one_id` ASC) USING BTREE,
  INDEX `user_two_id`(`user_two_id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for room_trade_log_items
-- ----------------------------
DROP TABLE IF EXISTS `room_trade_log_items`;
CREATE TABLE `room_trade_log_items`  (
  `id` int NOT NULL,
  `item_id` int NOT NULL,
  `user_id` int NOT NULL,
  UNIQUE INDEX `id`(`id` ASC, `item_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `id_2`(`id` ASC) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE,
  INDEX `id_3`(`id` ASC, `user_id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for room_trax
-- ----------------------------
DROP TABLE IF EXISTS `room_trax`;
CREATE TABLE `room_trax`  (
  `room_id` int NOT NULL,
  `trax_item_id` int NOT NULL
) ENGINE = InnoDB CHARACTER SET = armscii8 COLLATE = armscii8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for room_trax_playlist
-- ----------------------------
DROP TABLE IF EXISTS `room_trax_playlist`;
CREATE TABLE `room_trax_playlist`  (
  `room_id` int NOT NULL,
  `item_id` int NOT NULL,
  INDEX `room_id`(`room_id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for room_votes
-- ----------------------------
DROP TABLE IF EXISTS `room_votes`;
CREATE TABLE `room_votes`  (
  `user_id` int NOT NULL,
  `room_id` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for room_wordfilter
-- ----------------------------
DROP TABLE IF EXISTS `room_wordfilter`;
CREATE TABLE `room_wordfilter`  (
  `room_id` int NOT NULL,
  `word` varchar(25) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  UNIQUE INDEX `unique_index`(`room_id`, `word`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for rooms
-- ----------------------------
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `owner_id` int NOT NULL DEFAULT 0,
  `owner_name` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `name` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL DEFAULT '',
  `description` varchar(512) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `model` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'model_a',
  `password` varchar(20) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `state` enum('open','locked','password','invisible') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'open',
  `users` int NOT NULL DEFAULT 0,
  `users_max` int NOT NULL DEFAULT 25,
  `guild_id` int NOT NULL DEFAULT 0,
  `category` int NOT NULL DEFAULT 1,
  `score` int NOT NULL DEFAULT 0,
  `paper_floor` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0.0',
  `paper_wall` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0.0',
  `paper_landscape` varchar(5) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0.0',
  `thickness_wall` int NOT NULL DEFAULT 0,
  `wall_height` int NOT NULL DEFAULT -1,
  `thickness_floor` int NOT NULL DEFAULT 0,
  `moodlight_data` varchar(254) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '2,1,1,#000000,255;2,3,1,#000000,255;2,3,1,#000000,255;',
  `tags` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `is_public` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `is_staff_picked` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `allow_other_pets` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `allow_other_pets_eat` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `allow_walkthrough` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `allow_hidewall` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `chat_mode` int NOT NULL DEFAULT 0,
  `chat_weight` int NOT NULL DEFAULT 1,
  `chat_speed` int NOT NULL DEFAULT 1,
  `chat_hearing_distance` int NOT NULL DEFAULT 50,
  `chat_protection` int NOT NULL DEFAULT 2,
  `override_model` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `who_can_mute` int NOT NULL DEFAULT 0,
  `who_can_kick` int NOT NULL DEFAULT 0,
  `who_can_ban` int NOT NULL DEFAULT 0,
  `poll_id` int NOT NULL DEFAULT 0,
  `roller_speed` int NOT NULL DEFAULT 4,
  `promoted` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `trade_mode` int NOT NULL DEFAULT 2,
  `move_diagonally` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '1',
  `jukebox_active` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `hidewired` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `is_forsale` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `name`(`name` ASC) USING BTREE,
  INDEX `owner_name`(`owner_name` ASC) USING BTREE,
  INDEX `owner_id`(`owner_id` ASC) USING BTREE,
  INDEX `guild_id`(`guild_id` ASC) USING BTREE,
  INDEX `category`(`category` ASC) USING BTREE,
  INDEX `public_status`(`is_public` ASC, `is_staff_picked` ASC) USING BTREE,
  INDEX `togehter_data`(`name` ASC, `owner_name` ASC, `guild_id` ASC) USING BTREE,
  INDEX `tags`(`tags` ASC) USING BTREE,
  INDEX `state`(`state` ASC) USING BTREE,
  INDEX `description`(`description` ASC) USING BTREE,
  INDEX `users`(`users` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 57 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for sanction_levels
-- ----------------------------
DROP TABLE IF EXISTS `sanction_levels`;
CREATE TABLE `sanction_levels`  (
  `level` int NOT NULL,
  `type` enum('ALERT','BAN','MUTE') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `hour_length` int NOT NULL,
  `probation_days` int NOT NULL,
  PRIMARY KEY (`level`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for sanctions
-- ----------------------------
DROP TABLE IF EXISTS `sanctions`;
CREATE TABLE `sanctions`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `habbo_id` int NOT NULL DEFAULT 0,
  `sanction_level` int NOT NULL DEFAULT 0,
  `probation_timestamp` int NOT NULL DEFAULT 0,
  `reason` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `trade_locked_until` int NOT NULL DEFAULT 0,
  `is_muted` tinyint(1) NOT NULL DEFAULT 0,
  `mute_duration` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for soundtracks
-- ----------------------------
DROP TABLE IF EXISTS `soundtracks`;
CREATE TABLE `soundtracks`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(32) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `author` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `track` text CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `length` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 28 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for special_enables
-- ----------------------------
DROP TABLE IF EXISTS `special_enables`;
CREATE TABLE `special_enables`  (
  `effect_id` int NOT NULL,
  `min_rank` int NOT NULL,
  UNIQUE INDEX `effect_id`(`effect_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for support_cfh_categories
-- ----------------------------
DROP TABLE IF EXISTS `support_cfh_categories`;
CREATE TABLE `support_cfh_categories`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name_internal` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `name_external` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for support_cfh_topics
-- ----------------------------
DROP TABLE IF EXISTS `support_cfh_topics`;
CREATE TABLE `support_cfh_topics`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NULL DEFAULT NULL,
  `name_internal` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `name_external` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `action` enum('mods','auto_ignore','auto_reply') CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT 'mods',
  `ignore_target` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `auto_reply` text CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL,
  `default_sanction` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 33 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for support_issue_categories
-- ----------------------------
DROP TABLE IF EXISTS `support_issue_categories`;
CREATE TABLE `support_issue_categories`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'PII',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 3 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for support_issue_presets
-- ----------------------------
DROP TABLE IF EXISTS `support_issue_presets`;
CREATE TABLE `support_issue_presets`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` int NOT NULL DEFAULT 1,
  `name` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `message` varchar(300) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `reminder` varchar(100) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `ban_for` int NOT NULL DEFAULT 0 COMMENT '100000 = perm ban',
  `mute_for` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for support_presets
-- ----------------------------
DROP TABLE IF EXISTS `support_presets`;
CREATE TABLE `support_presets`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('user','room') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'user',
  `preset` varchar(200) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for support_tickets
-- ----------------------------
DROP TABLE IF EXISTS `support_tickets`;
CREATE TABLE `support_tickets`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `state` int NOT NULL DEFAULT 0,
  `type` int NOT NULL DEFAULT 1,
  `timestamp` int NOT NULL DEFAULT 0,
  `score` int NOT NULL DEFAULT 0,
  `sender_id` int NOT NULL DEFAULT 0,
  `reported_id` int NOT NULL DEFAULT 0,
  `room_id` int NOT NULL DEFAULT 0,
  `mod_id` int NOT NULL DEFAULT 0,
  `issue` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `category` int NOT NULL DEFAULT 0,
  `group_id` int NOT NULL,
  `thread_id` int NOT NULL,
  `comment_id` int NOT NULL,
  `photo_item_id` int NOT NULL DEFAULT -1,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `id`(`id` ASC) USING BTREE,
  INDEX `state`(`state` ASC) USING BTREE,
  INDEX `type`(`type` ASC) USING BTREE,
  INDEX `timestamp`(`timestamp` ASC) USING BTREE,
  INDEX `user_data`(`sender_id` ASC, `reported_id` ASC) USING BTREE,
  INDEX `room_id`(`room_id` ASC) USING BTREE,
  INDEX `issue`(`issue` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for trax_playlist
-- ----------------------------
DROP TABLE IF EXISTS `trax_playlist`;
CREATE TABLE `trax_playlist`  (
  `trax_item_id` int NOT NULL,
  `item_id` int NOT NULL
) ENGINE = InnoDB CHARACTER SET = armscii8 COLLATE = armscii8_general_ci ROW_FORMAT = COMPACT;

-- ----------------------------
-- Table structure for user_window_settings
-- ----------------------------
DROP TABLE IF EXISTS `user_window_settings`;
CREATE TABLE `user_window_settings`  (
  `user_id` int NOT NULL,
  `x` int NOT NULL DEFAULT 100,
  `y` int NOT NULL DEFAULT 100,
  `width` int NOT NULL DEFAULT 435,
  `height` int NOT NULL DEFAULT 535,
  `open_searches` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0'
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `real_name` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'KREWS DEV',
  `password` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `mail` varchar(500) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL,
  `mail_verified` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `account_created` int NOT NULL,
  `account_day_of_birth` int NOT NULL DEFAULT 0,
  `last_login` int NOT NULL DEFAULT 0,
  `last_online` int NOT NULL DEFAULT 0,
  `motto` varchar(127) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `look` varchar(256) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'hr-115-42.hd-195-19.ch-3030-82.lg-275-1408.fa-1201.ca-1804-64',
  `gender` enum('M','F') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'M',
  `rank` int NOT NULL DEFAULT 1,
  `credits` int NOT NULL DEFAULT 2500,
  `pixels` int NOT NULL DEFAULT 500,
  `points` int NOT NULL DEFAULT 10,
  `online` enum('0','1','2') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `auth_ticket` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `ip_register` varchar(45) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `ip_current` varchar(45) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL COMMENT 'Have your CMS update this IP. If you do not do this IP banning won\'t work!',
  `machine_id` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  `home_room` int NOT NULL DEFAULT 0,
  `secret_key` varchar(40) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL,
  `pincode` varchar(11) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL,
  `extra_rank` int NULL DEFAULT NULL,
  `referral_code` varchar(64) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NULL DEFAULT NULL,
  `gotw` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`username` ASC) USING BTREE,
  UNIQUE INDEX `id`(`id` ASC) USING BTREE,
  UNIQUE INDEX `id_2`(`id` ASC) USING BTREE,
  UNIQUE INDEX `id_3`(`id` ASC) USING BTREE,
  INDEX `account_created`(`account_created` ASC) USING BTREE,
  INDEX `last_login`(`last_login` ASC) USING BTREE,
  INDEX `last_online`(`last_online` ASC) USING BTREE,
  INDEX `figure`(`motto` ASC, `look` ASC, `gender` ASC) USING BTREE,
  INDEX `auth_ticket`(`auth_ticket` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_achievements
-- ----------------------------
DROP TABLE IF EXISTS `users_achievements`;
CREATE TABLE `users_achievements`  (
  `user_id` int NOT NULL,
  `achievement_name` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `progress` int NOT NULL DEFAULT 1,
  INDEX `user_id`(`user_id`) USING BTREE,
  INDEX `achievement_name`(`achievement_name`) USING BTREE,
  INDEX `progress`(`progress`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_achievements_queue
-- ----------------------------
DROP TABLE IF EXISTS `users_achievements_queue`;
CREATE TABLE `users_achievements_queue`  (
  `user_id` int NOT NULL,
  `achievement_id` int NOT NULL,
  `amount` int NOT NULL,
  UNIQUE INDEX `unique_index`(`user_id`, `achievement_id`) USING BTREE,
  UNIQUE INDEX `data`(`user_id`, `achievement_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for users_badges
-- ----------------------------
DROP TABLE IF EXISTS `users_badges`;
CREATE TABLE `users_badges`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT 0,
  `slot_id` int NOT NULL DEFAULT 0,
  `badge_code` varchar(32) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_clothing
-- ----------------------------
DROP TABLE IF EXISTS `users_clothing`;
CREATE TABLE `users_clothing`  (
  `user_id` int NOT NULL,
  `clothing_id` int NOT NULL,
  UNIQUE INDEX `user_id`(`user_id`, `clothing_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for users_currency
-- ----------------------------
DROP TABLE IF EXISTS `users_currency`;
CREATE TABLE `users_currency`  (
  `user_id` int NOT NULL,
  `type` int NOT NULL,
  `amount` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `type`) USING BTREE,
  UNIQUE INDEX `userdata`(`user_id`, `type`) USING BTREE,
  INDEX `amount`(`amount`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for users_effects
-- ----------------------------
DROP TABLE IF EXISTS `users_effects`;
CREATE TABLE `users_effects`  (
  `user_id` int NOT NULL,
  `effect` int NOT NULL,
  `duration` int NOT NULL DEFAULT 86400,
  `activation_timestamp` int NOT NULL DEFAULT -1,
  `total` int NOT NULL DEFAULT 1,
  UNIQUE INDEX `user_id`(`user_id`, `effect`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for users_favorite_rooms
-- ----------------------------
DROP TABLE IF EXISTS `users_favorite_rooms`;
CREATE TABLE `users_favorite_rooms`  (
  `user_id` int NOT NULL,
  `room_id` int NOT NULL,
  UNIQUE INDEX `user_id`(`user_id`, `room_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for users_ignored
-- ----------------------------
DROP TABLE IF EXISTS `users_ignored`;
CREATE TABLE `users_ignored`  (
  `user_id` int NOT NULL,
  `target_id` int NOT NULL,
  INDEX `user_id`(`user_id` ASC, `target_id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_navigator_settings
-- ----------------------------
DROP TABLE IF EXISTS `users_navigator_settings`;
CREATE TABLE `users_navigator_settings`  (
  `user_id` int NOT NULL,
  `caption` varchar(128) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `list_type` enum('list','thumbnails') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'list',
  `display` enum('visible','collapsed') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'visible',
  UNIQUE INDEX `userid`(`user_id`) USING BTREE,
  INDEX `list_type`(`list_type`) USING BTREE,
  INDEX `display`(`display`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_pets
-- ----------------------------
DROP TABLE IF EXISTS `users_pets`;
CREATE TABLE `users_pets`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `room_id` int NOT NULL,
  `name` varchar(15) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT 'User Pet',
  `race` int NOT NULL,
  `type` int NOT NULL,
  `color` varchar(6) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `happiness` int NOT NULL DEFAULT 100,
  `experience` int NOT NULL DEFAULT 0,
  `energy` int NOT NULL DEFAULT 100,
  `hunger` int NOT NULL DEFAULT 0,
  `thirst` int NOT NULL DEFAULT 0,
  `respect` int NOT NULL DEFAULT 0,
  `created` int NOT NULL,
  `x` int NOT NULL DEFAULT 0,
  `y` int NOT NULL DEFAULT 0,
  `z` double NOT NULL DEFAULT 0,
  `rot` int NOT NULL DEFAULT 0,
  `hair_style` int NOT NULL DEFAULT -1,
  `hair_color` int NOT NULL DEFAULT 0,
  `saddle` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `ride` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `mp_type` int NOT NULL DEFAULT 0,
  `mp_color` int NOT NULL DEFAULT 0,
  `mp_nose` int NOT NULL DEFAULT 0,
  `mp_nose_color` tinyint NOT NULL DEFAULT 0,
  `mp_eyes` int NOT NULL DEFAULT 0,
  `mp_eyes_color` tinyint NOT NULL DEFAULT 0,
  `mp_mouth` int NOT NULL DEFAULT 0,
  `mp_mouth_color` tinyint NOT NULL DEFAULT 0,
  `mp_death_timestamp` int NOT NULL DEFAULT 0,
  `mp_breedable` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `mp_allow_breed` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0',
  `gnome_data` varchar(80) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '',
  `mp_is_dead` tinyint(1) NOT NULL DEFAULT 0,
  `saddle_item_id` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_recipes
-- ----------------------------
DROP TABLE IF EXISTS `users_recipes`;
CREATE TABLE `users_recipes`  (
  `user_id` int NOT NULL,
  `recipe` int NOT NULL,
  UNIQUE INDEX `user_id`(`user_id`, `recipe`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for users_saved_searches
-- ----------------------------
DROP TABLE IF EXISTS `users_saved_searches`;
CREATE TABLE `users_saved_searches`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `search_code` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `filter` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_settings
-- ----------------------------
DROP TABLE IF EXISTS `users_settings`;
CREATE TABLE `users_settings`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT 0 COMMENT 'WARNING: DONT HAVE YOUR CMS INSERT ANYTHING IN HERE. THE EMULATOR DOES THIS FOR YOU!',
  `credits` int NOT NULL DEFAULT 0,
  `achievement_score` int NOT NULL DEFAULT 0,
  `daily_respect_points` int NOT NULL DEFAULT 3,
  `daily_pet_respect_points` int NOT NULL DEFAULT 3,
  `respects_given` int NOT NULL DEFAULT 0,
  `respects_received` int NOT NULL DEFAULT 0,
  `guild_id` int NOT NULL DEFAULT 0,
  `can_change_name` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `can_trade` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '1',
  `is_citizen` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `citizen_level` int NOT NULL DEFAULT 0,
  `helper_level` int NOT NULL DEFAULT 0,
  `tradelock_amount` int NOT NULL DEFAULT 0,
  `cfh_send` int NOT NULL DEFAULT 0 COMMENT 'Amount of CFHs been send. Not include abusive.',
  `cfh_abusive` int NOT NULL DEFAULT 0 COMMENT 'Amount of abusive CFHs have been send.',
  `cfh_warnings` int NOT NULL DEFAULT 0 COMMENT 'Amount of warnings a user has received.',
  `cfh_bans` int NOT NULL DEFAULT 0 COMMENT 'Amount of bans a user has received.',
  `block_following` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `block_friendrequests` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '0',
  `block_roominvites` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `volume_system` int NOT NULL DEFAULT 100,
  `volume_furni` int NOT NULL DEFAULT 100,
  `volume_trax` int NOT NULL DEFAULT 100,
  `old_chat` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `block_camera_follow` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `chat_color` int NOT NULL DEFAULT 0,
  `home_room` int NOT NULL DEFAULT 0,
  `online_time` int NOT NULL DEFAULT 0 COMMENT 'Total online time in seconds.',
  `tags` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT 'Arcturus Emulator;',
  `club_expire_timestamp` int NOT NULL DEFAULT 0,
  `login_streak` int NOT NULL DEFAULT 0,
  `rent_space_id` int NOT NULL DEFAULT 0,
  `rent_space_endtime` int NOT NULL DEFAULT 0,
  `hof_points` int NOT NULL DEFAULT 0,
  `block_alerts` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `talent_track_citizenship_level` int NOT NULL DEFAULT -1,
  `talent_track_helpers_level` int NOT NULL DEFAULT -1,
  `ignore_bots` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `ignore_pets` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `nux` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `mute_end_timestamp` int NOT NULL DEFAULT 0,
  `allow_name_change` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0',
  `perk_trade` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL DEFAULT '0' COMMENT 'Defines if a player has obtained the perk TRADE. When hotel.trading.requires.perk is set to 1, this perk is required in order to trade. Perk is obtained from the talen track.',
  `forums_post_count` int NULL DEFAULT 0,
  `ui_flags` int NOT NULL DEFAULT 1,
  `has_gotten_default_saved_searches` tinyint(1) NOT NULL DEFAULT 0,
  `hc_gifts_claimed` int NULL DEFAULT 0,
  `last_hc_payday` int NULL DEFAULT 0,
  `max_rooms` int NULL DEFAULT 50,
  `max_friends` int NULL DEFAULT 300,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `user_id`(`user_id` ASC) USING BTREE,
  INDEX `achievement_score`(`achievement_score` ASC) USING BTREE,
  INDEX `guild_id`(`guild_id` ASC) USING BTREE,
  INDEX `can_trade`(`can_trade` ASC) USING BTREE,
  INDEX `online_time`(`online_time` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_unicode_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_subscriptions
-- ----------------------------
DROP TABLE IF EXISTS `users_subscriptions`;
CREATE TABLE `users_subscriptions`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int UNSIGNED NULL DEFAULT NULL,
  `subscription_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `timestamp_start` int UNSIGNED NULL DEFAULT NULL,
  `duration` int UNSIGNED NULL DEFAULT NULL,
  `active` tinyint(1) NULL DEFAULT 1,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `user_id`(`user_id` ASC) USING BTREE,
  INDEX `subscription_type`(`subscription_type` ASC) USING BTREE,
  INDEX `timestamp_start`(`timestamp_start` ASC) USING BTREE,
  INDEX `active`(`active` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_target_offer_purchases
-- ----------------------------
DROP TABLE IF EXISTS `users_target_offer_purchases`;
CREATE TABLE `users_target_offer_purchases`  (
  `user_id` int NOT NULL,
  `offer_id` int NOT NULL,
  `state` int NOT NULL DEFAULT 0,
  `amount` int NOT NULL DEFAULT 0,
  `last_purchase` int NOT NULL DEFAULT 0,
  UNIQUE INDEX `use_id`(`user_id` ASC, `offer_id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for users_wardrobe
-- ----------------------------
DROP TABLE IF EXISTS `users_wardrobe`;
CREATE TABLE `users_wardrobe`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL DEFAULT 0,
  `slot_id` int NOT NULL DEFAULT 0,
  `look` varchar(256) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `gender` enum('M','F') CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT 'F',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for voucher_history
-- ----------------------------
DROP TABLE IF EXISTS `voucher_history`;
CREATE TABLE `voucher_history`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `voucher_id` int NOT NULL,
  `user_id` int NOT NULL,
  `timestamp` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for vouchers
-- ----------------------------
DROP TABLE IF EXISTS `vouchers`;
CREATE TABLE `vouchers`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `credits` int NOT NULL DEFAULT 0,
  `points` int NOT NULL DEFAULT 0,
  `points_type` int NOT NULL DEFAULT 0,
  `catalog_item_id` int NOT NULL DEFAULT 0,
  `amount` int NOT NULL DEFAULT 1,
  `limit` int NOT NULL DEFAULT -1,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for wired_rewards_given
-- ----------------------------
DROP TABLE IF EXISTS `wired_rewards_given`;
CREATE TABLE `wired_rewards_given`  (
  `wired_item` int NOT NULL,
  `user_id` int NOT NULL,
  `reward_id` int NOT NULL,
  `timestamp` int NOT NULL
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

-- ----------------------------
-- Table structure for wordfilter
-- ----------------------------
DROP TABLE IF EXISTS `wordfilter`;
CREATE TABLE `wordfilter`  (
  `key` varchar(256) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'The word to filter.',
  `replacement` varchar(16) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'What the word should be replaced with.',
  `hide` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0' COMMENT 'Wether the whole message that contains this word should be hidden from being displayed.',
  `report` enum('0','1') CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL DEFAULT '0' COMMENT 'Wether the message should be reported as auto-report to the moderators.',
  `mute` int NOT NULL DEFAULT 0 COMMENT 'Time user gets muted for mentioning this word.',
  UNIQUE INDEX `key`(`key`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for youtube_playlists
-- ----------------------------
DROP TABLE IF EXISTS `youtube_playlists`;
CREATE TABLE `youtube_playlists`  (
  `item_id` int NOT NULL,
  `playlist_id` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL COMMENT 'YouTube playlist ID',
  `order` int NOT NULL,
  UNIQUE INDEX `item_id`(`item_id`, `playlist_id`, `order`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 1 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = FIXED;

SET FOREIGN_KEY_CHECKS = 1;

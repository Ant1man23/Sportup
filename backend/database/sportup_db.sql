-- MySQL dump 10.13  Distrib 8.4.7, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: sportup_db
-- ------------------------------------------------------
-- Server version	8.4.7

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache`
--

LOCK TABLES `cache` WRITE;
/*!40000 ALTER TABLE `cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cache_locks`
--

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `type` enum('session','team') COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` bigint unsigned DEFAULT NULL,
  `team_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conversations_session_id_foreign` (`session_id`),
  KEY `conversations_team_id_foreign` (`team_id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversations`
--

LOCK TABLES `conversations` WRITE;
/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;
INSERT INTO `conversations` VALUES (1,'session',NULL,NULL,'2026-10-16 11:35:24','2026-10-16 11:35:24');
/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `fcm_token` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` enum('ios','android') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'android',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `devices_fcm_token_unique` (`fcm_token`),
  KEY `devices_user_id_index` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `devices`
--

LOCK TABLES `devices` WRITE;
/*!40000 ALTER TABLE `devices` DISABLE KEYS */;
INSERT INTO `devices` VALUES (6,1,'diZWabKhTqiTOT4HCaO8kA:APA91bFJysdcb8qhMBgqTKuCESNHt7xzK8K8jAdJ7Yzr2BdCFGrx_RRvr6lK5C_x0xIZqB1pqIsxIIp_QA7XWk2-EVq-ljEUpzypC9M--a10h17TK1zZVG8','android','2026-10-16 07:17:10','2026-10-16 07:31:37');
/*!40000 ALTER TABLE `devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_events`
--

DROP TABLE IF EXISTS `match_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `match_id` bigint unsigned NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `team_side` enum('team_a','team_b') COLLATE utf8mb4_unicode_ci NOT NULL,
  `player_id` bigint unsigned DEFAULT NULL,
  `sub_in_player_id` bigint unsigned DEFAULT NULL,
  `sub_out_player_id` bigint unsigned DEFAULT NULL,
  `related_player_id` bigint unsigned DEFAULT NULL,
  `points` tinyint unsigned DEFAULT NULL,
  `shot_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shot_result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rebound_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foul_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minute` smallint unsigned NOT NULL,
  `period` tinyint unsigned NOT NULL DEFAULT '1',
  `set_number` tinyint unsigned DEFAULT NULL,
  `match_time_seconds` smallint unsigned NOT NULL DEFAULT '0',
  `recorded_by` bigint unsigned DEFAULT NULL,
  `is_cancelled` tinyint(1) NOT NULL DEFAULT '0',
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `idempotency_key` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `action_detail` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `match_events_player_id_foreign` (`player_id`),
  KEY `match_events_match_id_index` (`match_id`),
  KEY `match_events_sub_in_player_id_foreign` (`sub_in_player_id`),
  KEY `match_events_sub_out_player_id_foreign` (`sub_out_player_id`),
  KEY `match_events_related_player_id_foreign` (`related_player_id`),
  KEY `match_events_recorded_by_foreign` (`recorded_by`),
  KEY `match_events_match_id_idempotency_key_index` (`match_id`,`idempotency_key`)
) ENGINE=MyISAM AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_events`
--

LOCK TABLES `match_events` WRITE;
/*!40000 ALTER TABLE `match_events` DISABLE KEYS */;
INSERT INTO `match_events` VALUES (1,1,'goal','team_a',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,14,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-09-26 07:14:11'),(2,1,'goal','team_a',1,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,32,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-09-26 07:14:11'),(3,1,'goal','team_b',2,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,40,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-09-26 07:14:11'),(4,3,'foul','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:55:38'),(5,3,'goal','team_b',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:55:42'),(6,3,'goal','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:56:05'),(7,3,'foul','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:56:24'),(8,4,'goal','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:57:40'),(9,4,'goal','team_b',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:57:43'),(10,4,'card_red','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:57:47'),(11,4,'card_red','team_b',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 11:58:20'),(12,5,'goal','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 18:32:36'),(13,5,'goal','team_b',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-14 18:32:45'),(14,6,'goal','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-16 07:18:00'),(15,6,'goal','team_b',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-16 07:18:03'),(16,6,'foul','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-16 07:18:06'),(17,6,'foul','team_b',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-16 07:18:09'),(18,6,'card_yellow','team_b',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-16 07:18:12'),(19,6,'card_red','team_a',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,1,NULL,0,NULL,0,NULL,NULL,NULL,NULL,'2026-10-16 07:18:15');
/*!40000 ALTER TABLE `match_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_players`
--

DROP TABLE IF EXISTS `match_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_players` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `match_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `team_side` enum('team_a','team_b') COLLATE utf8mb4_unicode_ci NOT NULL,
  `jersey_number` smallint unsigned DEFAULT NULL,
  `position` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rotation_position` tinyint unsigned DEFAULT NULL,
  `is_libero` tinyint(1) NOT NULL DEFAULT '0',
  `fouls_count` tinyint unsigned NOT NULL DEFAULT '0',
  `yellow_cards` tinyint unsigned NOT NULL DEFAULT '0',
  `red_cards` tinyint unsigned NOT NULL DEFAULT '0',
  `is_starter` tinyint(1) NOT NULL DEFAULT '1',
  `is_on_court` tinyint(1) NOT NULL DEFAULT '1',
  `seconds_played` int unsigned NOT NULL DEFAULT '0',
  `last_subbed_in_at` smallint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_players_match_id_user_id_unique` (`match_id`,`user_id`),
  KEY `match_players_user_id_foreign` (`user_id`),
  KEY `match_players_match_id_team_side_index` (`match_id`,`team_side`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_players`
--

LOCK TABLES `match_players` WRITE;
/*!40000 ALTER TABLE `match_players` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_sets`
--

DROP TABLE IF EXISTS `match_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_sets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `match_id` bigint unsigned NOT NULL,
  `set_number` tinyint unsigned NOT NULL,
  `score_team_a` smallint unsigned NOT NULL DEFAULT '0',
  `score_team_b` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_sets_match_id_set_number_unique` (`match_id`,`set_number`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_sets`
--

LOCK TABLES `match_sets` WRITE;
/*!40000 ALTER TABLE `match_sets` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_sets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_id` bigint unsigned DEFAULT NULL,
  `status` enum('pending','in_progress','paused','finished') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `score_team_a` smallint unsigned NOT NULL DEFAULT '0',
  `score_team_b` smallint unsigned NOT NULL DEFAULT '0',
  `sets_won_a` tinyint unsigned NOT NULL DEFAULT '0',
  `sets_won_b` tinyint unsigned NOT NULL DEFAULT '0',
  `serving_side` enum('team_a','team_b') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serving_player_id` bigint unsigned DEFAULT NULL,
  `shot_clock_seconds` tinyint unsigned DEFAULT NULL,
  `target_score` smallint unsigned DEFAULT NULL,
  `match_format` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rules_profile` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rules_state` json DEFAULT NULL,
  `team_a_fouls` tinyint unsigned NOT NULL DEFAULT '0',
  `team_b_fouls` tinyint unsigned NOT NULL DEFAULT '0',
  `team_a_timeouts` tinyint unsigned NOT NULL DEFAULT '0',
  `team_b_timeouts` tinyint unsigned NOT NULL DEFAULT '0',
  `team_a_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_b_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_a_logo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_b_logo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_period` tinyint unsigned NOT NULL DEFAULT '1',
  `total_periods` tinyint unsigned NOT NULL DEFAULT '2',
  `period_duration_seconds` int unsigned NOT NULL,
  `elapsed_seconds` int unsigned NOT NULL DEFAULT '0',
  `period_elapsed_seconds` int unsigned NOT NULL DEFAULT '0',
  `started_at` timestamp NULL DEFAULT NULL,
  `period_started_at` timestamp NULL DEFAULT NULL,
  `last_resumed_at` timestamp NULL DEFAULT NULL,
  `paused_at` timestamp NULL DEFAULT NULL,
  `finished_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `tournament_id` bigint unsigned DEFAULT NULL,
  `stage` enum('group','round_of_16','quarter','semi','final','third_place') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `round_number` smallint unsigned DEFAULT NULL,
  `team_a_id` bigint unsigned DEFAULT NULL,
  `team_b_id` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `matches_session_id_unique` (`session_id`),
  KEY `matches_tournament_id_foreign` (`tournament_id`),
  KEY `matches_team_a_id_foreign` (`team_a_id`),
  KEY `matches_team_b_id_foreign` (`team_b_id`),
  KEY `matches_serving_player_id_foreign` (`serving_player_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
INSERT INTO `matches` VALUES (1,1,'finished',5,3,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,0,NULL,NULL,NULL,NULL,2,2,1500,3000,0,'2026-09-25 16:00:00',NULL,NULL,NULL,'2026-09-25 17:00:00','2026-09-26 08:14:11','2026-09-26 08:14:11',NULL,NULL,NULL,NULL,NULL),(2,2,'in_progress',0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,0,NULL,NULL,NULL,NULL,1,2,1200,0,0,'2026-10-09 09:54:43',NULL,NULL,NULL,NULL,'2026-10-09 09:54:43','2026-10-09 09:54:43',NULL,NULL,NULL,NULL,NULL),(3,10,'finished',1,1,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,0,NULL,NULL,NULL,NULL,1,2,1200,0,0,'2026-10-14 11:55:13',NULL,NULL,NULL,'2026-10-14 11:56:39','2026-10-14 11:55:13','2026-10-14 11:56:39',NULL,NULL,NULL,NULL,NULL),(4,11,'finished',1,1,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,0,NULL,NULL,NULL,NULL,1,2,1200,0,0,'2026-10-14 11:57:14',NULL,NULL,NULL,'2026-10-14 11:59:08','2026-10-14 11:57:14','2026-10-14 11:59:08',NULL,NULL,NULL,NULL,NULL),(5,12,'finished',1,1,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,0,NULL,NULL,NULL,NULL,1,2,1200,0,0,'2026-10-14 18:32:14',NULL,NULL,NULL,'2026-10-14 18:32:47','2026-10-14 18:32:14','2026-10-14 18:32:47',NULL,NULL,NULL,NULL,NULL),(6,13,'finished',1,1,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0,0,0,NULL,NULL,NULL,NULL,1,2,1200,0,0,'2026-10-16 07:17:53',NULL,NULL,NULL,'2026-10-16 07:18:22','2026-10-16 07:17:53','2026-10-16 07:18:22',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `conversation_id` bigint unsigned NOT NULL,
  `sender_id` bigint unsigned NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `messages_sender_id_foreign` (`sender_id`),
  KEY `messages_conversation_id_created_at_index` (`conversation_id`,`created_at`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,1,'Test message live discussion','2026-10-16 11:35:24','2026-10-16 11:35:24');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2026_01_01_000001_create_users_table',1),(2,'2026_01_01_000003_create_sports_table',1),(3,'2026_01_01_000005_create_sessions_table',1),(4,'2026_01_01_000007_create_matches_table',1),(5,'2026_01_01_000009_create_teams_table',1),(6,'2026_01_01_000011_rename_sessions_to_sport_sessions',1),(7,'2026_09_25_114904_create_cache_table',1),(8,'2026_09_25_121754_create_personal_access_tokens_table',1),(9,'2026_10_01_000001_create_notifications_table',2),(10,'2026_10_01_000002_create_tournaments_table',2),(11,'2026_10_02_000001_v2_tournaments_expansion',3),(12,'2026_10_02_000002_v2_sports_and_sets',3),(13,'2026_10_02_000003_v2_advanced_teams',3),(14,'2026_10_02_000004_v2_advanced_statistics',3),(15,'2026_10_02_000005_v2_chat_and_notifications',3),(16,'2026_10_02_000006_update_match_events_type_enum',4),(17,'2026_10_02_000007_create_devices_table',5),(18,'2026_10_02_000008_live_scoreboard_and_statistics',6),(19,'2026_10_02_000009_multisport_rules_and_official_engines',7),(20,'2026_10_16_000001_create_password_reset_tokens_table',8),(21,'2026_10_16_000002_enhance_roles_competitions_and_organizations',8);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification_preferences`
--

DROP TABLE IF EXISTS `notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_preferences` (
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `push_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`,`type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification_preferences`
--

LOCK TABLES `notification_preferences` WRITE;
/*!40000 ALTER TABLE `notification_preferences` DISABLE KEYS */;
INSERT INTO `notification_preferences` VALUES (1,'session_reminder',1,'2026-10-09 08:53:17','2026-10-09 08:53:17'),(1,'new_message',1,'2026-10-09 08:53:17','2026-10-09 08:53:17'),(1,'team_invitation',1,'2026-10-09 08:53:17','2026-10-09 08:53:17'),(1,'tournament_match_scheduled',1,'2026-10-09 08:53:17','2026-10-09 08:53:17'),(1,'match_finished',1,'2026-10-09 08:53:17','2026-10-09 08:53:17');
/*!40000 ALTER TABLE `notification_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_foreign` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,3,'team_invitation','Invitation d\'équipe','Ez Abde vous a invité à rejoindre l\'équipe MMLV.','{\"team_id\": \"3\"}',0,'2026-10-09 08:58:36','2026-10-09 08:58:36'),(2,1,'session_participant_joined','Nouveau participant','antman1 a rejoint votre session sportive.','{\"session_id\": 6}',0,'2026-10-14 18:26:46','2026-10-14 18:26:46'),(3,1,'session_participant_left','Désistement','antman1 a quitté votre session.','{\"session_id\": 6}',0,'2026-10-14 18:27:04','2026-10-14 18:27:04'),(4,1,'session_participant_joined','Nouveau participant','antman1 a rejoint votre session sportive.','{\"session_id\": 6}',0,'2026-10-14 18:27:23','2026-10-14 18:27:23'),(5,1,'session_participant_joined','Nouveau participant','antman1 a rejoint votre session sportive.','{\"session_id\": 9}',0,'2026-10-16 07:16:51','2026-10-16 07:16:51');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=MyISAM AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
INSERT INTO `personal_access_tokens` VALUES (1,'App\\Models\\User',6,'auth_token','410d09edb60a8d8315d98169f45a6a6353263dbc9d332b445fa570b6d0f29ca4','[\"*\"]',NULL,NULL,'2026-09-26 08:15:35','2026-09-26 08:15:35'),(2,'App\\Models\\User',6,'auth_token','eea802f16cc6fa3fc9e9e1561056c00c2c15d30c76ce7be48aaebc1b647c6172','[\"*\"]',NULL,NULL,'2026-09-26 08:15:35','2026-09-26 08:15:35'),(3,'App\\Models\\User',1,'auth_token','2928b4dfa8a27c20b06607f3575d466e11309a42895188e9477e190ba8dc57ce','[\"*\"]','2026-09-27 09:09:54',NULL,'2026-09-27 09:00:11','2026-09-27 09:09:54'),(4,'App\\Models\\User',1,'auth_token','1944433157cf4bb26b7bc45f1ee1459bc3f6a143aafe14ada46ed5e518e5c7ea','[\"*\"]','2026-09-27 10:06:09',NULL,'2026-09-27 09:12:59','2026-09-27 10:06:09'),(5,'App\\Models\\User',1,'auth_token','fe7f913f22f7c43d31bacb5b62e6d797baabafd445586626fee363aedd8ac454','[\"*\"]','2026-09-27 10:07:35',NULL,'2026-09-27 10:07:05','2026-09-27 10:07:35'),(6,'App\\Models\\User',1,'auth_token','433e712e460aa8b3e8d7ae94f92424861f53e04ee2bd402185219b60092b0673','[\"*\"]','2026-09-30 07:53:16',NULL,'2026-09-30 07:51:24','2026-09-30 07:53:16'),(7,'App\\Models\\User',7,'auth_token','198869b4fa14ff73d4b9c4c113cdf47882e6e2449c2439c6673d3bdd5fdcf55a','[\"*\"]','2026-09-30 07:54:10',NULL,'2026-09-30 07:53:50','2026-09-30 07:54:10'),(8,'App\\Models\\User',7,'auth_token','46ecd28c98d22962c3b86e51bca60f88bffd5c738ba915657946d1141ee9d2a4','[\"*\"]','2026-09-30 08:37:41',NULL,'2026-09-30 07:54:26','2026-09-30 08:37:41'),(9,'App\\Models\\User',7,'auth_token','b86f5937a27795a1db3d24b8a953d35eebf59bccd0c47098e07fd3ff0b8e55fd','[\"*\"]','2026-09-30 09:29:31',NULL,'2026-09-30 08:38:01','2026-09-30 09:29:31'),(10,'App\\Models\\User',7,'auth_token','6345b3f600189e6e5f2ede0bb004d25cbf947ba0d84105513a7d43d548566c23','[\"*\"]','2026-09-30 09:33:43',NULL,'2026-09-30 09:33:42','2026-09-30 09:33:43'),(11,'App\\Models\\User',7,'auth_token','fdb8d8825c1f29e67e5619d8bf9327647f6c05582a22c343541c8c6855a542b2','[\"*\"]','2026-10-01 07:59:01',NULL,'2026-09-30 11:15:21','2026-10-01 07:59:01'),(12,'App\\Models\\User',1,'auth_token','1a8cfad842e1ba3269582a7f9367592b8222405c78a3f6d3d2ed8815cc2ce8bf','[\"*\"]',NULL,NULL,'2026-10-01 07:50:05','2026-10-01 07:50:05'),(13,'App\\Models\\User',7,'auth_token','3c07288b927eafc36027e4d678f87ecc1ca6c01c0a997c46054b0de725fa59c2','[\"*\"]','2026-10-01 09:01:10',NULL,'2026-10-01 07:59:13','2026-10-01 09:01:10'),(14,'App\\Models\\User',1,'auth_token','8c2a416c00a8284165179f9ea3bfbbddf0035f5ae54c9a928a61fffe281383d5','[\"*\"]','2026-10-01 10:21:07',NULL,'2026-10-01 09:02:00','2026-10-01 10:21:07'),(15,'App\\Models\\User',1,'auth_token','449a7dd8ab01eb458d162655f36e6f9a9f50a247787568c5c692b804f8c35a53','[\"*\"]','2026-10-01 10:06:06',NULL,'2026-10-01 10:06:05','2026-10-01 10:06:06'),(16,'App\\Models\\User',1,'auth_token','127b51153361ae0ec5adcfeca2bf841cb45e218ea14956c9ce0f4e0d28d652ad','[\"*\"]','2026-10-01 10:06:24',NULL,'2026-10-01 10:06:24','2026-10-01 10:06:24'),(17,'App\\Models\\User',1,'auth_token','075dd243adb4f7e8ec96cb49d90a7d7331d116bb2ae9418fa5f1615696136790','[\"*\"]','2026-10-01 10:06:56',NULL,'2026-10-01 10:06:56','2026-10-01 10:06:56'),(18,'App\\Models\\User',1,'auth_token','9a03b5bcbe60feb7eadf5885e5decbe6861fde1f35f984b7b34c649ef75eda1f','[\"*\"]','2026-10-01 10:08:10',NULL,'2026-10-01 10:08:10','2026-10-01 10:08:10'),(19,'App\\Models\\User',7,'auth_token','1ad6d514b7a55977fa450404b3d6d8780b5e1fc6ba9955cae1ffecb7e2f1b4c3','[\"*\"]','2026-10-02 07:35:42',NULL,'2026-10-02 06:41:45','2026-10-02 07:35:42'),(20,'App\\Models\\User',1,'auth_token','61324a6ecb3cbc3f926daa2d2a1b9b9d8c8d5f235541d150bf0a8df25a931472','[\"*\"]','2026-10-02 08:32:03',NULL,'2026-10-02 07:35:49','2026-10-02 08:32:03'),(21,'App\\Models\\User',1,'auth_token','6662c9a4e909c2b3119f2519866e708c9fd70e9398a39faae396998a68c2aab7','[\"*\"]','2026-10-02 09:03:29',NULL,'2026-10-02 08:32:10','2026-10-02 09:03:29'),(22,'App\\Models\\User',8,'auth_token','8bc1203472d9ff12fd62a87b537b3b645fea2660285d03ca2978668e5a226b48','[\"*\"]','2026-10-02 08:44:46',NULL,'2026-10-02 08:37:08','2026-10-02 08:44:46'),(23,'App\\Models\\User',1,'auth_token','e2c87364488a28474577362568b30d9ce1af0bc98b32123742b9430ea51d0fa2','[\"*\"]','2026-10-02 09:30:17',NULL,'2026-10-02 09:03:47','2026-10-02 09:30:17'),(24,'App\\Models\\User',1,'auth_token','c5381f1c4323bfdf812433440013d891acf50aefb5a3fea30b465fd536a38778','[\"*\"]','2026-10-02 10:01:05',NULL,'2026-10-02 09:30:46','2026-10-02 10:01:05'),(25,'App\\Models\\User',9,'auth_token','a705ce2a69bcd5a0cb2558e642d54372a9acc2015dec6a56d2bb1d0460348518','[\"*\"]','2026-10-02 09:36:17',NULL,'2026-10-02 09:33:43','2026-10-02 09:36:17'),(26,'App\\Models\\User',1,'auth_token','9c748765b291d1966cc5a843eddb679ed69e7826ff0ff300d7808ae6eebef73a','[\"*\"]','2026-10-02 10:01:46',NULL,'2026-10-02 10:01:28','2026-10-02 10:01:46'),(27,'App\\Models\\User',1,'auth_token','31ed2a41f81304a3b1862ee73eaf9898a92c3443ce4b084f5702424b709008d2','[\"*\"]','2026-10-02 10:02:22',NULL,'2026-10-02 10:02:21','2026-10-02 10:02:22'),(28,'App\\Models\\User',1,'auth_token','f7093d02278096ae89350b6d8a793982d11788583e03f6a21217e29b160ec574','[\"*\"]','2026-10-03 08:22:47',NULL,'2026-10-03 08:21:39','2026-10-03 08:22:47'),(29,'App\\Models\\User',1,'auth_token','65a4f573f0c33df985816a1fac42ecaeeb66d724a78a2239f1a56f82c301d976','[\"*\"]','2026-10-03 08:53:32',NULL,'2026-10-03 08:49:11','2026-10-03 08:53:32'),(30,'App\\Models\\User',1,'auth_token','2c358b6fbbaadb32d100183931bc099c316daa5619c36da427efdb344645ab25','[\"*\"]','2026-10-03 08:55:25',NULL,'2026-10-03 08:53:57','2026-10-03 08:55:25'),(31,'App\\Models\\User',1,'auth_token','8cd771ed1620f54eb119a8d8b31530e41c66ae65fb32885e0e85f086782337b8','[\"*\"]','2026-10-03 09:21:33',NULL,'2026-10-03 09:20:33','2026-10-03 09:21:33'),(32,'App\\Models\\User',1,'auth_token','616c70b0ab822b763719fa0c7ac736602d18a1f3f9e0cf7a31219f58fe385858','[\"*\"]','2026-10-03 09:40:06',NULL,'2026-10-03 09:21:49','2026-10-03 09:40:06'),(33,'App\\Models\\User',1,'auth_token','e79da4eb93bbed3d199686204bd2b4aaff7540b341c1f67a1052ae2a58a79502','[\"*\"]','2026-10-05 08:10:02',NULL,'2026-10-05 08:08:23','2026-10-05 08:10:02'),(34,'App\\Models\\User',7,'auth_token','19193c415b67f53e21276fcad085af363b94fbb0b5158bcb5cfdce251b0675a3','[\"*\"]','2026-10-05 11:35:21',NULL,'2026-10-05 08:10:37','2026-10-05 11:35:21'),(35,'App\\Models\\User',1,'auth_token','5dd543a1bcf7b335d94c008d6cbe22ae57361d45a6f89647b19766d73244f1ce','[\"*\"]','2026-10-08 08:07:52',NULL,'2026-10-05 11:36:25','2026-10-08 08:07:52'),(36,'App\\Models\\User',1,'auth_token','294de3267b8e18b604e97a9debd3060c5901e954701d0eb06249e5d38dc10596','[\"*\"]','2026-10-08 09:56:38',NULL,'2026-10-08 08:08:33','2026-10-08 09:56:38'),(37,'App\\Models\\User',7,'auth_token','5d8c66514ba9a8d8522d5fd9b47def017225adcbe474e4950806df4b633a4ffb','[\"*\"]','2026-10-09 08:51:22',NULL,'2026-10-09 08:44:25','2026-10-09 08:51:22'),(38,'App\\Models\\User',1,'auth_token','0f26317986c58c4fe64616c4a9c9105e43ac767569bec95950373dca44199ab1','[\"*\"]','2026-10-09 08:58:50',NULL,'2026-10-09 08:51:40','2026-10-09 08:58:50'),(39,'App\\Models\\User',1,'test','5ec03864da32ab186e41ecd2c42b82859a2b158c9371ae321d6e2e849782f1c6','[\"*\"]',NULL,NULL,'2026-10-09 09:52:38','2026-10-09 09:52:38'),(40,'App\\Models\\User',1,'test','dbc215e96e83cf9bce37741b7878f8d119db2e05711639b14793186029570c4e','[\"*\"]','2026-10-09 09:54:43',NULL,'2026-10-09 09:54:43','2026-10-09 09:54:43'),(41,'App\\Models\\User',7,'auth_token','121b57a573338adfd7e328d671e2fab8a4deeb2bc25e4ef80dd1d8ab6f8ba2fc','[\"*\"]','2026-10-14 11:50:30',NULL,'2026-10-14 10:55:18','2026-10-14 11:50:30'),(42,'App\\Models\\User',1,'auth_token','a9f6413877832d4865a20dc7970825dede8a5d5826944375b87ea2316a6f2fe7','[\"*\"]','2026-10-14 12:01:38',NULL,'2026-10-14 11:50:51','2026-10-14 12:01:38'),(43,'App\\Models\\User',7,'auth_token','4876a0826df1d59545a3ea7667a852c7f89a751f1f0f37fd3bd0b8717826a94f','[\"*\"]','2026-10-14 18:23:09',NULL,'2026-10-14 17:37:42','2026-10-14 18:23:09'),(44,'App\\Models\\User',7,'auth_token','c0794f1a0255e3c0d5020a3cc95ff02a7109bb4e676e9b0e26495b023b1561a8','[\"*\"]','2026-10-14 18:38:12',NULL,'2026-10-14 18:26:12','2026-10-14 18:38:12'),(45,'App\\Models\\User',1,'auth_token','3e20282ef15ec0ed2864b07e0eae5058e6372a9113f3b96262910193e5129dbd','[\"*\"]','2026-10-16 07:15:00',NULL,'2026-10-16 07:14:47','2026-10-16 07:15:00'),(46,'App\\Models\\User',7,'auth_token','afa1b709a9bc5b203e20664fdd4df9792e4ca8f36c7ce6624dcffaced4957580','[\"*\"]','2026-10-16 07:19:59',NULL,'2026-10-16 07:15:59','2026-10-16 07:19:59'),(47,'App\\Models\\User',1,'auth_token','20e7ce547aa1e878ea2ae6e61364d482e79a9413ac2f467c0bb93950dc044a78','[\"*\"]','2026-10-16 07:33:50',NULL,'2026-10-16 07:31:35','2026-10-16 07:33:50');
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sport_session_participants`
--

DROP TABLE IF EXISTS `sport_session_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_session_participants` (
  `session_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`,`user_id`),
  KEY `session_participants_user_id_foreign` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_session_participants`
--

LOCK TABLES `sport_session_participants` WRITE;
/*!40000 ALTER TABLE `sport_session_participants` DISABLE KEYS */;
INSERT INTO `sport_session_participants` VALUES (1,2,'2026-09-26 07:14:11'),(2,1,'2026-09-26 07:14:11'),(3,3,'2026-09-26 07:14:11'),(1,1,'2026-09-27 09:09:07'),(1,4,'2026-09-26 07:14:11'),(1,5,'2026-09-26 07:14:11'),(4,1,'2026-09-27 09:01:59'),(5,7,'2026-10-02 07:34:36'),(5,1,'2026-10-02 07:37:07'),(1,8,'2026-10-02 08:44:25'),(6,1,'2026-10-02 09:13:26'),(7,1,'2026-10-03 08:50:07'),(8,1,'2026-10-08 08:12:17'),(9,1,'2026-10-09 08:52:35'),(10,1,'2026-10-14 11:55:07'),(11,1,'2026-10-14 11:57:11'),(6,7,'2026-10-14 18:27:23'),(12,7,'2026-10-14 18:32:12'),(9,7,'2026-10-16 07:16:51'),(13,7,'2026-10-16 07:17:47');
/*!40000 ALTER TABLE `sport_session_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sport_sessions`
--

DROP TABLE IF EXISTS `sport_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sport_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organizer_id` bigint unsigned NOT NULL,
  `referee_id` bigint unsigned DEFAULT NULL,
  `sport_id` bigint unsigned NOT NULL,
  `type` enum('find_players','find_opponent','free_match') COLLATE utf8mb4_unicode_ci NOT NULL,
  `competition_type` enum('friendly','corporate','tournament','championship','school_university','official','community') COLLATE utf8mb4_unicode_ci DEFAULT 'friendly',
  `participation_mode` enum('open','invitation','teams_assigned','approval_required') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `spectator_access` enum('free','paid','private','online_only') COLLATE utf8mb4_unicode_ci DEFAULT 'free',
  `format` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_date` date NOT NULL,
  `registration_deadline` datetime DEFAULT NULL,
  `start_time` time NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_details` text COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` char(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MG',
  `level` enum('beginner','intermediate','advanced','all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `max_participants` smallint unsigned NOT NULL,
  `current_participants` smallint unsigned NOT NULL DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('open','full','cancelled','in_progress','finished') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `cancelled_reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_organizer_id_foreign` (`organizer_id`),
  KEY `sessions_sport_id_foreign` (`sport_id`),
  KEY `sessions_status_session_date_index` (`status`,`session_date`),
  KEY `sessions_latitude_longitude_index` (`latitude`,`longitude`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sport_sessions`
--

LOCK TABLES `sport_sessions` WRITE;
/*!40000 ALTER TABLE `sport_sessions` DISABLE KEYS */;
INSERT INTO `sport_sessions` VALUES (1,2,NULL,1,'free_match','friendly','open','free','5v5','2026-09-25',NULL,'18:00:00',-18.8792000,47.5079000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','intermediate',10,9,'Five à Mahamasina. Ambiance conviviale, niveau intermédiaire !','open',NULL,'2026-09-26 08:14:11','2026-10-02 09:34:21'),(2,1,NULL,2,'find_players','friendly','open','free','3v3','2026-09-28',NULL,'10:30:00',-18.9100000,47.5250000,'Playground Ampefiloha',NULL,'Antananarivo','Analamanga','MG','advanced',6,5,'Run 3v3 Basket du dimanche matin. On cherche un 6e joueur !','in_progress',NULL,'2026-09-26 08:14:11','2026-10-09 09:54:43'),(3,3,NULL,1,'find_opponent','friendly','open','free','11v11','2026-09-29',NULL,'15:30:00',-18.1492000,49.4023000,'Stade Municipal de Toamasina',NULL,'Toamasina','Atsinanana','MG','intermediate',22,18,'Recherche d\'équipe adversaire pour match 11v11 à Toamasina.','open',NULL,'2026-09-26 08:14:11','2026-09-26 08:14:11'),(4,1,NULL,2,'free_match','friendly','open','free','5v5','2026-09-27',NULL,'15:00:00',-18.8792000,47.5079000,'Terrain Région Miarinarivo',NULL,'Miarinarivo','Analamanga','MG','intermediate',15,1,'Tournoi mafoka be','open',NULL,'2026-09-27 09:01:59','2026-10-02 07:33:31'),(5,7,NULL,6,'free_match','friendly','open','free','1v1','2026-10-02',NULL,'19:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','advanced',2,2,'Aaaaaaa','full',NULL,'2026-10-02 07:34:36','2026-10-02 07:37:07'),(6,1,NULL,1,'free_match','friendly','open','free','5v5','2026-10-02',NULL,'14:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','intermediate',22,2,'Kotrana','open',NULL,'2026-10-02 09:13:26','2026-10-14 18:27:23'),(7,1,NULL,3,'free_match','friendly','open','free','5v5','2026-10-03',NULL,'19:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','advanced',10,1,'N1A','open',NULL,'2026-10-03 08:50:07','2026-10-03 08:50:07'),(8,1,NULL,3,'free_match','friendly','open','free','5v5','2026-10-08',NULL,'16:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','advanced',15,1,'Entraînement','open',NULL,'2026-10-08 08:12:17','2026-10-08 08:12:17'),(9,1,NULL,1,'free_match','friendly','open','free','5v5','2026-10-09',NULL,'19:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','intermediate',10,2,NULL,'open',NULL,'2026-10-09 08:52:35','2026-10-16 07:16:51'),(10,1,NULL,1,'free_match','friendly','open','free','5v5','2026-10-14',NULL,'19:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','intermediate',10,1,'Bbbbbbb','finished',NULL,'2026-10-14 11:55:07','2026-10-14 11:56:39'),(11,1,NULL,1,'free_match','friendly','open','free','5v5','2026-10-14',NULL,'19:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','intermediate',10,1,NULL,'finished',NULL,'2026-10-14 11:57:11','2026-10-14 11:59:08'),(12,7,NULL,3,'free_match','friendly','open','free','5v5','2026-10-14',NULL,'19:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','intermediate',10,1,'Amicale','finished',NULL,'2026-10-14 18:32:12','2026-10-14 18:32:47'),(13,7,NULL,6,'free_match','friendly','open','free','1v1','2026-10-16',NULL,'19:00:00',-18.9189000,47.5256000,'Stade Municipal de Mahamasina',NULL,'Antananarivo','Analamanga','MG','intermediate',2,1,NULL,'finished',NULL,'2026-10-16 07:17:47','2026-10-16 07:18:22');
/*!40000 ALTER TABLE `sport_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sports`
--

DROP TABLE IF EXISTS `sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_hex` char(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sports_slug_unique` (`slug`)
) ENGINE=MyISAM AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sports`
--

LOCK TABLES `sports` WRITE;
/*!40000 ALTER TABLE `sports` DISABLE KEYS */;
INSERT INTO `sports` VALUES (1,'Football 11','football-11','football','#1FAA59',1,'2026-09-26 08:14:09','2026-10-01 08:07:33'),(2,'Football 5','football-5','football','#10B981',1,'2026-09-26 08:14:09','2026-10-01 08:07:33'),(3,'Basket 5×5','basketball-5x5','basketball','#FF7A29',1,'2026-09-26 08:14:09','2026-10-01 08:07:33'),(4,'Basket 3×3','basketball-3x3','basketball','#F59E0B',1,'2026-09-26 08:14:09','2026-10-01 08:07:33'),(5,'Volleyball','volleyball','volleyball','#3B82F6',1,'2026-10-01 08:07:33','2026-10-01 08:07:33'),(6,'Tennis de table','tennis-de-table','table-tennis','#A855F7',1,'2026-10-01 08:07:33','2026-10-01 08:07:33'),(7,'Tennis de table','table-tennis','table-tennis','#FF9800',1,'2026-10-08 06:56:48','2026-10-08 06:56:48');
/*!40000 ALTER TABLE `sports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_invitations`
--

DROP TABLE IF EXISTS `team_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_invitations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `team_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `invited_by` bigint unsigned NOT NULL,
  `status` enum('pending','accepted','declined','expired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `team_invitations_team_id_foreign` (`team_id`),
  KEY `team_invitations_user_id_foreign` (`user_id`),
  KEY `team_invitations_invited_by_foreign` (`invited_by`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_invitations`
--

LOCK TABLES `team_invitations` WRITE;
/*!40000 ALTER TABLE `team_invitations` DISABLE KEYS */;
INSERT INTO `team_invitations` VALUES (1,3,3,1,'pending','2026-10-09 08:58:36','2026-10-09 08:58:36');
/*!40000 ALTER TABLE `team_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_members` (
  `team_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `role` enum('captain','member') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `joined_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`team_id`,`user_id`),
  KEY `team_members_user_id_foreign` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
INSERT INTO `team_members` VALUES (1,1,'captain','2026-09-26 07:14:11'),(1,2,'member','2026-09-26 07:14:11'),(1,4,'member','2026-09-26 07:14:11'),(1,5,'member','2026-09-26 07:14:11'),(2,2,'captain','2026-09-26 07:14:11'),(2,1,'member','2026-09-26 07:14:11'),(2,3,'member','2026-09-26 07:14:11'),(3,1,'captain','2026-10-08 07:11:08');
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sport_id` bigint unsigned NOT NULL,
  `organization_type` enum('enterprise','club','association','school_university','administration','independent_group') COLLATE utf8mb4_unicode_ci DEFAULT 'independent_group',
  `organization_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `captain_id` bigint unsigned NOT NULL,
  `logo_path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_members` smallint unsigned NOT NULL DEFAULT '15',
  `level` enum('beginner','intermediate','advanced') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_looking_for_opponent` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teams_sport_id_index` (`sport_id`),
  KEY `teams_captain_id_index` (`captain_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES (1,'Antananarivo Falcons',1,'independent_group',NULL,1,NULL,11,NULL,NULL,0,'2026-09-26 08:14:11','2026-09-26 08:14:11'),(2,'Tana Ballers',2,'independent_group',NULL,2,NULL,12,NULL,NULL,0,'2026-09-26 08:14:11','2026-09-26 08:14:11'),(3,'MMLV',1,'independent_group',NULL,1,NULL,15,'intermediate','Toliara',1,'2026-10-08 08:11:08','2026-10-09 08:58:28');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_standings`
--

DROP TABLE IF EXISTS `tournament_standings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_standings` (
  `tournament_id` bigint unsigned NOT NULL,
  `team_id` bigint unsigned NOT NULL,
  `played` smallint unsigned NOT NULL DEFAULT '0',
  `wins` smallint unsigned NOT NULL DEFAULT '0',
  `draws` smallint unsigned NOT NULL DEFAULT '0',
  `losses` smallint unsigned NOT NULL DEFAULT '0',
  `points_for` int unsigned NOT NULL DEFAULT '0',
  `points_against` int unsigned NOT NULL DEFAULT '0',
  `points` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`tournament_id`,`team_id`),
  KEY `tournament_standings_team_id_foreign` (`team_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_standings`
--

LOCK TABLES `tournament_standings` WRITE;
/*!40000 ALTER TABLE `tournament_standings` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_standings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_teams`
--

DROP TABLE IF EXISTS `tournament_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_teams` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tournament_id` bigint unsigned NOT NULL,
  `team_id` bigint unsigned NOT NULL,
  `group_label` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seed` smallint unsigned DEFAULT NULL,
  `status` enum('pending','accepted','eliminated','winner') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'accepted',
  `registered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tournament_teams_tournament_id_team_id_unique` (`tournament_id`,`team_id`),
  KEY `tournament_teams_team_id_foreign` (`team_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_teams`
--

LOCK TABLES `tournament_teams` WRITE;
/*!40000 ALTER TABLE `tournament_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sport_id` bigint unsigned NOT NULL,
  `format` enum('groups','knockout','groups_then_knockout') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'knockout',
  `organizer_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `location` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_teams` smallint unsigned NOT NULL DEFAULT '16',
  `prize_pool` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('open','in_progress','finished') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `starts_on` date DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournaments_organizer_id_foreign` (`organizer_id`),
  KEY `tournaments_sport_id_index` (`sport_id`),
  KEY `tournaments_status_index` (`status`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES (1,'Coupe SportUp Antananarivo',1,'knockout',1,'2026-10-20','2026-10-20','Stade Municipal de Mahamasina','Antananarivo',16,'1 500 000 Ar','open',NULL,1,'Le tournoi officiel SportUp. 16 équipes, format élimination directe. Inscriptions ouvertes jusqu\'au 18 octobre.','2026-10-03 08:10:18','2026-10-03 08:10:18'),(2,'Five League — Automne 2026',1,'knockout',1,'2026-09-28',NULL,NULL,'Antananarivo',8,NULL,'in_progress',NULL,0,'Ligue de Football 5 — Saison Automne 2026.','2026-10-03 08:10:18','2026-10-03 08:10:18'),(3,'Urban Hoops 3x3 Challenge',4,'knockout',1,'2026-10-27',NULL,'Terrain Ampefiloha','Antananarivo',12,'800 000 Ar','open',NULL,0,'Tournoi 3x3 streetball en plein air. Format rapide, ambiance garantie.','2026-10-03 08:10:18','2026-10-03 08:10:18'),(4,'Manalazy',1,'knockout',7,'2026-10-09',NULL,NULL,NULL,16,'Coupe Ondry','open','2026-10-09',0,NULL,'2026-10-09 08:50:19','2026-10-09 08:50:19');
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_favorite_sports`
--

DROP TABLE IF EXISTS `user_favorite_sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_favorite_sports` (
  `user_id` bigint unsigned NOT NULL,
  `sport_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`sport_id`),
  KEY `user_favorite_sports_sport_id_foreign` (`sport_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_favorite_sports`
--

LOCK TABLES `user_favorite_sports` WRITE;
/*!40000 ALTER TABLE `user_favorite_sports` DISABLE KEYS */;
INSERT INTO `user_favorite_sports` VALUES (1,1),(1,2),(2,1),(2,2),(3,1),(4,1),(4,2),(5,2);
/*!40000 ALTER TABLE `user_favorite_sports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_sport_statistics`
--

DROP TABLE IF EXISTS `user_sport_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_sport_statistics` (
  `user_id` bigint unsigned NOT NULL,
  `sport_id` bigint unsigned NOT NULL,
  `matches_played` int unsigned NOT NULL DEFAULT '0',
  `wins` int unsigned NOT NULL DEFAULT '0',
  `losses` int unsigned NOT NULL DEFAULT '0',
  `draws` int unsigned NOT NULL DEFAULT '0',
  `goals_scored` int unsigned NOT NULL DEFAULT '0',
  `points_scored` int unsigned NOT NULL DEFAULT '0',
  `mvp_count` int unsigned NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT NULL,
  `assists` int unsigned NOT NULL DEFAULT '0',
  `rebounds` int unsigned NOT NULL DEFAULT '0',
  `blocks` int unsigned NOT NULL DEFAULT '0',
  `steals` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`,`sport_id`),
  KEY `user_sport_statistics_sport_id_foreign` (`sport_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_sport_statistics`
--

LOCK TABLES `user_sport_statistics` WRITE;
/*!40000 ALTER TABLE `user_sport_statistics` DISABLE KEYS */;
INSERT INTO `user_sport_statistics` VALUES (1,1,26,18,4,4,15,0,5,'2026-10-14 11:59:08',0,0,0,0),(1,2,8,5,3,0,0,42,2,NULL,0,0,0,0),(2,1,14,8,4,2,7,0,2,NULL,0,0,0,0),(2,2,19,13,5,1,0,85,4,NULL,0,0,0,0),(7,3,1,0,0,1,0,0,0,'2026-10-14 18:32:47',0,0,0,0),(7,6,1,0,0,1,0,0,0,'2026-10-16 07:18:22',0,0,0,0);
/*!40000 ALTER TABLE `user_sport_statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_statistics_history`
--

DROP TABLE IF EXISTS `user_statistics_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_statistics_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `sport_id` bigint unsigned NOT NULL,
  `match_id` bigint unsigned NOT NULL,
  `stats_json` json NOT NULL,
  `played_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_statistics_history_sport_id_foreign` (`sport_id`),
  KEY `user_statistics_history_match_id_foreign` (`match_id`),
  KEY `user_statistics_history_user_id_sport_id_played_at_index` (`user_id`,`sport_id`,`played_at`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_statistics_history`
--

LOCK TABLES `user_statistics_history` WRITE;
/*!40000 ALTER TABLE `user_statistics_history` DISABLE KEYS */;
INSERT INTO `user_statistics_history` VALUES (1,1,1,3,'{\"goals\": 0, \"blocks\": 0, \"points\": 0, \"result\": \"draw\", \"steals\": 0, \"assists\": 0, \"rebounds\": 0}','2026-10-14 11:56:39','2026-10-14 11:56:39','2026-10-14 11:56:39'),(2,1,1,4,'{\"goals\": 0, \"blocks\": 0, \"points\": 0, \"result\": \"draw\", \"steals\": 0, \"assists\": 0, \"rebounds\": 0}','2026-10-14 11:59:08','2026-10-14 11:59:08','2026-10-14 11:59:08'),(3,7,3,5,'{\"goals\": 0, \"blocks\": 0, \"points\": 0, \"result\": \"draw\", \"steals\": 0, \"assists\": 0, \"rebounds\": 0}','2026-10-14 18:32:47','2026-10-14 18:32:47','2026-10-14 18:32:47'),(4,7,6,6,'{\"goals\": 0, \"blocks\": 0, \"points\": 0, \"result\": \"draw\", \"steals\": 0, \"assists\": 0, \"rebounds\": 0}','2026-10-16 07:18:22','2026-10-16 07:18:22','2026-10-16 07:18:22');
/*!40000 ALTER TABLE `user_statistics_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reminder_minutes_before` smallint unsigned NOT NULL DEFAULT '60',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` enum('beginner','intermediate','advanced') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('player','team_manager','organizer','referee','spectator','admin') COLLATE utf8mb4_unicode_ci DEFAULT 'player',
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_unique` (`username`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_city_index` (`city`)
) ENGINE=MyISAM AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Ez Abde','karim@sportup.app',60,NULL,'$2y$12$bkA.ql8pmoAaHiWfWvcFduQeY1S5PDED/Tj2nsORXqNq0Nt49JDmq','avatars/user_1_1791449798.jpg','Antananarivo','advanced','player',NULL,'2026-09-26 08:14:11','2026-10-16 11:15:44',NULL),(2,'mehdi_k','mehdi@sportup.app',60,NULL,'$2y$12$3IpuUs0BtFXPLvhAltU.X.Mrw3kgB2D8nsAHEwfPrSWcBjJ/acHhW',NULL,'Antananarivo','intermediate','player',NULL,'2026-09-26 08:14:11','2026-09-26 08:14:11',NULL),(3,'mialy_r','mialy@sportup.app',60,NULL,'$2y$12$CCmnCDogQ6ftnPRrz2gGqOoEDwyEsEdJYnn2/r6LuNWffznbUFGpi',NULL,'Toamasina','intermediate','player',NULL,'2026-09-26 08:14:11','2026-09-26 08:14:11',NULL),(4,'tojo_a','tojo@sportup.app',60,NULL,'$2y$12$0xFnzMxbGWCc4MeedpMAOO8vIcbYwlQmJjYkWdCXieMEK0rfvb.aq',NULL,'Antsirabe','advanced','player',NULL,'2026-09-26 08:14:11','2026-09-26 08:14:11',NULL),(5,'hery_n','hery@sportup.app',60,NULL,'$2y$12$k9NGa.sTAcf/E2mT544EZudG54npytATrQRgPO.DGrl5bDNxg59bS',NULL,'Fianarantsoa','beginner','player',NULL,'2026-09-26 08:14:11','2026-09-26 08:14:11',NULL),(6,'johndoe_650','test_1790406934@sportup.app',60,NULL,'$2y$12$uh17632OOKHFFxeLUxLQr.wXfceNrk5aTG7SO.J2CyoyjgF6qa88C',NULL,'Antananarivo','intermediate','player',NULL,'2026-09-26 08:15:35','2026-09-26 08:15:35',NULL),(7,'antman1','didieranthonyrabialahy23@gmail.com',60,NULL,'$2y$12$9K5wZVVrGyCL/CaIphK0O.okqVZUIBPRIc5h1/Z051HjI9Gro5gqi','avatars/user_7_1792131576.jpg','Antananarivo','intermediate','player',NULL,'2026-09-30 07:53:50','2026-10-16 07:19:36',NULL),(8,'john smith','joh@smith.com',60,NULL,'$2y$12$zA2V0TzVAApydr451vpJruByx.7uQLCLcCyKFVVmw1Uo.6tAUpLN6',NULL,'Antananarivo','intermediate','player',NULL,'2026-10-02 08:37:08','2026-10-02 08:37:08',NULL),(9,'Lux','prisquin.it@gmail.com',60,NULL,'$2y$12$WyMy.mHQr7SY8JCtykH7wu1dMEZxN7yjrZwii/0QUzDoY0tY759Oi',NULL,'Antananarivo','intermediate','player',NULL,'2026-10-02 09:33:43','2026-10-02 09:33:43',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-16 12:38:02

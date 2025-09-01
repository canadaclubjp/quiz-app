-- Overwrite quizzes with 784057ece52e48's data
REPLACE INTO quizzes VALUES(1,'Math quiz','','2025-07-29 09:01:13');
REPLACE INTO quizzes VALUES(2,'Media Quiz','Test with media','2025-07-29 09:01:13');
REPLACE INTO quizzes VALUES(3,'Media test','','2025-07-29 09:01:13');
REPLACE INTO quizzes VALUES(4,'Flexible Quiz','','2025-07-29 09:01:13');
REPLACE INTO quizzes VALUES(5,'ABCs','','2025-07-29 09:01:13');
REPLACE INTO quizzes VALUES(6,'Family','','2025-07-29 09:01:13');
REPLACE INTO quizzes VALUES(7,'Example Online Test','','2025-07-31 12:06:48.483887');
REPLACE INTO quizzes VALUES(8,'Example Online Test','','2025-07-31 21:31:55.935360');
REPLACE INTO quizzes VALUES(9,'asdasdasd','','2025-07-31 21:37:24.584974');
REPLACE INTO quizzes VALUES(10,'Test Quiz 10','Test description','2025-08-03 15:24:04.855507');
-- Delete extra quiz (17) not present on 784057ece52e48
DELETE FROM quizzes WHERE id = 17;
-- Overwrite questions with 784057ece52e48's data
REPLACE INTO questions VALUES(1,1,'1+1=?','["1", "2", "3", "4"]','["2"]',0,NULL,NULL,NULL,NULL);
REPLACE INTO questions VALUES(2,2,'What''s in the audio?','["Dog", "Cat", "Bird", "Fish"]','["Bird"]',0,NULL,'','https://example.com/test.mp3','');
REPLACE INTO questions VALUES(3,3,'Listen. What is 1+1?','["1", "2", "3", "4"]','["2"]',0,NULL,'','https://drive.google.com/uc?id=1rblJ3KRJzI6Rl05xh6TYkMm06_npLCJm','');
REPLACE INTO questions VALUES(4,3,'Watch. What is this?','["1", "2", "3", "4"]','["2"]',0,NULL,'','','https://files.catbox.moe/k2o4kt.mp4');
REPLACE INTO questions VALUES(5,4,'Pick your favourites.','["Apple", "Banana", "Orange", "Grape"]','["Apple", "Orange"]',0,NULL,'','','');
REPLACE INTO questions VALUES(6,4,'What''s in the video?','["Yes", "No"]','["Yes"]',0,NULL,'','','https://files.catbox.moe/abc123.mp4');
REPLACE INTO questions VALUES(7,5,'ABC next?','["A", "B", "C", "D"]','["D"]',0,NULL,'','','');
REPLACE INTO questions VALUES(8,6,'My father''s daughter is my?','["sister", "aunt", "wife", "niece"]','["sister"]',0,NULL,'','','');
REPLACE INTO questions VALUES(9,6,'My mother''s mother is my?','["aunt", "grandmother", "sister", "niece"]','["grandmother"]',0,NULL,'','','');
REPLACE INTO questions VALUES(12,17,'Sample question for quiz 17',NULL,NULL,NULL,NULL,NULL,NULL,NULL); -- Keep for reference, will be orphaned
REPLACE INTO questions VALUES(53,1,'Placeholder Question for Quiz 1',NULL,'["1"]',NULL,NULL,NULL,NULL,NULL);
REPLACE INTO questions VALUES(54,7,'What is the teacher''s name for this class?','["Matt", "Gerry", "David", "Suzanne", "Arlen", "Haru"]','["Arlen"]',0,NULL,'','','');
REPLACE INTO questions VALUES(55,8,'What is the teacher''s name for this class?','["Matt", "Gerry", "David", "Suzanne", "Arlen", "Haru"]','["Arlen"]',0,NULL,'','','');
REPLACE INTO questions VALUES(56,9,'asdasdasd','["asdasd", "aasdasd"]','["asdasd"]',0,NULL,'','','');
REPLACE INTO questions VALUES(57,10,'Test question','["Yes", "No"]','["Yes"]',0,NULL,'','','');
-- Delete extra questions not present on 784057ece52e48
DELETE FROM questions WHERE id NOT IN (1,2,3,4,5,6,7,8,9,12,53,54,55,56,57);
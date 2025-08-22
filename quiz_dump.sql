PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE quizzes (
	id INTEGER NOT NULL, 
	title VARCHAR, 
	description VARCHAR, created_at DATETIME, 
	PRIMARY KEY (id)
);
INSERT INTO quizzes VALUES(1,'Math quiz','math','2025-07-29 09:01:13');
INSERT INTO quizzes VALUES(2,'Media Quiz','Test with media','2025-07-29 09:01:13');
INSERT INTO quizzes VALUES(3,'Media test','','2025-07-29 09:01:13');
INSERT INTO quizzes VALUES(4,'Flexible Quiz','','2025-07-29 09:01:13');
INSERT INTO quizzes VALUES(5,'ABCs','','2025-07-29 09:01:13');
INSERT INTO quizzes VALUES(6,'Family','','2025-07-29 09:01:13');
INSERT INTO quizzes VALUES(7,'Example Online Test','','2025-07-31 12:06:48.483887');
INSERT INTO quizzes VALUES(8,'Example Online Test','','2025-07-31 21:31:55.935360');
INSERT INTO quizzes VALUES(9,'asdasdasd','','2025-07-31 21:37:24.584974');
INSERT INTO quizzes VALUES(10,'Test Quiz 10','Test description','2025-08-03 15:24:04.855507');
CREATE TABLE questions (
	id INTEGER NOT NULL, 
	quiz_id INTEGER, 
	question_text VARCHAR, 
	options VARCHAR, 
	correct_answers VARCHAR, 
	is_text_input BOOLEAN, 
	is_pool BOOLEAN, 
	image_url VARCHAR, 
	audio_url VARCHAR, 
	video_url VARCHAR, 
	PRIMARY KEY (id), 
	FOREIGN KEY(quiz_id) REFERENCES quizzes (id)
);
INSERT INTO questions VALUES(1,1,'1+1=?','["1", "2", "3", "4"]','["2"]',0,NULL,NULL,NULL,NULL);
INSERT INTO questions VALUES(2,2,'What''s in the audio?','["Dog", "Cat", "Bird", "Fish"]','["Bird"]',0,NULL,'','https://example.com/test.mp3','');
INSERT INTO questions VALUES(3,3,'Listen. What is 1+1?','["1", "2", "3", "4"]','["2"]',0,NULL,'','https://drive.google.com/uc?id=1rblJ3KRJzI6Rl05xh6TYkMm06_npLCJm','');
INSERT INTO questions VALUES(4,3,'Watch. What is this?','["1", "2", "3", "4"]','["2"]',0,NULL,'','','https://files.catbox.moe/k2o4kt.mp4');
INSERT INTO questions VALUES(5,4,'Pick your favourites.','["Apple", "Banana", "Orange", "Grape"]','["Apple", "Orange"]',0,NULL,'','','');
INSERT INTO questions VALUES(6,4,'What''s in the video?','["Yes", "No"]','["Yes"]',0,NULL,'','','https://files.catbox.moe/abc123.mp4');
INSERT INTO questions VALUES(7,5,'ABC next?','["A", "B", "C", "D"]','["D"]',0,NULL,'','','');
INSERT INTO questions VALUES(8,6,'My father''s daughter is my?','["sister", "aunt", "wife", "niece"]','["sister"]',0,NULL,'','','');
INSERT INTO questions VALUES(9,6,'My mother''s mother is my?','["aunt", "grandmother", "sister", "niece"]','["grandmother"]',0,NULL,'','','');
INSERT INTO questions VALUES(12,17,'Sample question for quiz 17',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO questions VALUES(53,1,'Placeholder Question for Quiz 1',NULL,'["1"]',NULL,NULL,NULL,NULL,NULL);
INSERT INTO questions VALUES(54,7,'What is the teacher''s name for this class?','["Matt", "Gerry", "David", "Suzanne", "Arlen", "Haru"]','["Arlen"]',0,NULL,'','','');
INSERT INTO questions VALUES(55,8,'What is the teacher''s name for this class?','["Matt", "Gerry", "David", "Suzanne", "Arlen", "Haru"]','["Arlen"]',0,NULL,'','','');
INSERT INTO questions VALUES(56,9,'asdasdasd','["asdasd", "aasdasd"]','["asdasd"]',0,NULL,'','','');
INSERT INTO questions VALUES(57,10,'Test question','["Yes", "No"]','["Yes"]',0,NULL,'','','');
CREATE TABLE scores (
	id INTEGER NOT NULL, 
	user_id VARCHAR, 
	quiz_id INTEGER, 
	score INTEGER, 
	total_questions INTEGER, 
	first_name VARCHAR, 
	last_name VARCHAR, 
	student_number VARCHAR, 
	PRIMARY KEY (id), 
	FOREIGN KEY(quiz_id) REFERENCES quizzes (id)
);
INSERT INTO scores VALUES(1,'1234567890',1,1,1,'Unknown','Unknown','1234567890');
INSERT INTO scores VALUES(2,'1111333333',1,1,1,'Unknown','Unknown','1111333333');
INSERT INTO scores VALUES(3,'1234567890',2,0,1,'Unknown','Unknown','1234567890');
INSERT INTO scores VALUES(4,'1234567890',3,2,2,'Unknown','Unknown','1234567890');
INSERT INTO scores VALUES(5,'1234567890',4,2,2,'Unknown','Unknown','1234567890');
INSERT INTO scores VALUES(6,NULL,5,1,NULL,NULL,NULL,'1234567890');
INSERT INTO scores VALUES(7,NULL,5,1,NULL,NULL,NULL,'1234567890');
INSERT INTO scores VALUES(8,NULL,6,2,NULL,NULL,NULL,'1234567890');
CREATE TABLE alembic_version (
	version_num VARCHAR(32) NOT NULL, 
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
CREATE INDEX ix_quizzes_id ON quizzes (id);
CREATE INDEX ix_quizzes_title ON quizzes (title);
CREATE INDEX ix_questions_id ON questions (id);
CREATE INDEX ix_scores_user_id ON scores (user_id);
CREATE INDEX ix_scores_id ON scores (id);
COMMIT;

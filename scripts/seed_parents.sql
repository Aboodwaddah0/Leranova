SET @hash = '$2b$10$LKPYx8I0Y40gOlhhxfu3SemY5XARDV9Isu7Cinifjq8nIZ42RPh3O';

-- ────────────────────────────────────────────────────────────────────────────
-- 1. CREATE PARENT USERS  (IDs 72–119, password = 12345678)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO user (id, name, email, passwordHashed, role, phone) VALUES
-- Grade 1 parents
(72,  'Hassan Al-Hassan',      'hassan.parent.g1@school.edu',    @hash,'PARENT','+966501000001'),
(73,  'Kindi Al-Kindi',        'kindi.parent.g1@school.edu',     @hash,'PARENT','+966501000002'),
(74,  'Ibrahim Saleh',         'ibrahim.parent.g1@school.edu',   @hash,'PARENT','+966501000003'),
(75,  'Said Al-Said',          'said.parent.g1@school.edu',      @hash,'PARENT','+966501000004'),
-- Grade 2 parents
(76,  'Rashid Al-Rashid',      'rashid.parent.g2@school.edu',    @hash,'PARENT','+966501000005'),
(77,  'Mahmoud Al-Mahmoud',    'mahmoud.parent.g2@school.edu',   @hash,'PARENT','+966501000006'),
(78,  'Noor Al-Noor',          'noor.parent.g2@school.edu',      @hash,'PARENT','+966501000007'),
(79,  'Amin Al-Amin',          'amin.parent.g2@school.edu',      @hash,'PARENT','+966501000008'),
-- Grade 3 parents
(80,  'Farsi Al-Farsi',        'farsi.parent.g3@school.edu',     @hash,'PARENT','+966501000009'),
(81,  'Jabri Al-Jabri',        'jabri.parent.g3@school.edu',     @hash,'PARENT','+966501000010'),
(82,  'Yousef Al-Yousef',      'yousef.parent.g3@school.edu',    @hash,'PARENT','+966501000011'),
(83,  'Balushi Al-Balushi',    'balushi.parent.g3@school.edu',   @hash,'PARENT','+966501000012'),
-- Grade 4 parents
(84,  'Qasim Al-Qasim',        'qasim.parent.g4@school.edu',     @hash,'PARENT','+966501000013'),
(85,  'Mustafa Al-Mustafa',    'mustafa.parent.g4@school.edu',   @hash,'PARENT','+966501000014'),
(86,  'Harbi Al-Harbi',        'harbi.parent.g4@school.edu',     @hash,'PARENT','+966501000015'),
(87,  'Tamimi Al-Tamimi',      'tamimi.parent.g4@school.edu',    @hash,'PARENT','+966501000016'),
-- Grade 5 parents
(88,  'Ibrahim Al-Ibrahim',    'ibrahim.parent.g5@school.edu',   @hash,'PARENT','+966501000017'),
(89,  'Zahrani Al-Zahrani',    'zahrani.parent.g5@school.edu',   @hash,'PARENT','+966501000018'),
(90,  'Hussain Al-Hussain',    'hussain.parent.g5@school.edu',   @hash,'PARENT','+966501000019'),
(91,  'Otaibi Al-Otaibi',      'otaibi.parent.g5@school.edu',    @hash,'PARENT','+966501000020'),
-- Grade 6 parents
(92,  'Shehri Al-Shehri',      'shehri.parent.g6@school.edu',    @hash,'PARENT','+966501000021'),
(93,  'Dosari Al-Dosari',      'dosari.parent.g6@school.edu',    @hash,'PARENT','+966501000022'),
(94,  'Ghamdi Al-Ghamdi',      'ghamdi.parent.g6@school.edu',    @hash,'PARENT','+966501000023'),
(95,  'Qahtani Al-Qahtani',    'qahtani.parent.g6@school.edu',   @hash,'PARENT','+966501000024'),
-- Grade 7 parents
(96,  'Mutairi Al-Mutairi',    'mutairi.parent.g7@school.edu',   @hash,'PARENT','+966501000025'),
(97,  'Shafi Al-Shafi',        'shafi.parent.g7@school.edu',     @hash,'PARENT','+966501000026'),
(98,  'Subaie Al-Subaie',      'subaie.parent.g7@school.edu',    @hash,'PARENT','+966501000027'),
(99,  'Rashidi Al-Rashidi',    'rashidi.parent.g7@school.edu',   @hash,'PARENT','+966501000028'),
-- Grade 8 parents
(100, 'Sulami Al-Sulami',      'sulami.parent.g8@school.edu',    @hash,'PARENT','+966501000029'),
(101, 'Harthi Al-Harthi',      'harthi.parent.g8@school.edu',    @hash,'PARENT','+966501000030'),
(102, 'Malki Al-Malki',        'malki.parent.g8@school.edu',     @hash,'PARENT','+966501000031'),
(103, 'Zahrani2 Al-Zahrani',   'zahrani2.parent.g8@school.edu',  @hash,'PARENT','+966501000032'),
-- Grade 9 parents
(104, 'Saadi Al-Saadi',        'saadi.parent.g9@school.edu',     @hash,'PARENT','+966501000033'),
(105, 'Habsi Al-Habsi',        'habsi.parent.g9@school.edu',     @hash,'PARENT','+966501000034'),
(106, 'Ruwaili Al-Ruwaili',    'ruwaili.parent.g9@school.edu',   @hash,'PARENT','+966501000035'),
(107, 'Rashid2 Al-Rashid',     'rashid2.parent.g9@school.edu',   @hash,'PARENT','+966501000036'),
-- Grade 10 parents
(108, 'Buainain Al-Buainain',  'buainain.parent.g10@school.edu', @hash,'PARENT','+966501000037'),
(109, 'Anzi Al-Anzi',          'anzi.parent.g10@school.edu',     @hash,'PARENT','+966501000038'),
(110, 'Qahtani2 Al-Qahtani',   'qahtani2.parent.g10@school.edu', @hash,'PARENT','+966501000039'),
(111, 'Enezi Al-Enezi',        'enezi.parent.g10@school.edu',    @hash,'PARENT','+966501000040'),
-- Grade 11 parents
(112, 'Fahad Al-Fahad',        'fahad.parent.g11@school.edu',    @hash,'PARENT','+966501000041'),
(113, 'Otaibi2 Al-Otaibi',     'otaibi2.parent.g11@school.edu',  @hash,'PARENT','+966501000042'),
(114, 'Harbi2 Al-Harbi',       'harbi2.parent.g11@school.edu',   @hash,'PARENT','+966501000043'),
(115, 'Ghamdi2 Al-Ghamdi',     'ghamdi2.parent.g11@school.edu',  @hash,'PARENT','+966501000044'),
-- Grade 12 parents
(116, 'Sayed Al-Sayed',        'sayed.parent.g12@school.edu',    @hash,'PARENT','+966501000045'),
(117, 'Dawsari Al-Dawsari',    'dawsari.parent.g12@school.edu',  @hash,'PARENT','+966501000046'),
(118, 'Jabr Al-Jabr',          'jabr.parent.g12@school.edu',     @hash,'PARENT','+966501000047'),
(119, 'Shahrani Al-Shahrani',  'shahrani.parent.g12@school.edu', @hash,'PARENT','+966501000048');

-- ────────────────────────────────────────────────────────────────────────────
-- 2. CREATE PARENT RECORDS
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO parent (Parent_id, nationalId) VALUES
(72,  '1000000001'),(73,  '1000000002'),(74,  '1000000003'),(75,  '1000000004'),
(76,  '1000000005'),(77,  '1000000006'),(78,  '1000000007'),(79,  '1000000008'),
(80,  '1000000009'),(81,  '1000000010'),(82,  '1000000011'),(83,  '1000000012'),
(84,  '1000000013'),(85,  '1000000014'),(86,  '1000000015'),(87,  '1000000016'),
(88,  '1000000017'),(89,  '1000000018'),(90,  '1000000019'),(91,  '1000000020'),
(92,  '1000000021'),(93,  '1000000022'),(94,  '1000000023'),(95,  '1000000024'),
(96,  '1000000025'),(97,  '1000000026'),(98,  '1000000027'),(99,  '1000000028'),
(100, '1000000029'),(101, '1000000030'),(102, '1000000031'),(103, '1000000032'),
(104, '1000000033'),(105, '1000000034'),(106, '1000000035'),(107, '1000000036'),
(108, '1000000037'),(109, '1000000038'),(110, '1000000039'),(111, '1000000040'),
(112, '1000000041'),(113, '1000000042'),(114, '1000000043'),(115, '1000000044'),
(116, '1000000045'),(117, '1000000046'),(118, '1000000047'),(119, '1000000048');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. LINK PARENTS → STUDENTS  (each parent owns their matching student)
--    student user IDs 24–71 map to parent user IDs 72–119  (offset = +48)
-- ────────────────────────────────────────────────────────────────────────────
UPDATE student
SET Parent_id = Student_id + 48
WHERE OrgId = 2;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. SUMMARY
-- ────────────────────────────────────────────────────────────────────────────
SELECT CONCAT(
  'Parents: ',   (SELECT COUNT(*) FROM parent WHERE Parent_id BETWEEN 72 AND 119),
  ' | Linked students: ', (SELECT COUNT(*) FROM student WHERE OrgId=2 AND Parent_id IS NOT NULL)
) AS result;

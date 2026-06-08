SET @org = 2;
SET @hash = '$2b$10$LKPYx8I0Y40gOlhhxfu3SemY5XARDV9Isu7Cinifjq8nIZ42RPh3O';

-- ────────────────────────────────────────────────────────────────────────
-- 1. TEACHERS  (IDs 20–23)
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO user (id, name, email, passwordHashed, role) VALUES
(20, 'Khaled Al-Omar',  'khaled.omar@school.edu',   @hash, 'TEACHER'),
(21, 'Rania Haddad',    'rania.haddad@school.edu',  @hash, 'TEACHER'),
(22, 'Tariq Mansour',   'tariq.mansour@school.edu', @hash, 'TEACHER'),
(23, 'Layla Nasser',    'layla.nasser@school.edu',  @hash, 'TEACHER');

INSERT INTO teacher (Teacher_id, OrgId, Work, specialization) VALUES
(20, 2, 'School Teacher', 'Mathematics & Science'),
(21, 2, 'School Teacher', 'Arabic & Islamic Studies'),
(22, 2, 'School Teacher', 'English & Social Studies'),
(23, 2, 'School Teacher', 'Computer Science & Art');

-- ────────────────────────────────────────────────────────────────────────
-- 2. SUBJECTS  (6 per class × 12 classes = 72)
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO subject (Course_id, Teacher_id, name, Description) VALUES
(4,20,'Mathematics','Numbers, counting, basic operations'),
(4,21,'Arabic Language','Reading, writing and grammar basics'),
(4,22,'English Language','Alphabet, vocabulary and simple sentences'),
(4,20,'Science','Nature, animals, environment'),
(4,22,'Social Studies','Family, community and homeland'),
(4,23,'Art & Craft','Drawing, colouring and crafts'),
(5,20,'Mathematics','Addition, subtraction and shapes'),
(5,21,'Arabic Language','Reading comprehension and writing'),
(5,22,'English Language','Vocabulary, reading and writing'),
(5,20,'Science','Plants, animals and basic physics'),
(5,22,'Social Studies','Local community and traditions'),
(5,23,'Art & Craft','Creative arts and handwork'),
(6,20,'Mathematics','Multiplication, division and fractions'),
(6,21,'Arabic Language','Grammar and composition'),
(6,22,'English Language','Reading, grammar and writing'),
(6,20,'Science','Matter, energy and environment'),
(6,22,'Social Studies','History and geography introduction'),
(6,23,'Computer Science','Introduction to computers'),
(7,20,'Mathematics','Fractions, decimals and geometry'),
(7,21,'Arabic Language','Advanced grammar and literature'),
(7,22,'English Language','Comprehension and composition'),
(7,20,'Science','Human body and environment'),
(7,22,'Social Studies','World geography and history'),
(7,23,'Computer Science','Typing and basic software'),
(8,20,'Mathematics','Ratios, percentages and statistics'),
(8,21,'Arabic Language','Literature and creative writing'),
(8,22,'English Language','Grammar, reading and writing'),
(8,20,'Science','Physics, chemistry and biology basics'),
(8,22,'Social Studies','Islamic civilization and world history'),
(8,23,'Computer Science','Internet safety and applications'),
(9,20,'Mathematics','Pre-algebra and problem solving'),
(9,21,'Arabic Language','Rhetoric and literary analysis'),
(9,22,'English Language','Advanced reading and writing'),
(9,20,'Science','Life science and earth science'),
(9,22,'Social Studies','Geography and economics'),
(9,23,'Computer Science','Spreadsheets and presentations'),
(10,20,'Mathematics','Algebra fundamentals'),
(10,21,'Arabic Language','Classical Arabic literature'),
(10,22,'English Language','Intermediate reading and composition'),
(10,20,'Science','Biology, chemistry and physics'),
(10,22,'Social Studies','Modern world history'),
(10,23,'Computer Science','Programming basics'),
(11,20,'Mathematics','Geometry and algebra'),
(11,21,'Arabic Language','Advanced composition and grammar'),
(11,22,'English Language','Literature and advanced writing'),
(11,20,'Science','Advanced biology and chemistry'),
(11,22,'Social Studies','Economics and political science'),
(11,23,'Computer Science','Web design basics'),
(12,20,'Mathematics','Advanced algebra and trigonometry'),
(12,21,'Arabic Language','Literature and critical analysis'),
(12,22,'English Language','Advanced literature and composition'),
(12,20,'Science','Physics, chemistry and biology'),
(12,22,'Social Studies','Civics and global issues'),
(12,23,'Computer Science','Database and programming'),
(13,20,'Mathematics','Calculus introduction and statistics'),
(13,21,'Arabic Language','Modern Arabic literature'),
(13,22,'English Language','Academic writing and research'),
(13,20,'Science','Advanced physics and chemistry'),
(13,22,'Social Studies','World affairs and history'),
(13,23,'Computer Science','Object-oriented programming'),
(14,20,'Mathematics','Advanced calculus'),
(14,21,'Arabic Language','Contemporary literature'),
(14,22,'English Language','Research and academic skills'),
(14,20,'Science','Physics and advanced chemistry'),
(14,22,'Social Studies','Philosophy and ethics'),
(14,23,'Computer Science','Data structures'),
(15,20,'Mathematics','Calculus and linear algebra'),
(15,21,'Arabic Language','Classical and modern literature'),
(15,22,'English Language','Advanced academic English'),
(15,20,'Science','Advanced physics, chemistry, biology'),
(15,22,'Social Studies','Economics and world history'),
(15,23,'Computer Science','Algorithms and software engineering');

-- ────────────────────────────────────────────────────────────────────────
-- 3. STUDENTS  (4 per grade = 48 students)
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO user (name, email, passwordHashed, role, registrationNumber) VALUES
('Omar Hassan',       'omar.hassan.g1@school.edu',    @hash,'STUDENT','SCH-G1-001'),
('Aisha Al-Kindi',    'aisha.kindi.g1@school.edu',    @hash,'STUDENT','SCH-G1-002'),
('Yusuf Saleh',       'yusuf.saleh.g1@school.edu',    @hash,'STUDENT','SCH-G1-003'),
('Nour Al-Said',      'nour.said.g1@school.edu',      @hash,'STUDENT','SCH-G1-004'),
('Lina Al-Rashid',    'lina.rashid.g2@school.edu',    @hash,'STUDENT','SCH-G2-001'),
('Khalid Mahmoud',    'khalid.mahmoud.g2@school.edu', @hash,'STUDENT','SCH-G2-002'),
('Sara Noor',         'sara.noor.g2@school.edu',      @hash,'STUDENT','SCH-G2-003'),
('Hassan Al-Amin',    'hassan.amin.g2@school.edu',    @hash,'STUDENT','SCH-G2-004'),
('Mariam Al-Farsi',   'mariam.farsi.g3@school.edu',   @hash,'STUDENT','SCH-G3-001'),
('Faisal Al-Jabri',   'faisal.jabri.g3@school.edu',   @hash,'STUDENT','SCH-G3-002'),
('Dina Yousef',       'dina.yousef.g3@school.edu',    @hash,'STUDENT','SCH-G3-003'),
('Tariq Al-Balushi',  'tariq.balushi.g3@school.edu',  @hash,'STUDENT','SCH-G3-004'),
('Hana Al-Qasim',     'hana.qasim.g4@school.edu',     @hash,'STUDENT','SCH-G4-001'),
('Bilal Mustafa',     'bilal.mustafa.g4@school.edu',  @hash,'STUDENT','SCH-G4-002'),
('Reem Al-Harbi',     'reem.harbi.g4@school.edu',     @hash,'STUDENT','SCH-G4-003'),
('Ziad Al-Tamimi',    'ziad.tamimi.g4@school.edu',    @hash,'STUDENT','SCH-G4-004'),
('Salma Ibrahim',     'salma.ibrahim.g5@school.edu',  @hash,'STUDENT','SCH-G5-001'),
('Ahmad Al-Zahrani',  'ahmad.zahrani.g5@school.edu',  @hash,'STUDENT','SCH-G5-002'),
('Fatima Hussain',    'fatima.hussain.g5@school.edu', @hash,'STUDENT','SCH-G5-003'),
('Nasser Al-Otaibi',  'nasser.otaibi.g5@school.edu',  @hash,'STUDENT','SCH-G5-004'),
('Maya Al-Shehri',    'maya.shehri.g6@school.edu',    @hash,'STUDENT','SCH-G6-001'),
('Ibrahim Al-Dosari', 'ibrahim.dosari.g6@school.edu', @hash,'STUDENT','SCH-G6-002'),
('Layla Al-Ghamdi',   'layla.ghamdi.g6@school.edu',   @hash,'STUDENT','SCH-G6-003'),
('Turki Al-Qahtani',  'turki.qahtani.g6@school.edu',  @hash,'STUDENT','SCH-G6-004'),
('Rana Al-Mutairi',   'rana.mutairi.g7@school.edu',   @hash,'STUDENT','SCH-G7-001'),
('Mohammed Al-Shafi', 'mohammed.shafi.g7@school.edu', @hash,'STUDENT','SCH-G7-002'),
('Hessa Al-Subaie',   'hessa.subaie.g7@school.edu',   @hash,'STUDENT','SCH-G7-003'),
('Sultan Al-Rashidi', 'sultan.rashidi.g7@school.edu', @hash,'STUDENT','SCH-G7-004'),
('Asma Al-Sulami',    'asma.sulami.g8@school.edu',    @hash,'STUDENT','SCH-G8-001'),
('Faris Al-Harthi',   'faris.harthi.g8@school.edu',   @hash,'STUDENT','SCH-G8-002'),
('Noura Al-Malki',    'noura.malki.g8@school.edu',    @hash,'STUDENT','SCH-G8-003'),
('Walid Al-Zahrani',  'walid.zahrani.g8@school.edu',  @hash,'STUDENT','SCH-G8-004'),
('Ghada Al-Saadi',    'ghada.saadi.g9@school.edu',    @hash,'STUDENT','SCH-G9-001'),
('Yousef Al-Habsi',   'yousef.habsi.g9@school.edu',   @hash,'STUDENT','SCH-G9-002'),
('Shahad Al-Ruwaili', 'shahad.ruwaili.g9@school.edu', @hash,'STUDENT','SCH-G9-003'),
('Moataz Al-Rashid',  'moataz.rashid.g9@school.edu',  @hash,'STUDENT','SCH-G9-004'),
('Manal Al-Buainain', 'manal.buainain.g10@school.edu',@hash,'STUDENT','SCH-G10-001'),
('Abdulaziz Al-Anzi', 'abdulaziz.anzi.g10@school.edu',@hash,'STUDENT','SCH-G10-002'),
('Rawan Al-Qahtani',  'rawan.qahtani.g10@school.edu', @hash,'STUDENT','SCH-G10-003'),
('Saad Al-Enezi',     'saad.enezi.g10@school.edu',    @hash,'STUDENT','SCH-G10-004'),
('Dana Al-Fahad',     'dana.fahad.g11@school.edu',    @hash,'STUDENT','SCH-G11-001'),
('Bandar Al-Otaibi',  'bandar.otaibi.g11@school.edu', @hash,'STUDENT','SCH-G11-002'),
('Shatha Al-Harbi',   'shatha.harbi.g11@school.edu',  @hash,'STUDENT','SCH-G11-003'),
('Majed Al-Ghamdi',   'majed.ghamdi.g11@school.edu',  @hash,'STUDENT','SCH-G11-004'),
('Fatimah Al-Sayed',  'fatimah.sayed.g12@school.edu', @hash,'STUDENT','SCH-G12-001'),
('Nawaf Al-Dawsari',  'nawaf.dawsari.g12@school.edu', @hash,'STUDENT','SCH-G12-002'),
('Mona Al-Jabr',      'mona.jabr.g12@school.edu',     @hash,'STUDENT','SCH-G12-003'),
('Hamad Al-Shahrani', 'hamad.shahrani.g12@school.edu',@hash,'STUDENT','SCH-G12-004');

-- ────────────────────────────────────────────────────────────────────────
-- 4. LINK STUDENTS to their classes
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO student (Student_id, OrgId, Course_id, GradeLevel, AcademicStatus)
SELECT
  u.id, 2,
  CASE
    WHEN u.registrationNumber LIKE 'SCH-G1-%'  THEN 4
    WHEN u.registrationNumber LIKE 'SCH-G2-%'  THEN 5
    WHEN u.registrationNumber LIKE 'SCH-G3-%'  THEN 6
    WHEN u.registrationNumber LIKE 'SCH-G4-%'  THEN 7
    WHEN u.registrationNumber LIKE 'SCH-G5-%'  THEN 8
    WHEN u.registrationNumber LIKE 'SCH-G6-%'  THEN 9
    WHEN u.registrationNumber LIKE 'SCH-G7-%'  THEN 10
    WHEN u.registrationNumber LIKE 'SCH-G8-%'  THEN 11
    WHEN u.registrationNumber LIKE 'SCH-G9-%'  THEN 12
    WHEN u.registrationNumber LIKE 'SCH-G10-%' THEN 13
    WHEN u.registrationNumber LIKE 'SCH-G11-%' THEN 14
    WHEN u.registrationNumber LIKE 'SCH-G12-%' THEN 15
  END,
  CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(u.registrationNumber, '-G', -1), '-', 1) AS UNSIGNED),
  'ACTIVE'
FROM user u
WHERE u.registrationNumber LIKE 'SCH-G%';

-- ────────────────────────────────────────────────────────────────────────
-- 5. SAMPLE MARKS (for a few students in Grade 1)
-- ────────────────────────────────────────────────────────────────────────
INSERT INTO marks (Numbers, OutOf, MarkType, Student_id, Subject_id, OrgId)
SELECT
  FLOOR(12 + RAND() * 8), 20, 'Quiz',
  s.Student_id,
  sub.id,
  2
FROM student s
JOIN subject sub ON sub.Course_id = s.Course_id
WHERE s.Course_id IN (4,5,6)  -- grades 1-3
  AND sub.name IN ('Mathematics','English Language','Arabic Language');

SELECT CONCAT('Teachers: ', (SELECT COUNT(*) FROM teacher WHERE OrgId=2),
  ' | Subjects: ', (SELECT COUNT(*) FROM subject WHERE Course_id IN (SELECT id FROM course WHERE Org_id=2)),
  ' | Students: ', (SELECT COUNT(*) FROM student WHERE OrgId=2),
  ' | Marks: ',    (SELECT COUNT(*) FROM marks WHERE OrgId=2)) AS summary;


BEGIN;

------------------------------------------------
-- MUSCLE GROUPS
------------------------------------------------

INSERT INTO "MuscleGroup"(id,description) VALUES
(1,'Chest muscles'),
(2,'Back muscles'),
(3,'Shoulder muscles'),
(4,'Arm muscles'),
(5,'Core muscles'),
(6,'Leg muscles');

INSERT INTO "MuscleGroupTranslation"("groupId",lang,name) VALUES

(1,'en','Chest'),
(1,'uk','Груди'),

(2,'en','Back'),
(2,'uk','Спина'),

(3,'en','Shoulders'),
(3,'uk','Плечі'),

(4,'en','Arms'),
(4,'uk','Руки'),

(5,'en','Core'),
(5,'uk','Корпус'),

(6,'en','Legs'),
(6,'uk','Ноги');

------------------------------------------------
-- MUSCLES (DETAILED)
------------------------------------------------

INSERT INTO "Muscle"(id,description) VALUES

(1,'Pectoralis major'),
(2,'Upper chest'),
(3,'Lower chest'),

(4,'Latissimus dorsi'),
(5,'Trapezius'),
(6,'Rhomboids'),

(7,'Front deltoid'),
(8,'Side deltoid'),
(9,'Rear deltoid'),

(10,'Biceps brachii'),
(11,'Triceps brachii'),
(12,'Forearms'),

(13,'Rectus abdominis'),
(14,'Obliques'),
(15,'Lower abs'),

(16,'Gluteus maximus'),
(17,'Quadriceps'),
(18,'Hamstrings'),
(19,'Adductors'),
(20,'Calves');

------------------------------------------------
-- MUSCLE TRANSLATIONS
------------------------------------------------

INSERT INTO "MuscleTranslation"("muscleId",lang,name) VALUES

(1,'en','Pectoralis Major'),
(1,'uk','Великий грудний'),

(2,'en','Upper Chest'),
(2,'uk','Верх грудей'),

(3,'en','Lower Chest'),
(3,'uk','Низ грудей'),

(4,'en','Latissimus Dorsi'),
(4,'uk','Найширший мʼяз спини'),

(5,'en','Trapezius'),
(5,'uk','Трапецієподібний'),

(6,'en','Rhomboids'),
(6,'uk','Ромбоподібні'),

(7,'en','Front Delts'),
(7,'uk','Передня дельта'),

(8,'en','Side Delts'),
(8,'uk','Середня дельта'),

(9,'en','Rear Delts'),
(9,'uk','Задня дельта'),

(10,'en','Biceps'),
(10,'uk','Біцепс'),

(11,'en','Triceps'),
(11,'uk','Трицепс'),

(12,'en','Forearms'),
(12,'uk','Передпліччя'),

(13,'en','Abs'),
(13,'uk','Прямий мʼяз живота'),

(14,'en','Obliques'),
(14,'uk','Косі мʼязи живота'),

(15,'en','Lower Abs'),
(15,'uk','Нижній прес'),

(16,'en','Glutes'),
(16,'uk','Сідничні'),

(17,'en','Quadriceps'),
(17,'uk','Квадрицепс'),

(18,'en','Hamstrings'),
(18,'uk','Біцепс стегна'),

(19,'en','Adductors'),
(19,'uk','Привідні мʼязи стегна'),

(20,'en','Calves'),
(20,'uk','Литкові');

------------------------------------------------
-- MUSCLE TO GROUP
------------------------------------------------

INSERT INTO "MuscleToGroup"("muscleId","groupId") VALUES

(1,1),
(2,1),
(3,1),

(4,2),
(5,2),
(6,2),

(7,3),
(8,3),
(9,3),

(10,4),
(11,4),
(12,4),

(13,5),
(14,5),
(15,5),

(16,6),
(17,6),
(18,6),
(19,6),
(20,6);

------------------------------------------------
-- EQUIPMENT
------------------------------------------------

INSERT INTO "Equipment"(id,icon) VALUES
(1,'barbell.svg'),
(2,'dumbbell.svg'),
(3,'bodyweight.svg'),
(4,'pullup-bar.svg');

INSERT INTO "EquipmentTranslation"("equipmentId",lang,name) VALUES

(1,'en','Barbell'),
(1,'uk','Штанга'),

(2,'en','Dumbbell'),
(2,'uk','Гантелі'),

(3,'en','Bodyweight'),
(3,'uk','Власна вага'),

(4,'en','Pull-up Bar'),
(4,'uk','Турнік');

------------------------------------------------
-- EXERCISES
------------------------------------------------

INSERT INTO "Exercise"
(id,slug,title,description,type,"createdAt","updatedAt") VALUES

(1,'push-up','Push-up','Bodyweight chest exercise','strength',NOW(),NOW()),

(2,'bench-press','Bench Press','Barbell chest press','strength',NOW(),NOW()),

(3,'pull-up','Pull-up','Bodyweight back exercise','strength',NOW(),NOW()),

(4,'barbell-squat','Barbell Squat','Compound leg movement','strength',NOW(),NOW()),

(5,'plank','Plank','Core stability exercise','balance',NOW(),NOW()),

(6,'dumbbell-curl','Dumbbell Curl','Isolation biceps exercise','strength',NOW(),NOW()),

(7,'tricep-dips','Tricep Dips','Bodyweight triceps exercise','strength',NOW(),NOW());

------------------------------------------------
-- EXERCISE MUSCLES
------------------------------------------------

INSERT INTO "ExerciseMuscle"("exerciseId","muscleId") VALUES

(1,1),
(1,7),

(2,1),
(2,2),

(3,4),

(4,17),
(4,16),

(5,13),
(5,14),

(6,10),

(7,11);

------------------------------------------------
-- EXERCISE EQUIPMENT
------------------------------------------------

INSERT INTO "ExerciseEquipment"("exerciseId","equipmentId") VALUES

(1,3),
(2,1),
(3,4),
(4,1),
(5,3),
(6,2),
(7,3);

COMMIT;
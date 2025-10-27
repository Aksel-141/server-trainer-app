INSERT INTO MuscleList (nameEn, nameUa, description) VALUES
('abdominals', 'Прес', ''),
('ankles', 'Щиколотки', ''),
('biceps', 'Біцепс', ''),
('body', 'Тіло', ''),
('calves', 'Ікри', ''),
('chest', 'Груди', ''),
('elbow', 'Лікті', ''),
('forearms', 'Передпліччя', ''),
('front-shoulders', 'Передні дельти', ''),
('glutes', 'Ягодиці', ''),
('hamstrings', 'Біцепс стегна', ''),
('hands', 'Кисті', ''),
('hips', 'Стегна', ''),
('knees', 'Коліна', ''),
('lats', 'Широчайші', ''),
('lowerback', 'Нижня спина', ''),
('lower-spine', 'Нижній відділ хребта', ''),
('obliques', 'Косі м’язи живота', ''),
('quads', 'Квадрицепс', ''),
('rear-shoulders', 'Задні дельти', ''),
('scapula', 'Лопатки', ''),
('shoulders', 'Плечі', ''),
('traps', 'Трапеції', ''),
('traps-middle', 'Середні трапеції', ''),
('triceps', 'Трицепс', ''),
('upper-spine', 'Верхній відділ хребта', ''),
('wrist', 'Зап’ястя', '');
#-------------------------
INSERT INTO MuscleListGroup (nameEn, nameUa, description) VALUES
('Upper Body', 'Верхня частина тіла', 'Основні м’язи верхньої частини тіла: груди, плечі, руки, трапеції'),
('Lower Body', 'Нижня частина тіла', 'Основні м’язи ніг та таза'),
('Core', 'Кор', 'М’язи корпусу, відповідальні за стабілізацію'),
('Full Body', 'Все тіло', 'Загальні або допоміжні групи м’язів для комплексних вправ');
#-------------------------------
INSERT INTO MuscleToGroup (muscleId, muscleGroupId)
SELECT m.id, g.id
FROM MuscleList m
JOIN MuscleListGroup g ON g.nameEn = 'Upper Body'
WHERE m.nameEn IN (
  'chest', 'shoulders', 'front-shoulders', 'rear-shoulders',
  'biceps', 'triceps', 'forearms', 'traps', 'scapula'
);

INSERT INTO MuscleToGroup (muscleId, muscleGroupId)
SELECT m.id, g.id
FROM MuscleList m
JOIN MuscleListGroup g ON g.nameEn = 'Lower Body'
WHERE m.nameEn IN (
  'calves', 'quads', 'hamstrings', 'glutes', 'ankles', 'knees'
);

INSERT INTO MuscleToGroup (muscleId, muscleGroupId)
SELECT m.id, g.id
FROM MuscleList m
JOIN MuscleListGroup g ON g.nameEn = 'Core'
WHERE m.nameEn IN (
  'abdominals', 'obliques', 'lowerback', 'upper-spine', 'lower-spine'
);

INSERT INTO MuscleToGroup (muscleId, muscleGroupId)
SELECT m.id, g.id
FROM MuscleList m
JOIN MuscleListGroup g ON g.nameEn = 'Full Body'
WHERE m.nameEn IN (
  'body', 'hips', 'hands', 'elbow', 'wrist', 'lats'
);
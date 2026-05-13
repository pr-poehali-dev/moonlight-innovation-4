CREATE TABLE t_p28332968_moonlight_innovation.projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  stage VARCHAR(50) NOT NULL CHECK (stage IN ('В производстве', 'Готово', 'Смонтировано')),
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p28332968_moonlight_innovation.projects (title, description, stage, images) VALUES
('Конусы переходные', 'Изготовление конических переходов большого диаметра из листовой стали', 'Готово', ARRAY['https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/1f4a46f4-11d1-4750-b039-af284daee6e4.jpg', 'https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/685b94c8-cea3-4d65-a4ab-eb434c19598c.jpg']),
('Бункер-накопитель', 'Сборка и сварка цилиндрического бункера с конической воронкой', 'В производстве', ARRAY['https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/70102963-d330-4e3f-b783-f3908b0b9640.jpg']),
('Монтаж бункера на объекте', 'Установка бункера-воронки краном на горнодобывающем предприятии', 'Смонтировано', ARRAY['https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/6dcd51c7-43a2-4802-978d-fd607e23b6e7.jpg', 'https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/b5ea2e60-5c8d-4eb9-984e-e8fb896ac6b4.jpg']);

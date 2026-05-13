ALTER TABLE t_p28332968_moonlight_innovation.projects ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

UPDATE t_p28332968_moonlight_innovation.projects
SET
  title = 'Изготовление и монтаж сорбционных колонн для ЗДК "Золотая Звезда"',
  description = 'Полный цикл: изготовление конусных переходов и бункеров-накопителей, сборка, транспортировка и монтаж на объекте заказчика',
  stage = 'Смонтировано',
  images = ARRAY[
    'https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/1f4a46f4-11d1-4750-b039-af284daee6e4.jpg',
    'https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/685b94c8-cea3-4d65-a4ab-eb434c19598c.jpg',
    'https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/70102963-d330-4e3f-b783-f3908b0b9640.jpg',
    'https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/6dcd51c7-43a2-4802-978d-fd607e23b6e7.jpg',
    'https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/b5ea2e60-5c8d-4eb9-984e-e8fb896ac6b4.jpg'
  ],
  hidden = FALSE
WHERE id = 1;

UPDATE t_p28332968_moonlight_innovation.projects SET hidden = TRUE WHERE id IN (2, 3);

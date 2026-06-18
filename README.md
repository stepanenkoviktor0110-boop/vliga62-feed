# vliga62-feed

Курируемый YML-фид услуг ГК «Высшая лига» (vliga62.ru) для платформы B24U.

У клиента нет источника-YML; на сайте 9 услуг (≤30) → фид собирается скрейпингом страниц услуг
(`build-feed.mjs`): `name`=h1, `description`=первые содержательные абзацы, `picture`=фото услуги,
`url`=страница. Цены нет (quote_based, деньги→менеджер) — `<price>` в фид не кладём (Вариант B).

- Раздаётся на GitHub Pages: `feed.xml`.
- Авто-пересборка — Actions cron каждые 6 ч (`.github/workflows/build-feed.yml`).
- Подключён в кабинете B24U (client_id 643000000006167) как `feed_type=yml`.

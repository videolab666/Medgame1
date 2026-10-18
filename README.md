# Мильна Хвиля

Добра свайп-гра для дітей 5–9 років у лікарні: мильний слід пальця ловить мікробів у бульбашки, фрукти розрізаються на вітаміни, а свої клітини крові чіпати не можна. Є спокійний режим «Перед процедурою» з дихальною вправою.

**Прототип / демо.** Ініціатива автора; не пов'язана офіційно з жодним медичним закладом. Медичні факти мають статус `draft` і потребують перевірки лікарем перед розміщенням у лікарні.

## Принципи

- Без реклами, покупок, реєстрації, трекерів і сторонніх запитів. Прогрес — лише в `localStorage`.
- Без вибухів, трясіння екрана, військової лексики, сирен, вогню й лез (діти з травмою війни, опіковий відділ).
- Повноекранні спалахи не частіше ніж раз на 400 мс (WCAG 2.3.1).
- Без програшу й Game Over; кожні 3 раунди — пропозиція перепочити.
- Уся графіка — оригінальні SVG, згенеровані в коді (`src/render/art.js`, реєстр у `ART_LICENSE.json`).

Повна специфікація: [`docs/superpowers/specs/2026-10-18-mylna-hvylya-design.md`](docs/superpowers/specs/2026-10-18-mylna-hvylya-design.md).

## Запуск

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for src/core
npm run validate   # facts registry, banned words, art licenses
npm run build      # PWA into dist/
```

Dev-only параметри URL: `?quality=high|mid|low` — примусова якість графіки; `?harness` — тестовий харнес (`window.__fast(sec, bot)`) для прогону гри в прихованій вкладці.

## Публікація

```sh
npm run deploy     # tests + validate + build, then pushes dist/ to the gh-pages branch
```

GitHub Pages: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**. Push у `main` лише перевіряє код (workflow `Test and build`); сайт оновлюється після `npm run deploy`.

Інший хостинг: `npm run build` і скопіювати вміст `dist/` (або вміст гілки `gh-pages`) у будь-яку папку сайту — шляхи відносні. Потрібен HTTPS (інакше не працює офлайн-режим); `sw.js` та `index.html` не кешувати надовго.

Після першого відкриття гра працює офлайн (service worker). Для лікарні — QR-код на URL сторінки.

## Структура

```
src/core/     чиста логіка гри (тестується в Node): раунд, спавн, свайп, прогрес, факти
src/render/   PixiJS: сцена, SVG-арт, персонажі, фони
src/fx/       частинки, веселковий слід, ефекти подій, bloom/godrays
src/audio/    процедурний звук WebAudio, слот для озвучки
src/ui/       DOM-екрани: меню, HUD, нагорода, атлас, для батьків
content/      facts.uk.json — реєстр фактів із джерелами
```

## Музика і звуки

Зараз усе звучить процедурно (WebAudio). Записані треки й ефекти підхоплюються автоматично: файли в `public/music/` і `public/sfx/` плюс їхні назви в `index.json`. Промпти для Suno, список назв і інструкція з нарізки: [`docs/music/suno-prompts.md`](docs/music/suno-prompts.md). Кожен файл — запис в `AUDIO_LICENSE.json`.

## Озвучка

Записані фрази кладуться в `public/voice/<id>.mp3` (id фактів — з `content/facts.uk.json`), а їхні id — у `public/voice/index.json`. Код змінювати не треба.

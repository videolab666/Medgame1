# Промпти для Suno AI — музика і звуки «Мильної Хвилі»

Готові промпти для генерації всієї музики гри та окремого треку з усіма звуковими ефектами. Гра сама підхопить файли, щойно вони з'являться в папках (див. «Як підключити»). Поки файлів немає, грає вбудований процедурний звук.

---

## 0. Перед генерацією — важливо

### Ліцензія
- Умови Suno змінюються: перед генерацією перевір актуальні правила на suno.com (Terms / Pricing).
- Генеруй на **платному плані Suno (Pro або Premier)**. Лише тоді треки належать тобі й можуть використовуватись публічно, зокрема в грі для лікарні. Треки з безкоштовного плану — тільки для некомерційного особистого використання, і права на них лишаються в Suno.
- Кожен трек, що піде в гру, запиши в `AUDIO_LICENSE.json`: назва файлу, посилання на пісню в Suno, дата, план підписки. Валідатор `npm run validate` перевіряє, що кожен підключений файл там є.

### Правила звуку (з дизайн-специфікації, R2)
Серед гравців — діти з прифронтових регіонів, з онкогематології та опікового відділення. Тому в **жодному** треку не має бути:
- сирен, тривожних сигналів, гудків;
- вибухів, «бумів», гуркоту, низьких ударів, саббасу;
- маршового барабана, військових фанфар, мідних духових у «бойовому» дусі;
- різких гучних ударів (crash-тарілок, ударів оркестру), раптових сплесків гучності;
- страшних, напружених чи «горор» гармоній.

Додавай ці слова в поле **Exclude styles** (в Advanced Options) кожного треку:

```
sirens, alarm, explosion, boom, heavy drums, sub bass, 808, dubstep, drop, marching snare, military, brass fanfare, epic orchestral hits, cymbal crash, horror, tension, dark, aggressive, distorted, rock, metal, trap, vocals
```

(Для пісні з розділу 3 прибери з цього списку `vocals`.)

### Загальні налаштування
- Режим **Custom**, перемикач **Instrumental** — увімкнено (крім пісні з розділу 3).
- Модель — найновіша доступна (v4.5+ / v5).
- Якщо є повзунки: **Style Influence** — високо (≈70–80 %), **Weirdness** — низько (≈15–25 %).
- Генеруй 2–4 варіанти кожного треку й обирай найрівніший за гучністю, без різких змін.

---

## 1. Фонова музика (цикли)

Усі треки мають бути **рівними за гучністю й темпом**, щоб їх можна було закільцювати. Знадобиться відрізок 40–60 секунд, вирізаний по межах тактів (див. розділ 5).

### 1.1 `menu.mp3` — головне меню
**Title:** Soap Bubble Morning

**Style:**
```
whimsical children's cartoon theme, cheerful and warm, 100 BPM, C major, ukulele strum, glockenspiel melody, marimba, pizzicato strings, soft hand claps, light shaker, bubbly playful, gentle dynamics, seamless loop, instrumental, family-friendly, bright and cozy
```

**Lyrics:**
```
[Instrumental]
[Intro: soft ukulele and glockenspiel]
[Main Theme: playful marimba melody, gentle claps]
[Variation: pizzicato strings answer the melody]
[Main Theme]
[Outro: same as intro, loopable]
```

### 1.2 `hands.mp3` — локація «Долоньки»
**Title:** Bubble Wash Bounce

**Style:**
```
bouncy playful kids game music, 120 BPM, C major, marimba lead, kalimba, pizzicato strings, plucky synth bubbles, light shaker, finger snaps, cheerful and bubbly, steady energy, no sudden changes, seamless loop, instrumental, mobile casual game soundtrack
```

**Lyrics:**
```
[Instrumental]
[Intro: kalimba plucks like bubbles]
[Main Theme: marimba melody, light shaker groove]
[Bridge: pizzicato and soft synth bubbles]
[Main Theme]
[Outro: loopable, same groove]
```

### 1.3 `kitchen.mp3` — «Кухня вітамінів»
**Title:** Vitamin Kitchen Groove

**Style:**
```
sunny funky kids kitchen music, 112 BPM, F major, ukulele strum, xylophone melody, soft round bass, finger snaps, whistled melody, light woodblock, happy and tasty, cartoon cooking show vibe, steady groove, seamless loop, instrumental
```

**Lyrics:**
```
[Instrumental]
[Intro: ukulele and finger snaps]
[Main Theme: xylophone melody over soft bass]
[Variation: whistled melody, woodblock]
[Main Theme]
[Outro: loopable groove]
```

### 1.4 `blood.mp3` — «Клітинкова річка»
**Title:** Little River Journey

**Style:**
```
flowing dreamy kids adventure music, 108 BPM, D major, harp arpeggios, soft electric piano, warm synth pads, gentle marimba, light shaker, floating river feeling, calm but playful, smooth and steady, seamless loop, instrumental, magical and friendly
```

**Lyrics:**
```
[Instrumental]
[Intro: harp arpeggios]
[Main Theme: electric piano melody, flowing pads]
[Variation: marimba joins softly]
[Main Theme]
[Outro: loopable, harp arpeggios]
```

### 1.5 `mouth.mp3` — «Ротик»
**Title:** Minty Sparkle Smile

**Style:**
```
sparkly fresh kids game music, 118 BPM, G major, music box, celesta, plucky synth, glockenspiel, light hand claps, clean and minty, cheerful smile feeling, steady tempo, seamless loop, instrumental, cartoon toothbrush commercial vibe without vocals
```

**Lyrics:**
```
[Instrumental]
[Intro: music box twinkles]
[Main Theme: celesta melody, light claps]
[Variation: glockenspiel sparkles]
[Main Theme]
[Outro: loopable]
```

### 1.6 `tummy.mp3` — «Животик»
**Title:** Friendly Tummy Bounce

**Style:**
```
bouncy cozy kids storybook music, 104 BPM, Bb major, playful bassoon and clarinet, pizzicato strings, marimba, soft woodblock, gentle and funny, friendly characters waddling, warm and round sound, steady tempo, seamless loop, instrumental, orchestral cartoon woodwinds
```

**Lyrics:**
```
[Instrumental]
[Intro: pizzicato strings]
[Main Theme: bassoon and clarinet playful duet]
[Variation: marimba answers]
[Main Theme]
[Outro: loopable]
```

### 1.7 `skin.mp3` — «Шкіра»
**Title:** Sunny Panama Hat

**Style:**
```
sunny summer kids music, 116 BPM, A major, ukulele strum, soft steel pan melody, shaker, hand claps, light bongos, beach picnic feeling, warm and happy, gentle dynamics, seamless loop, instrumental, family-friendly
```

**Lyrics:**
```
[Instrumental]
[Intro: ukulele strum and shaker]
[Main Theme: soft steel pan melody]
[Variation: hand claps and light bongos]
[Main Theme]
[Outro: loopable]
```

### 1.8 `calm.mp3` — режим «Перед процедурою»
Темп підібрано під дихальну вправу в грі: вдих 4 с, видих 4 с. На 60 BPM це рівно 4 удари на вдих і 4 на видих.

**Title:** Balloon Breathing

**Style:**
```
very gentle calming ambient for children, 60 BPM, C major, soft felt piano, warm pads, gentle harp, slow breathing rhythm, phrases of four beats rising then four beats falling, no percussion, no drums, lullaby-like, soothing, steady volume, no sudden changes, seamless loop, instrumental, relaxation before a medical procedure
```

**Lyrics:**
```
[Instrumental]
[Intro: warm pad swell]
[Breathe in: four slow rising piano notes]
[Breathe out: four slow falling piano notes]
[Breathe in]
[Breathe out]
[Harp shimmer, very soft]
[Breathe in]
[Breathe out]
[Outro: loopable pad]
```

### 1.9 `rest.mp3` — екран «Перепочинь»
**Title:** Little Rest

**Style:**
```
soft music box lullaby, 72 BPM, F major, music box, gentle celesta, warm pad, tender and proud, cozy, no percussion, steady volume, seamless loop, instrumental, children's bedtime story feeling
```

**Lyrics:**
```
[Instrumental]
[Intro: music box]
[Main Theme: tender music box melody]
[Main Theme with soft celesta]
[Outro: loopable]
```

### 1.10 `reward.mp3` — джингл нагороди (одноразовий)
Потрібні лише перші **3–5 секунд**: усе інше обріжеш.

**Title:** Sticker Ta-Da

**Style:**
```
very short happy reward jingle for a kids game, bright xylophone and glockenspiel ascending arpeggio, soft chime shimmer, ends on a warm major chord, joyful toy sound, no drums, no brass, under five seconds, instrumental
```

**Lyrics:**
```
[Instrumental]
[Jingle: quick ascending xylophone arpeggio, glockenspiel sparkle, warm major chord]
[End]
```

---

## 2. Звукові ефекти — один трек з усіма звуками

Один трек, у якому всі потрібні ефекти йдуть по черзі з паузами. Його нарізають на окремі файли (розділ 5).

Suno створений для музики, тому може не витримати порядок чи паузи. Згенеруй **4–6 варіантів** і збери найкращі звуки з різних варіантів. Якщо якийсь звук так і не вийде — не страшно: для нього лишиться вбудований процедурний.

**Title:** Mylna Hvylya SFX Pack

**Style:**
```
sound effects library for a children's mobile game, isolated one-shot cartoon sounds, clean dry studio recording, each sound separated by two seconds of silence, no music bed, no beat, no background, soft and friendly, gentle volume, no harsh or loud sounds
```

**Exclude styles:** див. розділ 0, плюс `music, melody, song, beat, rhythm, background music`.

**Lyrics:**
```
[Instrumental]
[Sound effects only, two seconds of silence between each]

[SFX 1: one soft xylophone note C]
[Silence]
[SFX 2: one soft xylophone note D]
[Silence]
[SFX 3: one soft xylophone note E]
[Silence]
[SFX 4: one soft xylophone note G]
[Silence]
[SFX 5: one soft xylophone note A]
[Silence]
[SFX 6: soap bubble pop, light and cute]
[Silence]
[SFX 7: juicy fruit squish, soft and wet, no knife]
[Silence]
[SFX 8: single water droplet bloop]
[Silence]
[SFX 9: cute cartoon giggle, hee-hee, tiny friendly creature]
[Silence]
[SFX 10: bright ascending glockenspiel arpeggio, success]
[Silence]
[SFX 11: soft foamy whoosh with bubbles, two seconds]
[Silence]
[SFX 12: magical shimmering chime swell, protective bubble]
[Silence]
[SFX 13: gentle slow motion harp glissando going down]
[Silence]
[SFX 14: twinkling fairy sparkle]
[Silence]
[SFX 15: short happy toy fanfare on xylophone, no brass]
[Silence]
[SFX 16: soft button tap, small wooden click]
[End]
```

### Що з чого вирізати

| # | Звук | Файл | Де звучить у грі |
|---|---|---|---|
| 1–5 | Ноти ксилофона C, D, E, G, A | `xylo-1.mp3` … `xylo-5.mp3` | Кожен пійманий мікроб і фрукт. Гра сама піднімає октаву на довгих комбо |
| 6 | Лопання бульбашки | `pop.mp3` | Бульбашка з мікробом лопається вгорі |
| 7 | Соковитий «хлюп» | `slice.mp3` | Розрізаний фрукт |
| 8 | Крапля «бульк» | `drop.mp3` | Вітамінка долетіла до баночки |
| 9 | Хихикання | `giggle.mp3` | Зачепили свою клітину («ой!» — і раунд м'яко зупиняється) |
| 10 | Висхідне арпеджіо | `combo.mp3` | Комбо ×3 / ×5 / ×10 |
| 11 | Пінний «вжух» | `wave.mp3` | Бонус «Мильце» / «Щіточка» — мильна хвиля |
| 12 | Чарівний дзвін | `shield.mp3` | Бонус «Щеплення» — купол-щит |
| 13 | Глісандо вниз | `slow.mp3` | Бонус «Латочка» — усе повільно |
| 14 | Блискітки | `sparkle.mp3` | Кінець раунду, відкриття наліпки в атласі |
| 15 | Іграшкові фанфари | `fanfare.mp3` | Екран нагороди (якщо немає `music/reward.mp3`) |
| 16 | Тихий клік | `tap.mp3` | Кнопки меню |

**Альтернатива:** якщо Suno погано робить окремі ефекти, ці 16 звуків можна згенерувати в сервісі, спеціалізованому на звукових ефектах (наприклад, ElevenLabs Sound Effects), за тими самими описами. Ліцензію так само записати в `AUDIO_LICENSE.json`.

---

## 3. Бонус: пісня гри українською (для промо й меню)

Вокальна пісня для промо-ролика, презентації лікарні або як альтернативна музика меню. Тут **Instrumental — вимкнено**. Текст оригінальний, можна правити.

**Title:** Мильна хвиля

**Style:**
```
cheerful Ukrainian children's song, kids choir with a warm female lead, 110 BPM, C major, ukulele, glockenspiel, marimba, hand claps, bubbly and joyful, simple singalong melody, cartoon theme song, gentle and friendly, clear Ukrainian pronunciation
```

**Lyrics:**
```
[Intro]
(хлюп-хлюп, бульк-бульк!)

[Verse 1]
Мило в руки — піни гора,
Бульбашки летять — ура!
Раз, два, три — і до двадцяти,
Чисті ручки будуть в нас завжди!

[Chorus]
Мильна хвиля — хлюп-хлюп-хлюп!
Бульбашки — бульк-бульк-бульк!
Мікробів — у бульбашку, і в небо — па-па!
Мильна хвиля — ла-ла-ла!

[Verse 2]
Червоня несе кисень нам,
Білик пильнує тут і там,
Латочка латає ранку,
Добрик гріє животик зранку.

[Chorus]
Мильна хвиля — хлюп-хлюп-хлюп!
Бульбашки — бульк-бульк-бульк!
Мікробів — у бульбашку, і в небо — па-па!
Мильна хвиля — ла-ла-ла!

[Bridge]
Яблуко, ківі, апельсин —
Вітамінки — дзинь-дзинь-дзинь!

[Final Chorus]
Мильна хвиля — хлюп-хлюп-хлюп!
Ми — команда чистих рук!
(хлоп-хлоп!)

[End]
```

---

## 4. Як підключити до гри

1. Поклади файли в папки:
   - музика → `public/music/<назва>.mp3` (назви з розділу 1: `menu`, `hands`, `kitchen`, `blood`, `mouth`, `tummy`, `skin`, `calm`, `rest`, `reward`);
   - ефекти → `public/sfx/<назва>.mp3` (назви з таблиці розділу 2).
2. Впиши назви наявних файлів у список:
   - `public/music/index.json`, наприклад `["menu", "hands", "calm"]`;
   - `public/sfx/index.json`, наприклад `["pop", "slice", "xylo-1", "xylo-2", "xylo-3", "xylo-4", "xylo-5"]`.
3. Додай записи в `AUDIO_LICENSE.json`.
4. `npm run validate` → `git push`. Гра підхопить файли без змін у коді, а все, чого бракує, продовжить звучати процедурно.

Аудіофайли не завантажуються при першому відкритті: service worker кешує їх під час першого програвання. Тож перший вхід за QR-кодом лишається швидким.

---

## 5. Обробка в Audacity (безкоштовно)

**Музичні цикли**
1. Знайди рівний відрізок 40–60 с без вступу та кінцівки.
2. Довжина такту = `4 × 60 / BPM` секунд (наприклад, на 120 BPM такт = 2 с). Відрізай по межах тактів: тоді шов циклу непомітний.
3. На стику зроби кросфейд 20–50 мс: Effect → Fading → Crossfade Clips.
4. Нормалізуй гучність: Effect → Volume and Compression → Loudness Normalization → **−18 LUFS**. Усі треки мають звучати однаково гучно.
5. Експорт: MP3, 128 kbps, стерео.

**Ефекти**
1. Analyze → Label Sounds: Audacity сам позначить кожен звук за паузами.
2. Підпиши мітки назвами файлів (`pop`, `slice`…).
3. File → Export → Export Multiple → «Split files based on Labels», назва — з мітки.
4. Обріж тишу на початку кожного файлу (до 10 мс), інакше звук запізнюватиметься.
5. Нормалізуй: **−16 LUFS**, піки не вище −1 dBFS. Експорт: MP3, 96 kbps, моно.

// Story data stays independent of the swipe-arcade gameplay.
import { LOCATION_ORDER } from './config.js';
const Y = (text) => ({speaker:'Юлія', actor:'yuliya', text});
const B = (text) => ({speaker:'Білик', actor:'bilyk', text});
const scene = (title,place,...pages) => ({title,place,pages});
export const STORY = Object.freeze({
  welcome: scene('Юлія та Атлас маленьких відкриттів','Початок пригоди',
    Y('Привіт! Я Юлія, головна медсестра. Готовий до незвичайної пригоди?'),
    B('Я хотів прикрасити Атлас бульбашками… Але сторінки переплуталися! Ой-йой!'),
    Y('Допоможемо Білику? На нас чекають шість дивовижних світів!')),
  'intro:hands': scene('Бульбашковий переполох','Долоньки',
    Y('Почнімо з долоньок! Тут живуть кумедні мікроби.'),B('Зловімо їх у мильні бульбашки!')),
  'chapter:hands': scene('Перша сторінка Атласу','Долоньки',
    Y('Чудово! Мило і вода допомагають змивати мікроби з рук.'),B('Перша сторінка повернулася! І навіть не намокла!')),
  'intro:kitchen': scene('Фруктовий карнавал','Кухня вітамінів',
    Y('На Кухні вітамінів усе яскраве й смачне!'),B('Полуничка втекла з кошика! Допоможеш?')),
  'chapter:kitchen': scene('Сторінка смаків','Кухня вітамінів',
    Y('Різні фрукти й овочі допомагають харчуватися різноманітно.'),B('Знайшли другу сторінку! А полуничку можна мені?')),
  'intro:blood': scene('Маленькі помічники','Клітинкова річка',
    Y('Цією річкою мандрують маленькі помічники нашого тіла.'),B('Червоня несе кисень! Пропускай друзів, а мікробів лови!')),
  'chapter:blood': scene('Сторінка маленьких помічників','Клітинкова річка',
    Y('Червоні клітини крові переносять кисень. Інші клітини теж дуже важливі.'),B('Третя сторінка! Червоня передає вітання!')),
  'intro:mouth': scene('Усмішка Зубчика','Ротик',
    Y('Зубчик готується до свята усмішок. Допоможемо йому?'),B('Я теж треную усмішку! Дивись: і-і-і!')),
  'chapter:mouth': scene('Сторінка усмішок','Ротик',
    Y('Чистити зуби щіткою та пастою — добра щоденна звичка.'),B('Зубчик усміхається аж до вух! Четверта сторінка готова!')),
  'intro:tummy': scene('Секрет Добрика','Животик',
    Y('Не всі бактерії однакові. Познайомимося з нашим другом Добриком?'),B('Добрику, ми в гості! Обіцяю нічого не переплутати!')),
  'chapter:tummy': scene('Сторінка добрих сусідів','Животик',
    Y('У кишківнику живуть бактерії, серед яких багато корисних.'),B('П’ята сторінка знайдена! Добрик запрошує ще!')),
  'intro:skin': scene('Чарівний щит','Шкіра',
    Y('Шкіра захищає наше тіло. А Латочка знає, як допомагають тромбоцити.'),B('Залишилася остання сторінка! Вирушаймо!')),
  'chapter:skin': scene('Остання сторінка Атласу','Шкіра',
    Y('Шкіра створює захисний бар’єр, а тромбоцити допомагають зупиняти кровотечу.'),B('Шоста сторінка! Наш Атлас зібрано!')),
  finale: scene('Друг маленьких відкриттів','Атлас зібрано!',
    Y('Ура! Ми зібрали шість сторінок Атласу! Ти стільки всього дізнався!'),
    B('А можна я ще раз прикрашу його бульбашками?'),
    Y('Білику-у-у! Тільки обережно! Повертайся грати, коли захочеш!')),
});
export const chapterId = (loc) => 'chapter:' + loc;
export const storyFinished = (state,id) => Boolean(state.story?.[id]);
export const pagesCollected = (state) => LOCATION_ORDER.filter((l) => storyFinished(state,chapterId(l))).length;
export function beforeLocation(state,loc) {
  if (!LOCATION_ORDER.includes(loc)) return [];
  const ids = ['welcome','intro:' + loc];
  if ((state.rounds?.[loc] ?? 0) >= 3) ids.push(chapterId(loc));
  if (LOCATION_ORDER.every((l) => (state.rounds?.[l] ?? 0) >= 3)) ids.push('finale');
  return ids.filter((id) => !storyFinished(state,id));
}
export function afterRound(state,loc) {
  if (!LOCATION_ORDER.includes(loc)) return [];
  const ids = [];
  if ((state.rounds?.[loc] ?? 0) >= 3) ids.push(chapterId(loc));
  if (LOCATION_ORDER.every((l) => (state.rounds?.[l] ?? 0) >= 3)) ids.push('finale');
  return ids.filter((id) => !storyFinished(state,id));
}
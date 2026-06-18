// Малый курируемый фид услуг ГК «Высшая лига» (vliga62.ru).
// Источник YML у клиента отсутствует; на сайте 9 услуг (≤30) → собираем сами (SKILL.md Шаг 5).
// Услуга = карточка фида: name=h1, description=первые содержательные <p>, picture=фото услуги, url=страница.
// Цены нет (quote_based, money→менеджер) → Вариант B §21.4: <price> в фид НЕ кладём.

import { writeFileSync } from 'node:fs';

const SERVICES = [
  ['arenda-spetstekhniki', 'https://vliga62.ru/arenda-spetstekhniki/'],
  ['asfaltirovka', 'https://vliga62.ru/asfaltirovka-and-blagoustroystvo/'],
  ['demontazh', 'https://vliga62.ru/demontazhnye-raboty-lyuboy-slozhnosti-ruchnoy-demontazh-mekhanizirovannyy-spetstekhnikoy/'],
  ['zemelnye-raboty', 'https://vliga62.ru/zemelnye-raboty-ryte-kotlovanov-obratnaya-zasypka-peska-with-uplotneniem-and-t-d/'],
  ['betonnye-raboty', 'https://vliga62.ru/betonnye-raboty/'],
  ['postavka-materialov', 'https://vliga62.ru/postavka-materialov/'],
  ['vyvoz-othodov', 'https://vliga62.ru/vyvoz-and-utilizatsiya-otkhodov/'],
  ['stroitelstvo-angarov', 'https://vliga62.ru/stroitelstvo-angarov-skladov-iz-metallokonstruktsiy-under-klyuch/'],
  ['recikling', 'https://vliga62.ru/retsikling-zhelezobetona/'],
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function decode(s) {
  return s
    .replace(/&#8212;/g, '—').replace(/&#8211;/g, '–').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&#171;/g, '«').replace(/&#187;/g, '»').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&mdash;/g, '—').replace(/&ndash;/g, '–');
}
function xmlEsc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function strip(s) { return decode(s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); }

async function fetchPage(url) {
  const backoff = [0, 2000, 5000, 9000, 15000];
  for (let i = 0; i < backoff.length; i++) {
    if (backoff[i]) await sleep(backoff[i]);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'ru,en;q=0.8' } });
      if (r.status === 200) return await r.text();
      console.error(`  ${url} → ${r.status}, retry`);
    } catch (e) { console.error(`  ${url} → ${e.message}, retry`); }
  }
  throw new Error(`failed ${url}`);
}

function extract(html, id, url) {
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  const name = strip(h1) || id;
  // первые 2 содержательные <p> страницы услуги
  const ps = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => strip(m[1]))
    .filter(t => t.length >= 40 && !/cookie|политик|©|обработк персональных/i.test(t));
  let description = ps.slice(0, 2).join(' ');
  if (description.length > 700) description = description.slice(0, 697).replace(/\s\S*$/, '') + '…';
  // фото услуги: первый контентный upload, кроме иконок/логотипов
  const imgs = [...html.matchAll(/https:\/\/vliga62\.ru\/wp-content\/uploads\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi)]
    .map(m => m[0])
    .filter(u => !/значок|cropped|logo|about-home|favicon|icon/i.test(u));
  const picture = imgs[0] || '';
  return { id, name, description, picture, url };
}

const items = [];
for (const [id, url] of SERVICES) {
  console.error(`fetch ${id}…`);
  const html = await fetchPage(url);
  const it = extract(html, id, url);
  console.error(`  name="${it.name}" descLen=${it.description.length} pic=${it.picture ? 'yes' : 'NO'}`);
  items.push(it);
  await sleep(1200);
}

const offers = items.map(it => `      <offer id="${xmlEsc(it.id)}" available="true">
        <url>${xmlEsc(it.url)}</url>
        ${it.picture ? `<picture>${xmlEsc(it.picture)}</picture>` : ''}
        <categoryId>1</categoryId>
        <vendor>ГК «Высшая лига»</vendor>
        <vendorCode>${xmlEsc(it.id)}</vendorCode>
        <currencyId>RUB</currencyId>
        <quantity>1</quantity>
        <name>${xmlEsc(it.name)}</name>
        <description>${xmlEsc(it.description)}</description>
      </offer>`).join('\n');

const yml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2026-06-18">
  <shop>
    <name>ГК «Высшая лига»</name>
    <company>ГК «Высшая лига»</company>
    <url>https://vliga62.ru</url>
    <currencies><currency id="RUB" rate="1"/></currencies>
    <categories><category id="1">Услуги</category></categories>
    <offers>
${offers}
    </offers>
  </shop>
</yml_catalog>
`;

writeFileSync(new URL('./feed.xml', import.meta.url), yml, 'utf8');
console.error(`\nDONE: ${items.length} offers → feed.xml`);

# ADR 0002: Lajky jako tabulka s unikátní dvojicí, počet se počítá dotazem

- **Status:** Přijato (2026-11-24)
- **Zdroj:** [Lajky quacků: případy](../../cases.md)

## Kontext

Lidé chtějí dát najevo, že se jim quack líbí, aniž by odpovídali. U každého quacku, včetně odpovědí, je tlačítko a počet lajků. Každý uživatel smí quack lajknout jen jednou a lajk vzít zpět. Vlastní quack lajkovat smí, moderátor nemá zvláštní práva a nikde se nezobrazuje, kdo lajknul.

Požadavky z případů, které volbu ovlivňují:

- jeden uživatel, jeden lajk na quack, i při souběžných požadavcích (P3, A3, A4),
- lajk i odlajk jsou idempotentní, opakované volání nevrací chybu (P3, P4, A5),
- `likeCount` a `likedByMe` se počítají na serveru (P5, A9),
- smazání quacku i uživatele maže lajky (A12, A13),
- zástupný řádek ze [ADR 0001](0001-smazany-quack-jako-zastupny-radek.md) nejde lajkovat a nemá počet (P8, P12, A8, A11).

## Rozhodnutí

Lajky se ukládají do nové tabulky **`quack_like`** a počet se **počítá dotazem**, bez počítadla na `quack`:

- model `QuackLike` s `quackId`, `userId` a `createdAt`,
- `@@unique([quackId, userId])` hlídá „jeden uživatel, jeden lajk“ v databázi, stejně jako u `PollVote`,
- cizí klíče na quack i uživatele mají `onDelete: Cascade`,
- `PUT /api/quacks/:id/like` vkládá řádek s ignorováním duplicity, `DELETE /api/quacks/:id/like` řádek maže (`deleteMany`). Obě volání vrací aktuální `{ likeCount, likedByMe }`. Cesty jsou zatím návrh,
- uživatel se bere vždy ze session, nikdy z těla ani parametrů,
- `GET /api/quacks` vrací u každého živého quacku `likeCount` a `likedByMe` a nikdy seznam lajkujících,
- quack se `deletedAt` nebo neexistující quack vrací 404 a nic se nezapíše,
- při změně quacku na zástupný řádek služba v téže transakci smaže jeho lajky (řádek se fyzicky nemaže, cascade se nespustí), podobně jako hlasy ankety.

## Zvažované varianty

- **Jen počítadlo `likeCount` na `quack`.** Nejrychlejší čtení a žádná nová tabulka. **Zamítnuto:** bez záznamu, kdo lajknul, nejde vynutit jeden lajk na uživatele, spočítat `likedByMe` ani lajk vzít zpět. Nesplní P3, P5 a A3. Historii lajků by nešlo zpětně dopočítat.
- **Tabulka `quack_like` i denormalizované `likeCount` na `quack`.** Rychlý výpis a možnost řadit podle lajků. **Zamítnuto (zatím):** vzniknou dva zdroje pravdy. Zástupný řádek i smazání uživatele (A13) by počítadlo museli opravovat ručně, protože cascade ho sám neupraví. Řazení podle lajků nikdo nechce a výkon zatím není měřený problém. Počítadlo jde přidat později bez ztráty dat.
- **Tabulka s počtem počítaným dotazem (zvoleno).** Jediný zdroj pravdy, souběh a idempotenci řeší databáze, tabulka `quack` se nemění a vzor už v projektu je.

## Důsledky

**Pro zbytek aplikace**

- Každý dotaz, který vrací quacky (feed, _Moje_, odpovědi), musí přidat `likeCount` a `likedByMe` a u zástupných řádků je vynechat.
- Zápis lajku musí zachytit porušení unikátnosti, nebo použít vkládání s ignorováním duplicit, aby souběžné `PUT` nevrátily 500 (A4).
- Zástupný řádek: služba, která quack mění na zástupný řádek, musí mazat i lajky. Spoléhat na cascade nejde. Je to další místo vedle mazání hlasů ankety.
- Pravidlo „kdo smí“ je v service ze session. K němu patří unit testy (P10, P11) a integrační testy, které selžou po odstranění serverové kontroly (A6, A8, A14).
- Smazání uživatele kaskádou smaže jeho lajky a počty klesnou samy, protože se počítají z tabulky.

**Těžko vratné**

- Nic podstatného. Tabulku `quack_like` lze později doplnit denormalizovaným počítadlem migrací s doplněním z existujících řádků.

**Rizika a co sledovat**

- Každý výpis feedu počítá agregát. Je potřeba index na `quackId` (pokryje ho unikátní dvojice). Až bude počet lajků nebo quacků měřitelně zpomalovat feed, nebo vznikne řazení podle oblíbenosti, vrátit se k počítadlu jako samostatnému rozhodnutí.
- Tabulka ukládá, kdo lajknul, i když to UI nezobrazuje. Zobrazení lajkujících je mimo rozsah a vyžádá si vlastní příběh i kontrolu soukromí.

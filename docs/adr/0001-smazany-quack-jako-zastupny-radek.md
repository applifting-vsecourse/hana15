# ADR 0001: Smazaný quack s odpověďmi zůstává jako zástupný řádek

- **Status:** Přijato (2026-11-10)
- **Zdroj:** [Smazaný quack nebo odpověď nerozbije vlákno](../../stories/delete-with-replies.md), [Odpověď na quack](../../stories/replies.md)

## Kontext

Dnes je smazání quacku fyzické a úplné: řádek zmizí a kaskádou s ním ankety a hlasy. Odpovědi na quack to mění. Product Owner chce dvě věci současně:

- odpovědi patří těm, kdo je napsali, takže smazání quacku je nesmí odnést s sebou,
- když někdo svůj quack smaže, jeho obsah musí z aplikace opravdu zmizet.

Řádek, na který se odkazují cizí odpovědi, tedy nesmí zmizet, ale nesmí v něm zůstat nic z toho, co autor smazal. Je to rozhodnutí o tvaru tabulky `quack`, na které stojí všechno, co quacky čte nebo píše: feed, _Moje_, ankety, mazání autora i moderátora, seed a typy na frontendu.

## Rozhodnutí

Quack s odpověďmi se při smazání **nemaže fyzicky, ale mění se na zástupný řádek** (tombstone):

- tabulka `quack` dostane `deletedAt DateTime?`,
- `text` a `userId` se stanou nullable a `mood` se u zástupného řádku nuluje,
- služba v jedné transakci smaže hlasy a volby ankety a vynuluje `text`, `mood` a `userId` a nastaví `deletedAt`,
- CHECK v migraci hlídá tvar: `deletedAt` je prázdné právě tehdy, když jsou `text` a `userId` vyplněné (a `mood` prázdné, když je `deletedAt` vyplněné),
- quack nebo odpověď, na kterou nikdo nereagoval, se maže fyzicky jako dnes,
- cizí klíče `threadId` a `replyToId` mají `onDelete: Restrict`, takže řádek s odpověďmi nejde smazat fyzicky omylem ani souběhem.

Obsah smazaného quacku tedy v databázi opravdu není. Zůstává jen identita řádku, čas vytvoření a vazby na odpovědi.

## Zvažované varianty

- **Zachovat `userId` a text přepsat na prázdný řetězec.** Žádné nullable sloupce a nulový dopad na typy. **Zamítnuto:** autor zůstane v databázi, což odporuje „opravdu zmizet“ a požadavku, že autora smazaného obsahu nejde zjistit.
- **Obsah do vedlejší tabulky `quack_content` (1:1), smazání = smazat řádek obsahu.** Žádné nullable sloupce a „smazáno“ je chybějící obsah. **Zamítnuto:** každé čtení quacku je join a musí se přepsat feed, anketa, seed i testy. Je to největší refaktor existujícího kódu a pro tuto featuru neúměrný.
- **Smazat quack i s odpověďmi (`Cascade`).** Nejjednodušší. **Zamítnuto:** odporuje zadání, že odpovědi patří těm, kdo je napsali.
- **Přesunout odpovědi do feedu jako samostatné quacky.** **Zamítnuto:** odpovědi ztratí kontext, kvůli kterému vznikly.

## Důsledky

**Pro zbytek aplikace**

- `text` je v Prisma typech `string | null` a `userId` také. Změna se propíše do DTO, zod schémat a frontendových typů a každý kód, který quack čte, musí počítat s tím, že autor nebo text chybí. To platí i mimo odpovědi, například v seedu a testech.
- Každý nový dotaz nad `quack` musí rozlišit živé a zástupné řádky. Feed a _Moje_ je rozlišují přes `threadId IS NULL` a `deletedAt`. Zástupné řádky nemají `userId`, takže _Moje_ je neukáže samo.
- Server nikdy nevrací obsah zástupného řádku. Skrytí v UI není jediná ochrana a patří k tomu test odpovědi API.
- Mazání ankety už nestojí jen na kaskádě. U zástupného řádku řádek zůstává a služba musí hlasy a volby smazat sama.
- Počet odpovědí musí zástupné řádky nepočítat (`deletedAt IS NULL`).

**Smazání uživatele**

- Smazání uživatele kaskádou smaže jeho živé quacky. Má-li některý cizí odpovědi, `Restrict` smazání uživatele zablokuje. Mazání účtů dnes v aplikaci není. Až vznikne, musí řešit, co se s takovým quackem stane (typicky ho změnit na zástupný řádek).

**Těžko vratné**

- Po vzniku prvního zástupného řádku už nejde vrátit `NOT NULL` u `text` a `userId` bez ztráty dat. Pořadí „migrace, pak kód“ je bezpečné, ale cesta zpět ne.
- Zástupný řádek, jehož odpovědi se později všechny smažou, zůstane. Úklid takových řádků není v rozsahu a bude potřeba samostatné rozhodnutí.

**Co se nemění**

- Smazání quacku bez odpovědí zůstává trvalé a úplné, jako v [moderator-delete.md](../../stories/moderator-delete.md).

# Lajky quacků: případy

Požadavek: lidé chtějí dát najevo, že se jim quack líbí, aniž by odpovídali. U každého quacku je tlačítko na lajk a počet lajků. Každý může quack lajknout jen jednou a lajk vzít zpět.

Rozhodnutí: lajkují se všechny quacky včetně odpovědí. Vlastní quack lajkovat smím. Moderátor nemá žádná zvláštní práva. Lajk je jen ve feedu, samostatný detail se neřeší. Nikde se nezobrazuje, kdo lajknul.

## 1. Pravidla (unit testy, service)

**P1 Lajk zvýší počet z 0 na 1** (příklad zadavatele)

- given: quack bez lajků, přihlášený uživatel A
- when: A quack lajkne
- then: počet je 1, `likedByMe` je true

**P2 Odlajk sníží počet z 1 na 0** (příklad zadavatele)

- given: quack s jedním lajkem od A
- when: A lajk vezme zpět
- then: počet je 0, `likedByMe` je false

**P3 Jeden uživatel, jeden lajk**

- given: A už quack lajknul
- when: A lajkne znovu
- then: počet zůstane 1, žádná chyba, vrátí se aktuální stav

**P4 Odlajk bez lajku je idempotentní**

- given: A quack nelajknul
- when: A zavolá odlajk
- then: počet se nezmění, žádná chyba, vrátí se aktuální stav

**P5 Lajky různých uživatelů se sčítají**

- given: A a B lajknou stejný quack
- when: A lajk vezme zpět
- then: počet je 1, A má `likedByMe` false, B true

**P6 Vlastní quack smím lajkovat**

- given: A je autor quacku
- when: A quack lajkne
- then: lajk se započte (počet 1)

**P7 Odpověď se lajkuje jako quack**

- given: odpověď na quack
- when: uživatel odpověď lajkne
- then: lajk se započte jen odpovědi, rodičovský quack má počet beze změny

**P8 Smazaný quack (zástupný řádek, ADR 0001) nejde lajkovat**

- given: quack se `deletedAt` (smazaný, má odpovědi)
- when: uživatel zkusí lajk nebo odlajk
- then: služba vyhodí not found, nic se nezapíše

**P9 Neexistující quack**

- given: id quacku, které neexistuje
- when: uživatel zkusí lajk nebo odlajk
- then: služba vyhodí not found

**P10 Uživatel se bere ze session, ne z parametru**

- given: požadavek nese cizí `userId` v těle nebo parametrech
- when: A lajkne
- then: lajk se zapíše A, cizí `userId` se ignoruje

**P11 Moderátor má stejná pravidla**

- given: moderátor M
- when: M lajkne quack dvakrát a pak odlajkne
- then: chová se jako P1 až P4, žádná výjimka z role

**P12 Zástupný řádek nemá počet**

- given: smazaný quack, který dřív měl lajky
- when: se sestaví výpis
- then: řádek nemá počet ani `likedByMe`

## 2. Chování API (integrační testy, HTTP + databáze)

Cesty jsou návrh: `PUT /api/quacks/:id/like` a `DELETE /api/quacks/:id/like`. `GET /api/quacks` vrací u každého quacku `likeCount` a `likedByMe`.

**A1 Lajk**

- given: přihlášený A, quack bez lajků
- when: `PUT /api/quacks/:id/like`
- then: 200, tělo `{ likeCount: 1, likedByMe: true }`, v databázi je jeden řádek

**A2 Odlajk**

- given: A quack lajknul
- when: `DELETE /api/quacks/:id/like`
- then: 200, `{ likeCount: 0, likedByMe: false }`, řádek je pryč

**A3 Dvojí lajk**

- given: A už lajknul
- when: `PUT` podruhé
- then: 200, `likeCount` 1, v databázi stále jeden řádek (unikátní dvojice uživatel + quack)

**A4 Souběžné lajky**

- given: A pošle dva `PUT` současně
- when: oba doběhnou
- then: oba 200, v databázi jeden řádek, žádná 500

**A5 Odlajk bez lajku**

- given: A quack nelajknul
- when: `DELETE`
- then: 200, `likeCount` beze změny, `likedByMe` false

**A6 Bez session**

- given: žádná session
- when: `PUT`, `DELETE` i `GET /api/quacks`
- then: všechny vrátí 401, nic se nezapíše

**A7 Neexistující quack**

- given: neexistující id
- when: `PUT` i `DELETE`
- then: 404

**A8 Smazaný quack se zástupným řádkem**

- given: quack se `deletedAt` a odpověďmi
- when: `PUT` i `DELETE`
- then: 404, nic se nezapíše

**A9 Výpis nese lajky**

- given: quack s lajky od A a B, přihlášený A
- when: `GET /api/quacks`
- then: u quacku je `likeCount` 2 a `likedByMe` true; pro přihlášeného C je `likedByMe` false; v odpovědi není seznam lajkujících

**A10 Odpovědi ve výpisu**

- given: odpověď s lajkem
- when: `GET /api/quacks`
- then: odpověď má vlastní `likeCount` a `likedByMe`

**A11 Zástupný řádek ve výpisu**

- given: smazaný quack s odpověďmi a dřívějšími lajky
- when: `GET /api/quacks`
- then: řádek nemá `likeCount` ani `likedByMe` (ani text, ani autora podle ADR 0001)

**A12 Smazání quacku maže lajky**

- given: quack bez odpovědí s lajky
- when: autor quack smaže
- then: lajky v databázi zmizí

**A13 Smazání uživatele maže jeho lajky**

- given: uživatel U lajknul dva cizí quacky
- when: U je smazán
- then: jeho lajky zmizí a počty na těch quacích klesnou o 1

**A14 Cizí userId se ignoruje**

- given: `PUT` s cizím `userId` v těle nebo query
- when: požadavek proběhne
- then: lajk patří uživateli ze session

**A15 Moderátor**

- given: přihlášený moderátor
- when: lajkne a odlajkne
- then: stejné výsledky jako u A1 až A5; nemůže odebrat cizí lajk, jen ten svůj

**A16 Neplatné id**

- given: `:id` není platné id
- when: `PUT`
- then: 4xx (podle konvence stávajících endpointů), nic se nezapíše

## 3. End-to-end (Playwright)

**E1 Lajk a odlajk ve feedu** (příklady zadavatele)

- given: přihlášený uživatel, ve feedu quack s počtem 0
- when: klikne na tlačítko lajku
- then: tlačítko je označené, počet je 1; po obnovení stránky to platí dál
- when: klikne znovu
- then: tlačítko je neoznačené, počet je 0; po obnovení stránky to platí dál

**E2 Nulový počet**

- given: quack bez lajků
- then: u tlačítka je vidět 0

**E3 Lajk odpovědi**

- given: quack s odpovědí
- when: uživatel lajkne odpověď
- then: odpověď má 1, rodičovský quack 0

**E4 Lajk jiného uživatele**

- given: quack lajknutý uživatelem B, přihlášený A
- then: A vidí počet 1 a neoznačené tlačítko; po A-ově lajku vidí 2 a označené; nikde není vidět, kdo lajknul

**E5 Zamítnutí serverem vrací původní stav**

- given: server na lajk odpoví chybou (podle testovací techniky, např. zachycený požadavek)
- when: uživatel klikne
- then: počet i označení se vrátí do původního stavu (optimistická změna se zruší)

**E6 Zástupný řádek**

- given: smazaný quack s odpověďmi
- then: v řádku není tlačítko lajku ani počet

## Mimo rozsah

- zobrazení, kdo quack lajknul
- samostatný detail quacku
- oznámení autorovi o lajku
- chování pro nepřihlášené v UI (feed je za přihlášením; řeší jen server, viz A6)

## Technické poznámky

- Tabulka lajků má unikátní dvojici (uživatel, quack) a cascade na smazání quacku i uživatele.
- Počet a `likedByMe` se počítají na serveru, ne v klientovi.
- Mutace v UI je optimistická; `invalidateQueries` se volá s `void` (viz CLAUDE.md).
- Pravidlo "kdo smí" se rozhoduje v service ze session. Pro ně musí být service unit test (P10, P11) a e2e/integrační test, který selže po odstranění serverové kontroly (A6, A8, A14).

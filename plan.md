# Plán implementace: ankety ve feedu

Zdroj: [stories/poll.md](stories/poll.md) (commit `44789df`). Všechna rozhodnutí jsou ve story uzavřená, žádná otevřená otázka nezbyla.

## Výchozí stav (ověřeno v repu 13. 10. 2026)

- V repu je **jen story**. Žádný kód ankety neexistuje: `schema.prisma` nemá modely anket, backend ani frontend o anketách nevědí, komponenta `Switch` chybí.
- Pracovní strom je čistý (jen tento `plan.md`).
- **Zbytky po zahozené první verzi mimo git**, které je třeba uklidit dřív, než se začne (krok 0):
  - prázdná složka `apps/backend/prisma/migrations/20261013120000_add_polls/`
  - v lokální dev DB zůstaly tabulky `poll_option`, `poll_vote` a záznam o migraci `20261013120000_add_polls` v `_prisma_migrations`
  - vygenerovaný Prisma klient (`src/generated/`, ignorovaný gitem) ještě obsahuje modely `PollOption` a `PollVote`
- Dev DB je navíc rozjetá oproti repu: má aplikovanou migraci `20261013090000_add_user_profile_fields`, která v repu není. Kvůli tomu `prisma migrate dev` odmítá běžet (chce DB resetovat). Nic nesmí vést k `migrate reset`.

## Model dat

Anketa nemá vlastní tabulku. Quack, který má možnosti, je anketa (0 možností = běžný quack). „Poll id“ v logu je tedy `quack.id`.

```
user 1 ──< quack 1 ──< poll_option 1 ──< poll_vote >── 1 user
                  └──────────────────────< poll_vote
```

**`poll_option`**

- `id` (cuid), `quackId` → `quack.id` (`ON DELETE CASCADE`), `text` `VARCHAR(60)`, `position` (pořadí v anketě)
- index na `quackId`

**`poll_vote`**

- `id` (cuid), `quackId` → `quack.id`, `userId` → `user.id`, `optionId` → `poll_option.id` (všechny `ON DELETE CASCADE`), `createdAt`, `updatedAt`
- **`UNIQUE (quackId, userId)`**: jeden člověk, jeden hlas na anketu. Zaručuje to databáze, ne kód.
- index na `optionId` (počítání hlasů)

Změna hlasu je `UPDATE optionId` na stejném řádku. Hlas se nikdy nemaže, jen přesouvá. Smazání uživatele nebo quacku smaže i hlasy (`CASCADE`).

## Co stavět a v jakém pořadí

Zdola nahoru, každý krok jde ověřit sám a nic dalšího ho nepotřebuje měnit.

### 0. Úklid po první verzi (před čímkoli jiným)

Jde o změnu lokální dev DB, takže před spuštěním potřebuje potvrzení. Tabulky obsahují jen zkušební data.

1. Smazat prázdnou složku migrace `20261013120000_add_polls`.
2. V dev DB: `DROP TABLE poll_vote, poll_option;` a `DELETE FROM _prisma_migrations WHERE migration_name = '20261013120000_add_polls';`. Ostatní data a migrace zůstanou. Žádný `migrate reset`.
3. `pnpm backend prisma:generate`, aby klient odpovídal schématu.

### 1. Databáze

- Do `schema.prisma` přidat `PollOption` a `PollVote` podle sekce Model dat, relace `Quack.pollOptions`, `Quack.pollVotes`, `User.pollVotes`.
- Migrace **ručně** (`prisma/migrations/<časové razítko>_add_polls/migration.sql`) kvůli rozjeté dev DB. Aplikovat `pnpm backend migrate` (`migrate deploy`). `prisma migrate dev` nepoužít, dokud DB není srovnaná.
- `prisma generate`.

### 2. Backend (modul `quack`)

- **Doména** (`domain/quack.ts`): konstanty 2/5/60, typy `Poll`, `PollOption`; `Quack.poll: Poll | null`.
- **Repozitář**:
  - `getQuacks(userId, filter?)` načte možnosti s `_count.votes` a vlastním hlasem přihlášeného (`votes where userId`). Hlasy se počítají v databázi, žádný cache.
  - `createQuack` vytvoří možnosti spolu s quackem v jedné operaci (nested create).
  - `vote({quackId, optionId, userId})`: ověří, že možnost patří k danému quacku (jinak `null`), pak **`upsert` na `quackId_userId`**. Dva souběžné kliky nevytvoří dva hlasy ani špatné součty.
  - `getPoll(quackId, userId)` vrací aktuální čísla.
- **Služba**: `createQuack` ořízne možnosti, odmítne duplicity bez ohledu na velikost písmen (`400`), zaloguje `Poll created: userId=… pollId=…`. `vote` vrací `404`, když možnost není v anketě, jinak loguje `Poll vote: userId=… pollId=…`. Text otázky ani možností se nelogují.
- **API**:
  - `POST /api/quacks`: nové volitelné `pollOptions: string[]`, DTO: 2–5 položek, neprázdné, max 60 znaků, ořezané.
  - `GET /api/quacks`: každý quack má `poll: { options: [{id, text, votes}], myOptionId } | null`.
  - `POST /api/quacks/:id/vote` s `{ optionId }` vrací aktuální `poll` (`200`).
  - Swagger popisy u všech nových polí.
- **Testy** (`quacks.service.spec.ts`): oříznutí a duplicity, log bez obsahu, `404` při cizí možnosti, úprava stávajících fixtur (`poll: null`, nový první argument `getQuacks`). Seed `create-quack.ts` vrací doménový typ, doplnit `poll: null`.
- Ověření: `tsc`, `eslint`, `jest` v `apps/backend`. Pozor na pravidlo `explicit-function-return-type`: Prisma include helper potřebuje inferovaný typ, tam patří cílený `eslint-disable` s komentářem proč.

### 3. Frontend: data

- `quackSchemas.ts`: `pollSchema`, `quack.poll` nullable, konstanty 2/5/60.
- `addQuack` posílá `pollOptions`; nový `votePoll` (`POST quacks/:id/vote`).
- `pollResults.ts`: čisté funkce `totalVotes`, `percentOf` (celé procento), `withVote` (optimistická změna: starý hlas −1, nový +1, klik na vlastní volbu nic nemění).
- `useVotePoll(quackId)`: mutace s **optimistickým updatem** přes všechny seznamy (`quackKeys.lists()`), při chybě **vrátí přesně předchozí stav**, při úspěchu dosadí čísla ze serveru a seznam znovu načte. Každá anketa má vlastní mutaci, takže chyba se ukáže u správné ankety. Exportuje `VOTE_MUTATION_KEY`.
- Stávající fixtury (`QuackList.test.tsx`, ukázkové quacky v `routes/index.tsx`) dostanou `poll: null`, jinak type-check padne.

### 4. Frontend: feed

- `QuackPoll` pod textem quacku (v `QuackItem`): možnosti jako `<button aria-pressed>`, počet + procenta (`3 · 50 %`), zvýrazněná vlastní volba, celkem hlasů (`1 vote` / `6 votes`); anketa bez hlasů ukáže `0` a _Be the first to vote_ bez procent.
- Při chybě: _Your vote wasn't saved._ + _Try again_ (`role="alert"`). Zmizí po úspěšném opakování, novém hlasu nebo reloadu.
- `routes/_ProtectedPages/quacks.tsx`: `refetchInterval` 5 s (hlasy ostatních bez reloadu) a **vypnutý, dokud probíhá hlasování** (`useIsMutating` s `VOTE_MUTATION_KEY`), aby starší odpověď nepřepsala optimistická čísla.
- Dodržet [DESIGN.md](DESIGN.md): žádná karta v kartě, jen sémantické barvy, žádné stíny, mezery ze škály.

### 5. Frontend: formulář

- `Switch` přes `pnpm dlx shadcn@latest add switch` (pravidlo z CLAUDE.md). **Past:** CLI vygeneruje `import { cn } from "cn"` a přidá npm balíček `cn` do `package.json`. Opravit import na `@/lib/utils`, `package.json` a `pnpm-lock.yaml` vrátit přes `git checkout`, odstranit `shadow-xs`.
- `QuackForm`: přepínač _Add poll_ (výchozí vypnuto), po zapnutí se popisek pole změní na _Question_ a objeví se `PollFields` (`useFieldArray`): 2 pole na začátku, _Add option_ do 5 (u 5 zmizí), křížek s `aria-label` nikdy pod 2.
- Validace zodem v klientu zrcadlí server: prázdná, delší než 60, duplicita bez ohledu na velikost písmen. Zpráva stojí pod konkrétním polem (_Same as option 1_). Ověřit testem, že `superRefine` běží i když jiná pole mají chybu.
- Po odeslání se formulář resetuje včetně přepínače.
- Lint v projektu vyžaduje boolean s prefixem `is/has/can/should…` (proměnné i props), např. `hasPoll`, `isSelected`, `isDisabled`.

### 6. Testy frontendu

- `pollResults`: `withVote` (první hlas, přesun, klik na vlastní volbu), `percentOf`.
- `QuackPoll`: čísla a procenta, prázdná anketa, zvýraznění, klik mění čísla hned, chyba vrací stav a ukáže _Try again_, klik na vlastní volbu nic neposílá.
- `QuackForm`: přepínač, 2 až 5 možností, duplicity a prázdné možnosti blokují odeslání, odeslání pošle `pollOptions`.
- `QuackList`: quack bez ankety vypadá jako dřív.

### 7. Závěr

`pnpm check-all` (lint, type-check, testy, build). Podle CLAUDE.md jsou důkazem testy a type-check, prohlížeč a dev servery se nespouštějí. Ruční ověření ve dvou oknech (kritérium 16) jen na vyžádání.

## Pokrytí akceptačních kritérií

| Kritéria                    | Kde                                                          |
| --------------------------- | ------------------------------------------------------------ |
| 1–6 (vytvoření)             | krok 5, backend validace v kroku 2                           |
| 7–12 (hlasování)            | kroky 2 a 4; 12 = žádný endpoint pro editaci/zavření/smazání |
| 13–14 (výsledky)            | krok 4                                                       |
| 15 (okamžitě)               | krok 3 (optimistický update)                                 |
| 16–17 (živě, shoda)         | krok 4 (polling), krok 2 (čísla z DB)                        |
| 18–20 (selhání)             | kroky 3 a 4                                                  |
| 21–22 (prázdno, bez ankety) | krok 4, testy v kroku 6                                      |

## Rizika

- **Dev DB** je rozjetá a úklid v kroku 0 je zásah do ní. Bez potvrzení se neprovede.
- **Polling každých 5 s** zatěžuje `GET /api/quacks` v každém otevřeném okně. Pro experiment stačí, při růstu by se řešilo stránkování nebo SSE (mimo rozsah story).
- **Souběh hlasů:** řeší unikátní index a `upsert`, ne kód v aplikaci.
- Vyhledávání se ankety netýká, jen text a jméno autora, jak říká story.

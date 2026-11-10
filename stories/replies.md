# Story: Odpověď na quack

**Jako** přihlášený uživatel
**chci** odpovědět přímo na quack nebo na jinou odpověď a vidět odpovědi pod quackem,
**abych** nemusel psát nový quack začínající „@jméno…“ a všichni věděli, kdo na co reaguje.

## Akceptační kritéria

**Odpovídání**

1. U každého quacku ve feedu je akce _Odpovědět_. Po kliknutí se pod quackem ukáže pole pro text a tlačítko _Odeslat_.
2. Odpověď je jen text, bez nálady a bez ankety. Prázdnou odpověď nebo odpověď z mezer nejde odeslat. Formulář řekne proč.
3. Odpověď se nezobrazí ve feedu jako samostatný quack ani v záložce _Moje_. Je vidět jen pod svým quackem.
4. Po odeslání se odpověď objeví na konci seznamu odpovědí a pole se zavře a vyprázdní.

**Odpověď na odpověď (plochý seznam)**

5. U každé odpovědi je také _Odpovědět_. Odpověď se zařadí na konec stejného seznamu pod původním quackem, ne do odsazené větve.
6. Odpověď na odpověď má řádek _v odpovědi na @jméno_ se jménem autora té odpovědi. Odpověď přímo na quack ho nemá.

**Zobrazení**

7. Quack s odpověďmi ukazuje _N odpovědí_ (1 odpověď, 2–4 odpovědi, 5 a více odpovědí). Odpovědi jsou zpočátku sbalené.
8. Klik na počet odpovědi rozbalí. Jsou řazené od nejstarší nahoře, každá se jménem autora a časem. Další klik je sbalí.
9. Po odeslání vlastní odpovědi se seznam rozbalí a počet se zvýší.
10. Po obnovení stránky jsou odpovědi i počet stejné.

**Mazání odpovědi**

11. Svou odpověď smaže autor, jakoukoli odpověď moderátor (role `admin`). Ostatní _Smazat_ u cizích odpovědí nevidí.
12. Před smazáním je stejné potvrzení jako u quacku. Po potvrzení odpověď zmizí ze seznamu a počet se sníží.
13. Cizí odpověď nesmaže nikdo jiný, ani přímým voláním API. Nepřihlášený se k odpovědím nedostane.
14. Smazání odpovědi, na kterou někdo reagoval, řeší [Smazaný quack nebo odpověď nerozbije vlákno](delete-with-replies.md).

**Když něco nejde**

15. Když se odpověď nepodaří uložit, text v poli zůstane a pod ním je zpráva _Odpověď se nepodařilo odeslat._
16. Když mezitím byl quack nebo odpověď, na kterou uživatel odpovídá, smazán, uživatel při odeslání uvidí _Na tohle už nejde odpovědět, bylo to smazáno._ a text v poli mu zůstane.

**Když není co ukázat**

17. Quack bez odpovědí nemá žádný počet, jen _Odpovědět_.

## Mimo rozsah

- Odpověď s náladou, anketou nebo jinou přílohou.
- Upozornění autorovi, že mu někdo odpověděl.
- Stromové vnořování, skok na odpovídanou odpověď, citace jejího textu.
- Úprava odpovědi po odeslání.
- Živé zobrazení odpovědí od ostatních bez obnovení stránky.
- Záložka _Moje_ s vlastními odpověďmi.
- Chování po smazání quacku nebo odpovědi s reakcemi (viz [delete-with-replies.md](delete-with-replies.md)).

## Technické poznámky

- Odpověď je řádek v tabulce `quack` s `threadId` (kořenový quack) a `replyToId` (quack nebo odpověď, na kterou míří). Řádek kořenového quacku má obě pole prázdná.
- `threadId` se nastaví při vložení z cíle odpovědi (`cíl.threadId ?? cíl.id`) a už se nemění. Hlídá to test služby.
- Feed a _Moje_ filtrují `threadId IS NULL`.
- Počet odpovědí se počítá dotazem (`threadId = X AND deletedAt IS NULL`), neukládá se.
- Oprávnění ke smazání se ověřuje na serveru ze session (viz `CLAUDE.md`). K tomu patří service unit test a e2e test, který selže po odstranění serverové kontroly.
- Limit délky textu je stejný jako u quacku.

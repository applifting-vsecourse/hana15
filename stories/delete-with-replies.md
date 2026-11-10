# Story: Smazaný quack nebo odpověď nerozbije vlákno

**Jako** autor nebo moderátor
**chci**, aby smazání quacku (nebo odpovědi), na který už někdo reagoval, smazalo jeho obsah, ale nechalo zachované reakce ostatních,
**abych** nikoho nepřipravil o to, co napsal, a zároveň aby opravdu zmizelo to, co jsem smazat chtěl.

Závisí na [Odpověď na quack](replies.md) a navazuje na [Mazání vlastních příspěvků](delete-own-quacks.md) a [Moderátor smaže jakýkoli příspěvek](moderator-delete.md).

## Akceptační kritéria

**Smazání s reakcemi**

1. Když se smaže quack, na který existuje aspoň jedna odpověď, zůstane ve feedu na stejném místě šedý řádek _Quack byl smazán_.
2. Řádek nemá text, náladu, anketu, hlasy, jméno autora ani žádnou akci.
3. Odpovědi zůstanou pod řádkem, rozbalitelné a se stejným počtem. Každá má dál svého autora a text.
4. Smazaný řádek není v záložce _Moje_, ani u autora, který quack napsal.
5. Na smazaný quack nebo smazanou odpověď už nejde odpovědět. Akce _Odpovědět_ tam není.

**Smazání odpovědi s reakcemi**

6. Odpověď A má reakci B (_v odpovědi na @jméno autora A_). Smazání A nechá v seznamu šedý řádek _Odpověď byla smazána_ bez textu a autora. B zůstane a jeho řádek říká _v odpovědi na smazanou odpověď_.
7. Smazaná odpověď, na kterou nikdo nereagoval, zmizí ze seznamu úplně a počet se sníží. Šedý řádek _Odpověď byla smazána_ se do počtu odpovědí nepočítá.

**Smazání bez reakcí**

8. Quack bez odpovědí zmizí z feedu úplně, jako dnes.

**Co už nikdo neuvidí**

9. Po smazání není text smazaného quacku, jeho nálada, anketa ani hlasy v odpovědi API ani nikde v aplikaci. Platí to i po obnovení stránky a pro moderátora.
10. Autor smazaného obsahu se nedá zjistit z odpovědi API ani z aplikace.

**Oprávnění**

11. Quack a odpověď smaže autor nebo moderátor, nikdo jiný, ani přímým voláním API.
12. Smazání provede stejný endpoint a stejné potvrzení jako dnes. Moderátor má stejný výsledek jako autor.

**Když něco nejde**

13. Když smazání selže, quack (nebo odpověď) zůstane se vším obsahem a uživatel uvidí _Příspěvek se nepodařilo smazat._
14. Když příspěvek mezitím smazal někdo jiný, zmizí nebo se změní podle kritérií výše a bez chyby.

**Když není co ukázat**

15. Feed, ve kterém je jen smazaný řádek s odpověďmi, vypadá normálně: řádek v něm je a odpovědi jsou rozbalitelné. Žádný zvláštní prázdný stav.

## Mimo rozsah

- Úplné odstranění šedého řádku, když se později smažou všechny jeho odpovědi (řádek zůstane).
- Obnovení smazaného obsahu, důvod smazání, záznam o tom, kdo smazal, upozornění.
- Mazání uživatelských účtů. Smazání uživatele, jehož quack má cizí odpovědi, dnes selže, dokud tato story neexistuje.
- Hromadné mazání, měkké mazání.

## Technické poznámky

- Zástupný řádek je řádek v tabulce `quack` s vyplněným `deletedAt` a prázdnými `text`, `mood` a `userId`. CHECK v migraci hlídá, že tyto sloupce jsou prázdné právě tehdy, když je `deletedAt` vyplněné.
- Obsah se maže opravdu: služba v jedné transakci smaže hlasy a volby ankety (kaskáda se nespustí, řádek zůstává) a pak vynuluje `text`, `mood` a `userId`.
- Fyzické smazání, nebo zástupný řádek: `count(threadId = id OR replyToId = id)`. Při 0 se řádek smaže, jinak zůstane jako zástupný. Cizí klíče `threadId` a `replyToId` mají `onDelete: Restrict`, takže řádek s odpověďmi nejde smazat fyzicky omylem ani souběhem. Když souběžná odpověď přistane mezi kontrolou a smazáním, služba smazání zopakuje jako zástupný řádek.
- Server nikdy nevrací obsah smazaného řádku, skrytí v UI není jediná ochrana. Test: odpověď API pro smazaný quack neobsahuje `text`, `mood`, anketu ani autora.
- Smazání bez reakcí zůstává trvalé a úplné, jako v `moderator-delete.md`.

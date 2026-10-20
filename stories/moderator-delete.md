# Story: Moderátor smaže jakýkoli příspěvek

**Jako** moderátor
**chci** smazat jakýkoli příspěvek,
**abych** mohl odstranit urážlivé quacky, které jejich autor mazat nechce.

Moderátor je uživatel s rolí `admin`, která v aplikaci už existuje.

## Akceptační kritéria

**Mazání**

1. Přihlášený moderátor vidí akci _Smazat_ u každého příspěvku ve feedu, včetně cizích.
2. Obyčejný uživatel vidí _Smazat_ dál jen u svých příspěvků, nikdy u cizích.
3. Před smazáním se moderátor zeptá stejným potvrzením jako autor. Po potvrzení příspěvek zmizí z feedu.
4. Smazání je trvalé a stejné jako u autora: příspěvek zmizí všem, včetně ankety a hlasů, pokud je to anketa. Obnovit ho nejde.
5. Po obnovení stránky se smazaný příspěvek už nezobrazí.

**Oprávnění**

6. Obyčejný uživatel cizí příspěvek nesmaže ani přímým voláním API.
7. Nepřihlášený se k feedu ani k mazání nedostane, stejně jako dnes.

**Když něco nejde**

8. Když příspěvek mezitím smazal jeho autor, zmizí z moderátorova feedu a moderátor nevidí chybu.
9. Když se smazání nepovede, příspěvek ve feedu zůstane a moderátor uvidí zprávu _Příspěvek se nepodařilo smazat._

**Když není co ukázat**

10. Prázdný feed vypadá stejně jako dnes. Moderátor v něm nemá co mazat a nic navíc se nezobrazí.

## Mimo rozsah

- Jak se někdo stane moderátorem: roli `admin` nastavuje tým ručně v databázi. V aplikaci žádná obrazovka ani akce na to není.
- Důvod smazání, záznam o tom, kdo co smazal, upozornění autorovi.
- Měkké mazání a obnovení smazaných příspěvků.
- Blokování nebo mazání uživatelů, hromadné mazání, nahlašování příspěvků.
- Nová role `moderator`, jiná oprávnění pro admina.
- Záložka _Moje_ funguje beze změny: ukazuje jen vlastní příspěvky i moderátorovi.

## Technické poznámky

- Oprávnění se ověřuje na serveru podle role ze session, ne podle toho, co pošle klient.
- Mazání autora a moderátora používá stejný endpoint a stejné chování; liší se jen pravidlo „smí smazat“.
- Navazuje na [Mazání vlastních příspěvků](delete-own-quacks.md).

# Architecture Decision Records

Rozcestník rozhodnutí o datovém modelu a struktuře aplikace. Před změnou těchto částí se podívej sem. Nové ADR dostane další číslo (`NNNN-kratky-nazev.md`) a řádek v tabulce.

| Číslo                                             | Název                                                 | Status  | Jedna věta                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [0001](0001-smazany-quack-jako-zastupny-radek.md) | Smazaný quack s odpověďmi zůstává jako zástupný řádek | Přijato | Quack s odpověďmi se nemaže fyzicky, ale ztratí obsah i autora (nullable `text` a `userId`, `deletedAt`), aby odpovědi ostatních zůstaly.        |
| [0002](0002-likes.md)                             | Lajky jako tabulka s unikátní dvojicí                 | Přijato | Tabulka `quack_like` s unikátním (`quackId`, `userId`) a cascade; počet se počítá dotazem, bez počítadla na quacku; zástupný řádek se nelajkuje. |

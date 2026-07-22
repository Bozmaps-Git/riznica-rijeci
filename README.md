# Bosanski korak po korak

**Rječnik, gramatika, vježbe i testovi bosanskog jezika — od A1 do B2, kroz 8 razreda dopunske škole.**

Sadržaj: Amila Guhdija. Statička, samostalna verzija — sav sadržaj je ugrađen, ne treba server ni baza.

## Šta sadrži

| Sekcija | Opis |
|---|---|
| **Rječnik** | 5.079 riječi i izraza s prijevodom, primjerom rečenice, vrstom riječi, predmetom, razredom i CEFR nivoom. Pretraga radi i bez kvačica (npr. "kuca" pronalazi "kuća"). |
| **Gramatika** | 128 lekcija u 64 oblasti, od slova i glasova (1. razred, A1.1) do B2 argumentacije (8. razred), svaka s objašnjenjem, primjerima i kvizom. |
| **Vježbe i testovi** | Po razredu: 8 oblastnih testova po 20 pitanja + završni test od 40 pitanja. Rezultati se pamte u pregledniku. |
| **Vježbanje riječi** | Kartice za vježbanje vokabulara po razredu i nivou. |

## Tehnički detalji

- `index.html` — kompletna aplikacija (HTML/CSS/JS, bez biblioteka)
- `data.js` — svih 5.079 riječi + gramatika + sadržaj, ugrađeno kao JSON
- Mrežni sloj originala (API pozivi) zamijenjen lokalnim slojem koji čita ugrađene podatke — aplikacija radi bez interneta nakon prvog učitavanja
- Kodiranje UTF-8, jezik `bs`

## Deploy

Statička stranica na Vercelu — auto-deploy iz `main` grane.

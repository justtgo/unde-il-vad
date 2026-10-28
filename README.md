# Unde-l văd?

Aplicație web care îți spune pe ce platformă de streaming poți vedea un film în **România**.

Cauți un film, vezi trailerul oficial și afli imediat dacă e inclus în abonamentele tale (Netflix, HBO Max, Disney+, Prime Video, SkyShowtime, Apple TV+) sau dacă se poate închiria ori cumpăra.

## Ce face

- **Intro animat** pe tot ecranul: mira de test TV, galbenul care se extinde, întrebarea „unde-l văd?” și stingerea televizorului, cu sunet.
- **Trailer pe tot ecranul** pentru filmul săptămânii (implicit *Kill Bill: Vol. 1*).
- **Pagină de tip player** la derulare: trailer mare, informații despre film și platformele din România.
- **Căutare live** în tot catalogul TMDB.
- **Abonamentele tale**: bifezi ce platforme ai, iar filmele incluse primesc eticheta „Inclus la tine”.
- **Trailere populare** și un rând **Honest Trailers**.

## Structura proiectului

```
unde-il-vad/
├── index.html            pagina principală
├── favicon.svg           iconița din tab
├── css/
│   └── style.css         toate stilurile
├── js/
│   ├── config.js         cheile TMDB și filmul săptămânii
│   ├── config.example.js model de configurare, fără chei
│   └── app.js            logica aplicației
├── netlify/
│   └── functions/
│       └── tmdb.mjs      funcție Netlify care ține cheia TMDB secretă
├── netlify.toml          configurarea Netlify
├── .nojekyll             îi spune lui GitHub Pages să servească fișierele exact cum sunt
├── .gitignore
├── LICENSE
└── README.md
```

## Configurare

Toate setările sunt în `js/config.js`:

| Setare         | Ce este                                                                 |
|----------------|-------------------------------------------------------------------------|
| `TMDB_TOKEN`   | „API Read Access Token” de pe TMDB (cel lung, începe cu `eyJ`)          |
| `TMDB_API_KEY` | „API Key” de pe TMDB (cel scurt). Se folosește doar dacă tokenul e refuzat |
| `FEATURED_ID`  | ID-ul TMDB al filmului de pe prima pagină. Îl găsești în linkul filmului pe themoviedb.org, de exemplu `themoviedb.org/movie/24` → `24` |

Cheile se obțin gratuit din [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

### ⚠️ Despre cheile API

Pe GitHub Pages, tot codul paginii este public, deci și cheile din `config.js` pot fi văzute de oricine deschide sursa paginii. Pentru TMDB riscul e mic: cheile sunt doar de citire și nu au plăți legate de ele. Totuși:

1. **Înainte de publicare, regenerează cheile** din setările TMDB, mai ales dacă le-ai trimis vreodată cuiva sau le-ai scris undeva, și pune-le pe cele noi în `config.js`.
2. Dacă vreodată observi abuzuri, le regenerezi din nou și actualizezi fișierul.
3. Pentru ascundere completă, publică pe Netlify: proiectul include deja funcția care ține cheia secretă. Vezi secțiunea „Publicare pe Netlify”.

## Rulare pe calculator

YouTube refuză redarea trailerelor în pagini deschise direct prin dublu-click (`file://`). Ca să vezi trailerele și local, pornește un server simplu din folderul proiectului:

```bash
# cu Python
python -m http.server 8000
# apoi deschide http://localhost:8000
```

Sau, în VS Code, cu extensia **Live Server**: click dreapta pe `index.html` → *Open with Live Server*.

## Publicare pe GitHub Pages

### Varianta fără linie de comandă

1. Intră pe [github.com](https://github.com) și creează un cont, dacă nu ai.
2. Apasă **New repository**, dă-i un nume (de exemplu `unde-il-vad`), alege **Public** și apasă **Create repository**.
3. Pe pagina repository-ului, apasă **uploading an existing file**.
4. Trage în pagină **conținutul** folderului `unde-il-vad` (fișierele și folderele `css` și `js`, nu folderul însuși), apoi apasă **Commit changes**.
   - Fișierele `.nojekyll` și `.gitignore` pot fi ascunse pe calculator. Dacă nu apar, nu e grav, aplicația merge și fără ele.
5. Mergi la **Settings → Pages**.
6. La **Source** alege **Deploy from a branch**, la **Branch** alege `main` și folderul `/ (root)`, apoi **Save**.
7. După unul sau două minute, sus pe aceeași pagină apare linkul: `https://NUMELE-TAU.github.io/unde-il-vad/`.

### Varianta cu Git

```bash
cd unde-il-vad
git init
git add .
git commit -m "Prima versiune Unde-l văd"
git branch -M main
git remote add origin https://github.com/NUMELE-TAU/unde-il-vad.git
git push -u origin main
```

Apoi activezi GitHub Pages din **Settings → Pages**, ca la pașii 5–7 de mai sus.

### Actualizări

De fiecare dată când modifici ceva, încarci din nou fișierele schimbate (sau faci `git commit` și `git push`). Site-ul se actualizează singur în câteva minute.

## Publicare pe Netlify (recomandat)

Netlify are un avantaj important: **cheia TMDB rămâne secretă**. Aplicația trimite cererile prin funcția `netlify/functions/tmdb.mjs`, iar cheia stă în setările Netlify, nu în cod. Aplicația detectează singură dacă rulează pe Netlify, deci nu trebuie schimbat nimic în cod.

### Pași

1. Pune mai întâi proiectul pe GitHub, ca mai sus.
2. Intră pe [app.netlify.com](https://app.netlify.com) și autentifică-te cu contul de GitHub.
3. Apasă **Add new site → Import an existing project → GitHub** și alege repository-ul `unde-il-vad`.
4. La setările de build lasă totul cum vine din `netlify.toml`: *Build command* gol, *Publish directory* `.`. Apasă **Deploy**.
5. Mergi la **Site configuration → Environment variables → Add a variable**:
   - **Key:** `TMDB_TOKEN`
   - **Value:** „API Read Access Token” de pe TMDB (cel lung, care începe cu `eyJ`)
6. Mergi la **Deploys → Trigger deploy → Deploy site**, ca noua variabilă să intre în vigoare.
7. Deschide linkul primit, de forma `https://nume-ales.netlify.app`. Numele îl poți schimba din **Site configuration → Change site name**.

### Ascunde cheile complet

După ce site-ul de pe Netlify funcționează cu variabila `TMDB_TOKEN`:

1. Regenerează cheile pe TMDB, ca cele vechi să nu mai fie valabile.
2. Pune tokenul nou doar în variabila `TMDB_TOKEN` de pe Netlify.
3. În `js/config.js` lasă cheile goale: `TMDB_TOKEN: ""` și `TMDB_API_KEY: ""`.
4. Trimite modificarea pe GitHub. Netlify publică singur noua versiune.

De acum cheia nu mai apare nicăieri public. Varianta de pe GitHub Pages, dacă o păstrezi, nu va mai avea date, pentru că acolo nu există funcția Netlify. E normal: de aici înainte, site-ul principal e cel de pe Netlify.

### Actualizări automate

Cât timp site-ul e legat de GitHub, orice modificare urcată în repository apare pe Netlify în mai puțin de un minut, fără niciun pas în plus.

### Domeniu propriu

Dacă vrei o adresă de tipul `undelvad.ro`, o cumperi de la un registrar și o adaugi din **Domain management → Add a domain**. Netlify îți arată exact ce setări DNS trebuie făcute și îți oferă gratuit certificatul HTTPS.

## Surse de date și atribuire

- Date despre filme, postere și trailere: [TMDB](https://www.themoviedb.org). *Acest proiect folosește API-ul TMDB, dar nu este certificat sau aprobat de TMDB.*
- Disponibilitatea pe platforme: furnizată de [JustWatch](https://www.justwatch.com) prin TMDB.
- Trailerele sunt redate prin playerul oficial YouTube.

API-ul TMDB este gratuit pentru proiecte necomerciale. Pentru utilizare comercială (reclame, abonamente plătite) e nevoie de aprobare separată de la TMDB.

## Licență

Codul este sub licența MIT. Vezi fișierul [LICENSE](LICENSE).

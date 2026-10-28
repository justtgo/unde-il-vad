# Unde-l văd? — context proiect

Document de context pentru continuarea lucrului în Claude. Descrie ce face aplicația, cum e construită, ce s-a decis până acum și ce a rămas de făcut.

> Nu pune chei API în acest document și nici în cod. Cheile TMDB stau doar în variabila `TMDB_TOKEN` de pe Netlify și, pentru teste locale, în copia locală a `js/config.js`, care nu se urcă pe GitHub.

---

## 1. Ce este proiectul

Aplicație web personală, necomercială, care îți spune **pe ce platformă de streaming poți vedea un film în România**. Cauți un film, vezi trailerul oficial și afli dacă e inclus într-un abonament, dacă se închiriază sau dacă se cumpără.

- **Regiune:** doar România (`RO`).
- **Platforme urmărite ca „abonamentele tale”:** Netflix, HBO Max, Disney+, Prime Video, SkyShowtime, Apple TV+. Voyo și AntenaPLAY au fost excluse intenționat.
- **Sursa datelor:** API-ul TMDB, cu disponibilitatea pe platforme furnizată de JustWatch.
- **Limba interfeței:** română.

## 2. Stadiul actual

**Site publicat și funcțional:** https://roaring-semolina-f9c21d.netlify.app/

| Ce | Stare |
|---|---|
| Repository pe GitHub (public, branch `main`) | ✅ La zi |
| Site Netlify legat de GitHub (cont nou) | ✅ Publicat, se actualizează automat la fiecare commit |
| Variabila `TMDB_TOKEN` pe Netlify | ✅ All scopes, aceeași valoare în toate contextele |
| Funcțiile `/api/tmdb` și `/api/honest` | ✅ Merg |
| Trailere YouTube, carusel 1 / 11, Honest Trailers | ✅ Merg |
| Cheile în `js/config.js` de pe GitHub | ✅ Goale (`""`) |

Lecții de la publicare:
- Un site creat prin drag & drop pe Netlify nu e legat de GitHub, deci nu preia modificările. Site-ul trebuie creat cu **Import an existing project → GitHub**.
- Variabilele de mediu se aplică doar la deploy-ul următor.
- Funcția `tmdb.mjs` acceptă doar căile din lista `ALLOWED`. Orice cerere TMDB nouă din `app.js` trebuie adăugată acolo (acum: `movie`, `search/movie`, `discover/movie`, `trending/movie`, `configuration`).
- Fișierele trebuie să fie în folderele corecte pe GitHub. Un `style.css` în pagina principală, în loc de `css/`, face pagina să apară fără stiluri.

## 3. Structura proiectului

```
unde-il-vad/
├── index.html                 structura paginii
├── favicon.svg                televizor galben cu „?”
├── apple-touch-icon.png       iconiță pentru telefoane (180×180)
├── og-image.png               imaginea afișată la distribuirea linkului (1200×630)
├── robots.txt, sitemap.xml    pentru motoarele de căutare
├── css/style.css              toate stilurile
├── js/
│   ├── config.js              FEATURED_ID și, doar local, cheile TMDB
│   ├── config.example.js      model fără chei
│   └── app.js                 toată logica
├── netlify/functions/tmdb.mjs funcție Netlify care ține cheia secretă
├── netlify/functions/yt.mjs   funcție Netlify: Honest Trailers noi și populare de pe canal
├── porneste-serverul.command  server local pe Mac, cu dublu click
├── netlify.toml               configurare Netlify
├── .nojekyll, .gitignore, LICENSE (MIT), README.md
```

## 4. Cum funcționează

### Fluxul paginii
1. **Intro pe tot ecranul:** mira de culori TV cu ton de 1000 Hz → banda galbenă se extinde peste tot ecranul → se scrie „unde-l văd?” → televizorul se stinge ca un tub catodic, cu sunet de stingere. Butonul „Sari peste intro” e disponibil. Dacă trailerul încă se încarcă, apare „se încarcă trailerul” cu cursor de terminal, apoi pagina se deschide, cel mult după 9 secunde.
2. **Landing pe tot ecranul (carusel):** 11 filme. Primul e **Kill Bill: Vol. 1** (TMDB id `24`), cu eticheta **DEVELOPER'S CHOICE**. Urmează **TOPUL SĂPTĂMÂNII · #1–#10**: cele mai populare filme incluse într-un abonament în România. Trailerul rulează pe fundal, fără sunet. Dacă nu poate rula, se succed 5–7 cadre din film cu zoom lent. Caruselul avansează automat după 9 s fără video, sau după 25 s ori la finalul trailerului cu video. Are săgeți, liniuțe de progres, contor „1 / 11” și navigare din tastatură. Pe landing există doar butonul „Unde îl văd”; butonul „Reia trailerul” și iconița de derulare au fost scoase.
3. **La derulare, pagina de tip player (inspirată de structura paginii video IMDb):** player mare în stânga și panou în dreapta, cu poster, titlu, an, gen, durată, descriere extensibilă și „Unde îl poți vedea în România”, pe abonament, închiriere și cumpărare. Sub ele: abonamentele tale (butoane), rândul **Populare pe streaming** și rândul **Honest Trailers**.
4. **Bara de sus**, fixă: nume, căutare albă, buton de sunet, „RO”. Devine neagră după landing.

### Căutarea
- Rezultatele apar într-o listă sub bară pe măsură ce scrii, cu poster, titlu și an. Se poate naviga cu săgețile.
- Click pe rezultat deschide filmul în player. Enter sau „Vezi toate rezultatele” umple rândul de jos cu rezultate.

### Date TMDB folosite
- `/discover/movie?watch_region=RO&with_watch_monetization_types=flatrate&sort_by=popularity.desc&vote_count.gte=50`: filmele populare de pe streaming. Fiecare film e verificat apoi cu `/watch/providers`, ca să rămână doar cele cu abonament real în RO.
- `/movie/{id}?language=ro-RO`: detalii în română.
- `/movie/{id}/watch/providers`: platforme, se folosește `results.RO`.
- `/movie/{id}/videos`: trailere, întâi `ro-RO`, apoi `en-US`, ordonate trailer oficial → trailer → teaser.
- `/movie/{id}/images`: cadre din film pentru fundal.
- `/search/movie?language=ro-RO&region=RO`: căutare.

### Cheile și funcția Netlify
- Pe Netlify, aplicația cere datele prin `/api/tmdb?p=<cale>`. Funcția `tmdb.mjs` adaugă cheia din `TMDB_TOKEN`, acceptă doar căile `/movie`, `/search/movie` și `/configuration`, și păstrează răspunsurile în cache o oră.
- Dacă funcția nu există, pe GitHub Pages sau local, aplicația folosește `TMDB_TOKEN` și `TMDB_API_KEY` din `js/config.js`: întâi tokenul ca `Bearer`, apoi cheia scurtă ca rezervă.

### Trailere YouTube
- Se folosește **playerul YouTube standard**, prin IFrame API, nu varianta `youtube-nocookie`, care în Safari nu trimitea evenimentele și bloca pornirea automată.
- Dacă un trailer e blocat de studio pentru alte site-uri (erorile 101/150), se încearcă următorul, până la 6.
- Dacă toate sunt blocate, playerul de jos arată posterul filmului peste imaginea estompată, cu link „Vezi trailerul pe YouTube”.
- Dacă browserul nu pornește trailerul singur în 4,5 s, apare butonul „Pornește trailerul”.
- Dacă pagina e deschisă ca fișier (`file://`), YouTube nu se mai încarcă deloc și apare un mesaj explicativ, pentru că YouTube dă eroarea 153 în acest caz.
- Trailerul de sus se oprește când derulezi în jos și repornește când revii.

### Honest Trailers
Direct de pe canalul Screen Junkies (`UCOpcACMWblDls9Z6GERVi1A`), nu dintr-un playlist fix: întâi cele mai noi episoade (eticheta NOU), apoi cele mai populare (eticheta POPULAR), cu imagine, dată și vizualizări. Se păstrează doar titlurile de forma „Honest Trailers | …”, fără Shorts, previzualizări sau comentarii.
- Pe Netlify: funcția `netlify/functions/yt.mjs`, la `/api/honest`. Fără cheie citește listele automate publice ale canalului: `UULF…` (videoclipuri lungi, cele mai noi) și `UULP…` (cele mai populare). Dacă se adaugă variabila `YOUTUBE_API_KEY` în Netlify, folosește YouTube Data API.
- Local: aceleași liste, citite cu un player YouTube ascuns, iar titlurile din oEmbed.

### SEO și distribuire
- În `index.html`: titlu și descriere, `canonical`, etichete Open Graph (Facebook, WhatsApp, LinkedIn) și Twitter cu `og-image.png`, iconiță pentru telefoane, date JSON-LD `WebSite` cu `SearchAction` și un text `noscript`.
- **Toate adresele absolute folosesc `https://roaring-semolina-f9c21d.netlify.app`.** Dacă se schimbă adresa site-ului sau se adaugă un domeniu propriu, adresa trebuie înlocuită în `index.html`, `robots.txt` și `sitemap.xml`.
- Linkurile de forma `/?q=titlu` deschid direct o căutare, iar căutarea curentă apare în adresă.
- Pentru verificarea cardului: Facebook Sharing Debugger, LinkedIn Post Inspector, opengraph.xyz.

### Mod diagnostic
Adaugă `?debug` la adresă, de exemplu `http://localhost:8000/?debug`. Apare un panou verde, jos în stânga, care arată sursa datelor TMDB, trailerele găsite, încărcarea YouTube, stările playerelor și codurile de eroare explicate.

## 5. Decizii de design

- **Fundal negru**, cu **galben `#FFD21F`** ca accent, în stilul trailerului Kill Bill: text galben pe negru.
- **Fonturi:** Bebas Neue pentru titluri mari, Inter pentru restul.
- Bare galbene verticale în fața titlurilor de secțiune, carduri 16:9 cu buton de play pentru trailere.
- Direcții încercate și **respinse** de utilizator: fundal galben pe toată pagina, stil HBO Max violet, stil benzi desenate, stil streaming cu efect de sticlă Apple, meniu de navigare sus („nu avem ce pune în el”).
- Direcții **păstrate**: intro cu mira TV, structura de pagină video, trailer pe tot ecranul la început, carusel pe landing.

## 6. Limite și reguli stabilite

- **Fără reproducerea posterului sau a personajului Kill Bill ca decor al aplicației.** Posterele apar doar ca date din catalogul TMDB, adică afișul unui film din listă. Personaje sau postere protejate nu se desenează și nu se imită.
- **Fără date sau trailere luate de pe IMDb.** IMDb nu are API public, iar termenii nu permit preluarea. Clasamentul de popularitate vine de la TMDB.
- **Trailerele nu se descarcă și nu se găzduiesc separat.** Ele aparțin studiourilor și se redau doar prin playerul YouTube.
- **Atribuire TMDB obligatorie** în subsol. API-ul e gratuit doar pentru uz necomercial. Reclamele sau abonamentele plătite cer aprobare TMDB.
- **Cheile nu stau niciodată în codul de pe GitHub.**

## 7. Publicare și testare

### Local, pe Mac
YouTube nu merge cu dublu click pe `index.html`. Cel mai simplu: dublu click pe `porneste-serverul.command` (prima dată: System Settings → Privacy & Security → Open Anyway). Alternativ, manual:
```
cd <trage folderul proiectului în Terminal>
python3 -m http.server 8000
```
Apoi deschide `http://localhost:8000`. Oprești serverul cu Ctrl + C. Pentru test local, cheile se pun doar în copia locală a `js/config.js`.

Atenție: pe Mac există mai multe copii ale proiectului, de exemplu `Documents/unde il vad/unde-il-vad 2/`. Actualizările trebuie copiate exact în folderul care se deschide.

### GitHub
- Safari nu urcă foldere întregi prin drag & drop, pentru că le deschide în loc să le încarce. Variante: Chrome, sau **Add file → Create new file** cu calea în nume, de exemplu `css/style.css`, sau intri în folder și urci fișiere individuale cu **Upload files**.

### Netlify
- Site importat din GitHub. Fiecare commit pornește automat un deploy, care consumă credite.
- Când revin creditele: **Deploys → Trigger deploy → Deploy site**, apoi verifici cu `<site>.netlify.app/api/tmdb?p=/movie/24`, care trebuie să întoarcă JSON cu titlul filmului.
- Opțiunea **Stop auto publishing** economisește credite între teste.

## 8. Rezumatul conversației

1. **Idee și plan:** aplicație „unde pot vedea un film”, doar pentru România, cu date de la TMDB/JustWatch. Plan pe etape: date → căutare → abonamente → conturi → publicare.
2. **Design, mai multe iterații:** inspirație inițială din posterul Kill Bill, galben și negru, apoi încercări cu HBO Max, benzi desenate, sticlă Apple și streaming clasic. Concluzia: fundal negru și galben ca accent. Nume ales: **„Unde-l văd”**, pentru că „Unde rulează” sună a cinema. S-a adăugat și o versiune RO/EN, care nu a fost păstrată în versiunea finală.
3. **Intro:** de la efect de tastare în stil Matrix pe monitor, prin zid de ecrane, la varianta finală cu mira TV, galbenul care pornește din banda galbenă, întrebarea „unde-l văd?” și stingerea naturală a televizorului, cu sunete generate din cod.
4. **Integrare TMDB:** tokenul v4 ca `Bearer`, cheia v3 ca rezervă. Kill Bill ca film principal. Trailerele oficiale prin `/videos`.
5. **Layout final:** trailer pe tot ecranul sus, la derulare pagina de tip player cu Honest Trailers dedesubt.
6. **Publicare:** structură de repository, README, funcție Netlify pentru ascunderea cheii, pas cu pas pe Mac până la legarea Netlify de GitHub.
7. **Reparații după testare:** căutarea „nu mergea” pentru că rezultatele apăreau în afara ecranului, rezolvat cu lista sub bară. Trailerele nu porneau din cauza variantei `nocookie`, a trailerelor blocate de studio și a deschiderii ca fișier. Rezolvat cu playerul standard, mai multe trailere pe rând, cadre din film și poster. Landing-ul a devenit carusel, iar topul a fost limitat la filme de pe streaming.

## 9. Ce a rămas de făcut

- [x] Publicare pe Netlify, legată de GitHub.
- [ ] Ștergerea sau oprirea site-ului vechi din primul cont Netlify, dacă mai există.
- [ ] **Regenerarea cheilor TMDB.** Au fost trimise în conversație. Tokenul nou se pune doar în Netlify.
- [ ] Idei pentru mai târziu: păstrarea abonamentelor bifate între vizite, seriale pe lângă filme, revenirea la versiunea RO/EN, verificare pe mobil, domeniu propriu.

## 10. Cum preferă utilizatorul să lucreze

- Scrie în română. Folosește **Mac**, cu Chrome și Safari.
- Preferă **pași mici, câte unul**, cu confirmare după fiecare.
- Îi plac demo-urile vizuale rapide înainte de implementare și reacționează la capturi de ecran.
- Pentru actualizări, preferă **arhive doar cu fișierele modificate**, ca să nu-și suprascrie `config.js` local.

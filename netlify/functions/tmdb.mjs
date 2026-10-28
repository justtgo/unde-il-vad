/* ======================================================================
   Funcție Netlify: intermediar pentru API-ul TMDB.
   Cheia stă în variabila de mediu TMDB_TOKEN (setată în Netlify),
   deci nu apare niciodată în codul paginii.
   Folosire din pagină: /api/tmdb?p=/movie/24?language=ro-RO
   ====================================================================== */
const API = "https://api.themoviedb.org/3";
const ALLOWED = /^\/(movie|search\/movie|configuration)(\/|\?|$)/;

export default async (req) => {
  const token = process.env.TMDB_TOKEN;
  if (!token) {
    return json({ error: "Lipsește variabila TMDB_TOKEN în setările Netlify." }, 500);
  }
  const p = new URL(req.url).searchParams.get("p") || "";
  if (!ALLOWED.test(p)) {
    return json({ error: "Cerere nepermisă." }, 400);
  }
  try {
    const r = await fetch(API + p, {
      headers: { Authorization: "Bearer " + token, accept: "application/json" }
    });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        /* rezultatele se păstrează 1 oră în cache, ca să facem mai puține cereri la TMDB */
        "cache-control": r.ok ? "public, max-age=600, s-maxage=3600" : "no-store"
      }
    });
  } catch (e) {
    return json({ error: "TMDB nu răspunde momentan." }, 502);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export const config = { path: "/api/tmdb" };

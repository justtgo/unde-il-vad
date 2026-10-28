/* ======================================================================
   Funcție Netlify: Honest Trailers de pe canalul Screen Junkies.
   Întoarce cele mai noi episoade și cele mai populare, cu vizualizări.
   - Fără cheie: citește listele automate publice ale canalului (RSS):
       UULF… = videoclipurile lungi, de la cel mai nou
       UULP… = videoclipurile cele mai populare
   - Cu variabila YOUTUBE_API_KEY setată în Netlify: folosește YouTube Data API.
   Folosire din pagină: /api/honest
   ====================================================================== */
const CHANNEL = "UCOpcACMWblDls9Z6GERVi1A"; // Screen Junkies
const SUF = CHANNEL.slice(2);
const isHT = t => /^\s*honest trailers?\s*[|:–-]/i.test(t || "") && !/\b(short|preview|commentary)\b/i.test(t || "");

export default async () => {
  let newest = [], popular = [], source = "rss";
  const key = envVar("YOUTUBE_API_KEY");

  if (key) {
    try { ({ newest, popular } = await fromApi(key)); source = "api"; } catch (e) { newest = []; popular = []; }
  }
  if (!newest.length && !popular.length) {
    const [longs, pops] = await Promise.all([rss("UULF" + SUF), rss("UULP" + SUF)]);
    newest = longs.filter(v => isHT(v.title)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    popular = pops.filter(v => isHT(v.title)).sort((a, b) => (b.views || 0) - (a.views || 0));
    if (!newest.length) {
      const all = await rss(null);
      newest = all.filter(v => isHT(v.title)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }
    source = "rss";
  }

  newest = newest.slice(0, 8);
  const seen = new Set(newest.map(v => v.id));
  popular = popular.filter(v => !seen.has(v.id)).slice(0, 12);

  return new Response(JSON.stringify({ source, newest, popular }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=3600"
    }
  });
};

async function rss(playlist) {
  const url = playlist
    ? "https://www.youtube.com/feeds/videos.xml?playlist_id=" + playlist
    : "https://www.youtube.com/feeds/videos.xml?channel_id=" + CHANNEL;
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
      const e = m[1];
      return {
        id: (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1],
        title: decode((e.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
        date: (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "",
        views: +((e.match(/<media:statistics views="(\d+)"/) || [])[1] || 0)
      };
    }).filter(v => v.id);
  } catch (e) { return []; }
}

async function fromApi(key) {
  const base = "https://www.googleapis.com/youtube/v3/";
  const search = order => fetch(`${base}search?part=snippet&type=video&maxResults=25&channelId=${CHANNEL}&q=${encodeURIComponent("Honest Trailers")}&order=${order}&key=${key}`).then(r => r.json());
  const [byDate, byViews] = await Promise.all([search("date"), search("viewCount")]);
  if (byDate.error || byViews.error) throw new Error("api");
  const map = d => (d.items || []).map(i => ({ id: i.id.videoId, title: decode(i.snippet.title), date: i.snippet.publishedAt }));
  let newest = map(byDate).filter(v => isHT(v.title));
  let popular = map(byViews).filter(v => isHT(v.title));
  const ids = [...new Set([...newest, ...popular].map(v => v.id))].slice(0, 50);
  if (ids.length) {
    const st = await fetch(`${base}videos?part=statistics&id=${ids.join(",")}&key=${key}`).then(r => r.json());
    const views = Object.fromEntries((st.items || []).map(i => [i.id, +i.statistics.viewCount || 0]));
    newest.forEach(v => v.views = views[v.id] || 0);
    popular.forEach(v => v.views = views[v.id] || 0);
    popular.sort((a, b) => b.views - a.views);
  }
  return { newest, popular };
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export const config = { path: "/api/honest" };

/* citește variabila de mediu, pe ambele căi oferite de Netlify */
function envVar(name) {
  try {
    if (globalThis.Netlify && Netlify.env && typeof Netlify.env.get === "function") {
      const v = Netlify.env.get(name);
      if (v) return String(v).trim();
    }
  } catch (e) {}
  return (process.env[name] || "").trim();
}

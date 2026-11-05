// Tu Próxima Parada — base de datos local de lugares y sugerencias de micros.
// Los lugares reconocidos desde OpenStreetMap se guardan en localStorage para el buscador.
const DB_KEY = "tpp-places-database-v2";

// Coordenadas proporcionadas para la Línea 68. La primera es el inicio y la última el destino.
// La latitud -1.847297 del archivo original se corrigió provisionalmente a -17.847297.
const line68Track = [
  { name: "Inicio Línea 68", coords: [-17.84760255104515, -63.06625604663447], type: "start" },
  { name: "Primera doblada Línea 68", coords: [-17.848311, -63.080475] },
  { name: "Segunda doblada Línea 68", coords: [-17.847313, -63.080796] },
  { name: "Curva máxima Línea 68", coords: [-17.848255, -63.084907] },
  { name: "Llegada de la curva Línea 68", coords: [-17.847297, -63.088848], needsReview: true },
  { name: "Curva máxima 2 Línea 68", coords: [-17.848154, -63.092718] },
  { name: "Llegada de la curva 2 Línea 68", coords: [-17.847657, -63.095348] },
  { name: "Curva abajo dirección Guapurú", coords: [-17.850091, -63.098579] },
  { name: "Máxima curva abajo Línea 68", coords: [-17.852370, -63.100489] },
  { name: "Referencia Mercado Los Pocitos 1", coords: [-17.841855, -63.110143], userLabel: "Mercado Los Pocitos" },
  { name: "Referencia Mercado Los Pocitos 2", coords: [-17.840106, -63.116277], userLabel: "Mercado Los Pocitos" },
  { name: "Esquina Línea 68", coords: [-17.837642, -63.123856] },
  { name: "Segunda esquina Línea 68", coords: [-17.838039, -63.124691] },
  { name: "Giro Plaza El Mechero", coords: [-17.836877, -63.127516], userLabel: "Plaza El Mechero" },
  { name: "Semigiro Línea 68", coords: [-17.834997, -63.126727] },
  { name: "Semigiro 2 Línea 68", coords: [-17.834739, -63.126173] },
  { name: "Fin de ruta Línea 68", coords: [-17.825246, -63.131474], type: "end" }
];

// Lugares agregados manualmente por el usuario y puntos reconocibles del archivo de coordenadas.
const seedPlaces = [
  { id: "manual-pollos-toti", name: "Pollos Toti", coords: [-17.845665, -63.107532], category: "Restaurante", source: "Coordenada proporcionada por el usuario" },
  { id: "manual-pollos-pampeno", name: "Pollos Pampeño", coords: [-17.838170, -63.122473], category: "Restaurante", source: "Coordenada proporcionada por el usuario" },
  { id: "manual-chico-fresa", name: "El chico Fresa", coords: [-17.837584819189043, -63.12373998682564], category: "Comercio", source: "Coordenada proporcionada por el usuario" },
  { id: "manual-chico-burger", name: "El chico burger", coords: [-17.837584819189043, -63.12373998682564], category: "Restaurante", source: "Coordenada proporcionada por el usuario" },
  { id: "manual-mercado-pocitos-1", name: "Mercado Los Pocitos", coords: [-17.841855, -63.110143], category: "Mercado", source: "Coordenada del recorrido aportada por el usuario" },
  { id: "manual-mercado-pocitos-2", name: "Mercado Los Pocitos (sector 2)", coords: [-17.840106, -63.116277], category: "Mercado", source: "Coordenada del recorrido aportada por el usuario" },
  { id: "manual-plaza-mechero", name: "Plaza El Mechero", coords: [-17.836877, -63.127516], category: "Plaza / parque", source: "Coordenada del recorrido aportada por el usuario" },
  ...line68Track.map((point, index) => ({
    id: `line68-waypoint-${index}`,
    name: point.name,
    coords: point.coords,
    category: "Punto de recorrido Línea 68",
    source: "Coordenadas aportadas por el usuario"
  }))
];

function normalizeName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function readPlaceDatabase() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(DB_KEY) || "[]"); } catch (_) { saved = []; }
  const byId = new Map();
  [...seedPlaces, ...(Array.isArray(saved) ? saved : [])].forEach(place => {
    if (!place || !place.name || !Array.isArray(place.coords) || place.coords.length !== 2) return;
    const id = place.id || `osm-${normalizeName(place.name)}-${Number(place.coords[0]).toFixed(5)}-${Number(place.coords[1]).toFixed(5)}`;
    byId.set(id, { ...place, id });
  });
  return [...byId.values()];
}
let placeDatabase = readPlaceDatabase();
function savePlaceDatabase() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(placeDatabase)); } catch (error) { console.warn("No se pudo guardar la base de lugares", error); }
  refreshPlaceSuggestions();
}
function upsertRecognizedPlaces(found) {
  const byKey = new Map(placeDatabase.map(place => [`${normalizeName(place.name)}|${place.coords[0].toFixed(5)}|${place.coords[1].toFixed(5)}`, place]));
  found.forEach(place => {
    const key = `${normalizeName(place.name)}|${place.coords[0].toFixed(5)}|${place.coords[1].toFixed(5)}`;
    if (!byKey.has(key)) byKey.set(key, { ...place, id: place.id || `osm-${key.replace(/[^a-z0-9]+/g, "-")}`, source: "OpenStreetMap", recognizedAt: new Date().toISOString() });
  });
  placeDatabase = [...byKey.values()];
  savePlaceDatabase();
}

const routeTemplates = [
  { id: 68, mode: "Linea", lines: [{ name: "Línea 68", color: "#1479ED" }], note: "Sugerencia calculada entre los dos lugares elegidos. Solo se muestra el tramo solicitado, no el recorrido completo.", track: line68Track },
  { id: 114, mode: "Linea", lines: [{ name: "Línea 114", color: "#0BA86B" }], stopNames: ["Montero y Av. Cañoto", "Mercado La Ramada"], note: "Referencias informativas pendientes de verificación." },
  { id: 5, mode: "Linea", lines: [{ name: "Línea 5", color: "#BD35C9" }], stopNames: ["Montero y Av. Cañoto", "Mercado Los Pozos", "Barrio San Martín"], note: "Referencias informativas pendientes de verificación." }
];

const $ = id => document.getElementById(id);
const originInput = $("origin");
const destinationInput = $("destination");
const map = L.map("map", { zoomControl: true }).setView([-17.8400, -63.1120], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
}).addTo(map);

let markerLayers = [];
let trackLayer = null;
let recognitionRequest = 0;
let activeFilter = "Todos";
let currentRoutes = [];
let selectedId = null;
let selectedSuggestion = null;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function refreshPlaceSuggestions() {
  const datalist = $("places");
  if (!datalist) return;
  const sorted = [...placeDatabase].sort((a, b) => a.name.localeCompare(b.name, "es"));
  datalist.innerHTML = sorted.map(place => `<option value="${escapeHTML(place.name)}"></option>`).join("");
}
function findPlace(value) {
  const wanted = normalizeName(value);
  if (!wanted) return null;
  return placeDatabase.find(place => normalizeName(place.name) === wanted)
    || placeDatabase.find(place => normalizeName(place.name).includes(wanted) || wanted.includes(normalizeName(place.name)))
    || null;
}
function getVisibleRoutes() {
  return currentRoutes.filter(route => activeFilter === "Todos" || route.mode === activeFilter);
}
function renderResults() {
  const list = getVisibleRoutes();
  $("resultStatus").textContent = `${list.length} sugerencia${list.length === 1 ? "" : "s"} de micro`;
  const results = $("results");
  if (!list.length) {
    results.innerHTML = '<div class="empty">No se encontró una línea registrada que conecte esos dos lugares. Prueba con otros puntos del recorrido.</div>';
    return;
  }
  results.innerHTML = list.map(route => `
    <button class="route-card ${route.id === selectedId ? "selected" : ""}" type="button" data-route-id="${route.id}">
      <div class="card-top"><div class="line-row"><span class="line-pill" style="background:${route.lines[0].color}">${escapeHTML(route.lines[0].name)}</span></div><div class="time">Micro<small>sugerido</small></div></div>
      <div class="stop-list"><strong>Desde:</strong> ${escapeHTML(route.originName)}<br><strong>Hasta:</strong> ${escapeHTML(route.destinationName)}</div>
      <div class="card-foot"><span>Tramo solicitado</span><strong>Ver tramo　›</strong></div>
      <p class="route-note">${escapeHTML(route.note)}</p>
    </button>`).join("");
  results.querySelectorAll("[data-route-id]").forEach(button => button.addEventListener("click", () => {
    selectedId = Number(button.dataset.routeId);
    selectedSuggestion = currentRoutes.find(route => route.id === selectedId) || null;
    renderResults();
    drawMap();
  }));
}
function clearMarkers() {
  markerLayers.forEach(layer => map.removeLayer(layer));
  markerLayers = [];
  if (trackLayer) { map.removeLayer(trackLayer); trackLayer = null; }
}
function classifyPlace(tags = {}) {
  if (tags.amenity === "marketplace" || tags.shop === "marketplace") return "Mercado";
  if (tags.amenity === "bus_station" || tags.highway === "bus_stop" || tags.public_transport) return "Parada / transporte";
  if (tags.leisure === "park" || tags.leisure === "playground") return "Plaza / parque";
  if (tags.amenity === "school" || tags.amenity === "university" || tags.amenity === "college") return "Educación";
  if (tags.amenity === "hospital" || tags.amenity === "clinic" || tags.healthcare) return "Salud";
  if (tags.amenity === "place_of_worship") return "Iglesia";
  if (tags.shop) return "Comercio";
  if (tags.amenity) return "Servicio";
  if (tags.tourism) return "Turismo";
  if (tags.historic) return "Sitio histórico";
  return "Lugar cercano";
}
function getElementCoords(element) {
  if (element.lat != null && element.lon != null) return [element.lat, element.lon];
  if (element.center) return [element.center.lat, element.center.lon];
  return null;
}
const overpassEndpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
async function discoverNearbyPlaces(track) {
  const parts = track.map(point => {
    const [lat, lon] = point.coords;
    return `node(around:150,${lat},${lon})[name];way(around:150,${lat},${lon})[name];relation(around:150,${lat},${lon})[name];`;
  }).join("\n");
  const query = `[out:json][timeout:45];(${parts});out center tags;`;
  let lastError;
  for (const endpoint of overpassEndpoints) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: "data=" + encodeURIComponent(query) });
      if (!response.ok) throw new Error(`Servidor de mapas respondió ${response.status}`);
      const data = await response.json();
      const unique = new Map();
      (data.elements || []).forEach(element => {
        const tags = element.tags || {};
        const coords = getElementCoords(element);
        if (!tags.name || !coords) return;
        const category = classifyPlace(tags);
        if (category === "Lugar cercano" && !tags.building) return;
        const id = `${element.type}/${element.id}`;
        unique.set(id, { id: `osm-${id}`, osmId: id, name: tags.name, category, coords, source: "OpenStreetMap" });
      });
      return [...unique.values()];
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("No se pudo consultar el mapa de lugares.");
}

// Proyecta un lugar sobre el segmento más cercano de la polilínea para calcular solo el tramo pedido.
function projectPlaceOnTrack(coords) {
  const lat0 = coords[0] * Math.PI / 180;
  const toXY = p => ({ x: (p[1] - coords[1]) * 111320 * Math.cos(lat0), y: (p[0] - coords[0]) * 110540 });
  const origin = { x: 0, y: 0 };
  let best = null;
  for (let i = 0; i < line68Track.length - 1; i++) {
    const a = toXY(line68Track[i].coords), b = toXY(line68Track[i + 1].coords);
    const vx = b.x - a.x, vy = b.y - a.y;
    const denom = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((origin.x - a.x) * vx + (origin.y - a.y) * vy) / denom));
    const px = a.x + t * vx, py = a.y + t * vy;
    const distance = Math.hypot(px, py);
    if (!best || distance < best.distance) {
      best = { distance, position: i + t, snapped: [
        line68Track[i].coords[0] + (line68Track[i + 1].coords[0] - line68Track[i].coords[0]) * t,
        line68Track[i].coords[1] + (line68Track[i + 1].coords[1] - line68Track[i].coords[1]) * t
      ] };
    }
  }
  return best;
}
function buildLine68Suggestion(origin, destination) {
  const from = projectPlaceOnTrack(origin.coords);
  const to = projectPlaceOnTrack(destination.coords);
  const maxDistance = 700; // metros; evita sugerir la línea si el lugar está demasiado lejos del trazado.
  if (!from || !to || from.distance > maxDistance || to.distance > maxDistance || Math.abs(from.position - to.position) < 0.015) return null;
  const forward = from.position < to.position;
  const start = forward ? from : to;
  const end = forward ? to : from;
  const points = [{ coords: start.snapped }];
  for (let i = Math.floor(start.position) + 1; i <= Math.floor(end.position); i++) {
    if (i > 0 && i < line68Track.length - 1) points.push({ coords: line68Track[i].coords });
  }
  points.push({ coords: end.snapped });
  if (!forward) points.reverse();
  return { id: 68, mode: "Linea", lines: routeTemplates[0].lines, origin, destination, originName: origin.name, destinationName: destination.name, segmentPoints: points, note: routeTemplates[0].note };
}
function renderDatabaseStatus(message) {
  const panel = $("detectedPlaces");
  if (!panel) return;
  panel.innerHTML = `<strong>Base de datos del buscador</strong><p>${escapeHTML(message)}</p><p><b>${placeDatabase.length}</b> lugares y puntos guardados en este navegador.</p>`;
}

function drawMap() {
  clearMarkers();
  if (!selectedSuggestion) {
    $("mapSummary").textContent = "Busca un origen y un destino para sugerir un micro";
    map.setView([-17.8400, -63.1120], 14);
    renderDatabaseStatus("El recorrido de la Línea 68 permanece oculto hasta que aparezca como micro sugerido.");
    return;
  }
  const route = selectedSuggestion;
  if (route.id === 68 && route.segmentPoints?.length) {
    const coords = [route.origin.coords, ...route.segmentPoints.map(point => point.coords), route.destination.coords];
    trackLayer = L.polyline(coords, { color: route.lines[0].color, weight: 5, opacity: 0.88 }).addTo(map);
    const startMarker = L.marker(route.origin.coords).addTo(map).bindPopup(`<strong>Inicio: ${escapeHTML(route.origin.name)}</strong><br>Origen elegido`);
    const endMarker = L.marker(route.destination.coords).addTo(map).bindPopup(`<strong>Destino: ${escapeHTML(route.destination.name)}</strong><br>Destino elegido`);
    markerLayers.push(startMarker, endMarker);
    map.fitBounds(trackLayer.getBounds().pad(0.18));
    $("mapSummary").textContent = `Línea 68 · tramo ${route.origin.name} → ${route.destination.name}`;
    renderDatabaseStatus("Se muestra únicamente el segmento entre tu origen y tu destino, no el recorrido completo.");
    return;
  }
  $("mapSummary").textContent = `${route.lines[0].name} · sugerencia informativa`;
  renderDatabaseStatus("Esta línea no tiene coordenadas suficientes para dibujar el tramo solicitado.");
}

function runSearch() {
  const originText = originInput.value.trim();
  const destinationText = destinationInput.value.trim();
  if (!originText || !destinationText) { alert("Escribe un punto de partida y uno de destino."); return; }
  if (normalizeName(originText) === normalizeName(destinationText)) { alert("El punto de partida y el destino deben ser diferentes."); return; }
  const origin = findPlace(originText);
  const destination = findPlace(destinationText);
  const matches = [];

  // Línea 68: solo se sugiere cuando ambos lugares están próximos a su trazado geográfico.
  if (origin && destination) {
    const suggestion68 = buildLine68Suggestion(origin, destination);
    if (suggestion68) matches.push(suggestion68);
  }
  // Las líneas 114 y 5 conservan sus referencias textuales; sus coordenadas aún no están cargadas.
  routeTemplates.filter(route => route.id !== 68).forEach(route => {
    const names = route.stopNames.map(normalizeName);
    const from = normalizeName(originText), to = normalizeName(destinationText);
    const hasFrom = names.some(name => name.includes(from) || from.includes(name));
    const hasTo = names.some(name => name.includes(to) || to.includes(name));
    if (hasFrom && hasTo) matches.push({ ...route, originName: originText, destinationName: destinationText });
  });

  currentRoutes = matches;
  selectedSuggestion = matches[0] || null;
  selectedId = selectedSuggestion?.id ?? null;
  renderResults();
  drawMap();
  if (!matches.length) $("resultStatus").textContent = "No hay un micro registrado que conecte ambos lugares.";
  try { localStorage.setItem("tpp-last-search", JSON.stringify({ origin: originText, destination: destinationText })); } catch (_) {}
}

$("searchForm").addEventListener("submit", event => { event.preventDefault(); runSearch(); });
$("swapBtn").addEventListener("click", () => { const old = originInput.value; originInput.value = destinationInput.value; destinationInput.value = old; });
document.querySelectorAll("[data-clear]").forEach(button => button.addEventListener("click", () => { const input = $(button.dataset.clear); input.value = ""; input.focus(); }));
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
  renderResults();
  const first = getVisibleRoutes()[0] || null;
  selectedSuggestion = first;
  selectedId = first?.id ?? null;
  drawMap();
}));
$("sortSelect").addEventListener("change", renderResults);
$("favoritesBtn").addEventListener("click", () => alert("Los favoritos todavía no están implementados en esta versión."));
$("historyBtn").addEventListener("click", () => {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("tpp-last-search") || "null"); } catch (_) {}
  if (!saved) { alert("Todavía no hay búsquedas guardadas en este navegador."); return; }
  originInput.value = saved.origin; destinationInput.value = saved.destination; runSearch();
});
$("showMapBtn").addEventListener("click", () => document.querySelector(".map-area").scrollIntoView({ behavior: "smooth" }));

// Ventana "Conócenos": misión, visión y objetivos del proyecto.
const aboutDialog = $("aboutDialog");
$("aboutOpen").addEventListener("click", () => {
  if (typeof aboutDialog.showModal === "function") aboutDialog.showModal();
  else aboutDialog.setAttribute("open", "");
});
$("aboutClose").addEventListener("click", () => {
  if (typeof aboutDialog.close === "function") aboutDialog.close();
  else aboutDialog.removeAttribute("open");
});
aboutDialog.addEventListener("click", event => {
  if (event.target === aboutDialog && typeof aboutDialog.close === "function") aboutDialog.close();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && aboutDialog.open && typeof aboutDialog.close === "function") aboutDialog.close();
});


refreshPlaceSuggestions();
renderResults();
drawMap();
setTimeout(() => map.invalidateSize(), 150);
window.addEventListener("resize", () => map.invalidateSize());

// Reconocimiento en segundo plano: los sitios encontrados se agregan a la base de datos
// y quedan disponibles en el datalist/buscador incluso después de cerrar la página.
(async function initializePlaceRecognition() {
  try {
    const found = await discoverNearbyPlaces(line68Track);
    upsertRecognizedPlaces(found);
    renderDatabaseStatus(`Se reconocieron y guardaron ${found.length} lugares nuevos o existentes de OpenStreetMap. Ya están disponibles en el buscador.`);
  } catch (error) {
    console.warn("Reconocimiento de lugares no disponible:", error);
    renderDatabaseStatus("No se pudo actualizar desde OpenStreetMap. Los lugares ya guardados y los agregados manualmente siguen disponibles en el buscador.");
  }
})();

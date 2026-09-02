const configuredApiBase = document.querySelector('meta[name="arhc-api-base"]')?.content.trim().replace(/\/$/, "");
const runtimeApi = configuredApiBase || (location.protocol.startsWith("http") ? "/api" : null);
const runtimeOrigin = runtimeApi ? new URL(runtimeApi, location.href).origin : "";
let artistProfile = {
  artistSlug: "robbie-rolla",
  artistName: "Robbie Rolla"
};
const artistSessionKey = "arhc.robbie-rolla.artist-session";
const artistTokenKey = "arhc.robbie-rolla.artist-token";
const isArtistAdmin = (new URLSearchParams(location.search).get("artist") === "robbie-rolla" || sessionStorage.getItem(artistSessionKey) === "active") && Boolean(sessionStorage.getItem(artistTokenKey));

let promoLinks = [
  {
    label: "Audiomack",
    title: "BECKY (GOLD EDITION)",
    detail: "Robbie Rolla, produced by Jason Reeves, AWOBE INC MEDIA",
    url: "https://audiomack.com/robbie-rolla/song/becky-gold-edition",
    tone: "green"
  },
  {
    label: "Amazon Music",
    title: "Robbie Rolla Artist Page",
    detail: "Artist page with Tears of Joy and related Robbie Rolla releases",
    url: "https://music.amazon.com/artists/B0GNS9HWBD/robbie-rolla",
    tone: "blue"
  },
  {
    label: "Amazon Music",
    title: "Tears of Joy",
    detail: "Single, 5:24, released Feb. 10, 2026",
    url: "https://music.amazon.com/albums/B0GPNQGSTW",
    tone: "gold"
  },
  {
    label: "Amazon Music",
    title: "GOT IT",
    detail: "Single, Robbie Rolla feat. Robbe Rolla, 4:07, released Feb. 24, 2026",
    url: "https://music.amazon.com/albums/B0GPFNR7BC",
    tone: "coral"
  },
  {
    label: "Amazon Music",
    title: "road runner",
    detail: "Single, 4:32, Awobe inc media, released Feb. 28, 2026",
    url: "https://music.amazon.com/albums/B0GNSGLYGH",
    tone: "green"
  }
];

const localArtistImages = [
  {
    title: "Robbie Rolla GY Cover",
    detail: "Featured public artist image",
    src: "./artist-media/robbie-rolla/robbie-rolla-gy-cover.png"
  },
  {
    title: "Robbie Rolla Live Room",
    detail: "ARHC live page hero image",
    src: "./assets/robbie-rolla-live.png",
    fallback: "linear-gradient(135deg, #36c58f, #101718 50%, #e0ad4f)"
  },
  {
    title: "Poolside Focus",
    detail: "Lifestyle promo photo",
    src: "./artist-media/robbie-rolla/robbie-rolla-pool.png"
  },
  {
    title: "Mountain Discipline",
    detail: "Athletic promo photo",
    src: "./artist-media/robbie-rolla/robbie-rolla-snow.png"
  },
  {
    title: "Beach Signal",
    detail: "Lifestyle promo photo",
    src: "./artist-media/robbie-rolla/robbie-rolla-beach.png"
  },
  {
    title: "Yacht Moment",
    detail: "Aspirational promo photo",
    src: "./artist-media/robbie-rolla/robbie-rolla-yacht.png"
  },
  {
    title: "Race Mode",
    detail: "Performance promo photo",
    src: "./artist-media/robbie-rolla/robbie-rolla-race.png"
  }
];
let artistImages = [...localArtistImages];

let artistVideos = [
  {
    id: "robbie-rolla-richie-case",
    title: "Richie & Case",
    detail: "Public artist video",
    src: "./artist-media/robbie-rolla/robbie-rolla-richie-case.mov",
    type: "video/quicktime"
  },
  {
    id: "robbie-rolla-da-hustlas-prayer",
    title: "Da Hustla's Prayer",
    detail: "Public artist video",
    src: "./artist-media/robbie-rolla/robbie-rolla-da-hustlas-prayer.mov",
    type: "video/quicktime"
  }
];

const localTracks = [
  {
    id: "we-belong-part-1",
    title: "We Belong",
    mood: "We Belong volume, part 1",
    price: 1.99,
    paid: true,
    isrc: "QT7J52600020",
    streamUrl: "./artist-audio/robbie-rolla/we-belong-part-1.mp3",
    downloadUrl: "./artist-audio/robbie-rolla/we-belong-part-1.mp3",
    fileName: "Robbie Rolla - We Belong Part 1.mp3",
    listenUrl: "",
    art: "linear-gradient(135deg, #36c58f, #101718 50%, #e0ad4f)"
  },
  {
    id: "we-belong-part-2-for-wishing",
    title: "for wishing",
    mood: "We Belong volume, part 2",
    price: 1.99,
    paid: true,
    isrc: "QT7J52600021",
    streamUrl: "./artist-audio/robbie-rolla/we-belong-part-2-for-wishing.mp3",
    downloadUrl: "./artist-audio/robbie-rolla/we-belong-part-2-for-wishing.mp3",
    fileName: "Robbie Rolla - We Belong Part 2 - for wishing.mp3",
    listenUrl: "",
    art: "radial-gradient(circle at 30% 22%, #f8faf7, #5ca8d8 34%, #141819 72%)"
  },
  {
    id: "black-light",
    title: "Black Light",
    mood: "Robbie Rolla single",
    price: 1.99,
    paid: true,
    isrc: "",
    streamUrl: "./artist-audio/robbie-rolla/black-light.mp3",
    downloadUrl: "./artist-audio/robbie-rolla/black-light.mp3",
    fileName: "Robbie Rolla - Black Light.mp3",
    listenUrl: "",
    art: "linear-gradient(135deg, #101718, #7338a7 45%, #36c58f)"
  }
];
let tracks = [...localTracks];

let playlists = [
  {
    id: "artist-current-set",
    title: "Robbie Rolla Current Set",
    owner: "Artist playlist",
    trackIds: ["we-belong-part-1", "we-belong-part-2-for-wishing", "black-light"]
  },
  {
    id: "fan-after-hours",
    title: "Fan After Hours",
    owner: "Fan playlist",
    trackIds: ["black-light", "we-belong-part-1"]
  }
];

const chatSeed = [
  { fan: "Mia", message: "That hook sounds expensive already." },
  { fan: "Jalen", message: "Play the featured Robbie Rolla track after this one." },
  { fan: "Sky Listener", message: "The room sounds warm tonight." }
];

let mediaStream = null;
let unlockedTracks = new Set(tracks.filter((track) => !track.paid).map((track) => track.id));
let selectedVideoId = artistVideos[0]?.id || "";
let videoSnippetTimer = null;
let videoRotationLocked = false;
let selectedTrackId = tracks[0]?.id || "";
let activeQueueId = "artist-current-set";
let fanQueue = [];

const $ = (selector) => document.querySelector(selector);
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const localRuntimeRecordKey = "arhc.robbie-rolla.runtime-record";
const visibilityKey = "arhc.robbie-rolla.stat-visibility";
let analyticsTotals = {};

const defaultStatVisibility = {
  "live:artist-camera": false,
  "track:we-belong-part-1": true,
  "track:we-belong-part-2-for-wishing": true,
  "track:black-light": true
};

function readLocalRuntimeRecord() {
  try {
    return JSON.parse(localStorage.getItem(localRuntimeRecordKey)) || { events: [], totals: {} };
  } catch {
    return { events: [], totals: {} };
  }
}

function writeLocalRuntimeRecord(record) {
  localStorage.setItem(localRuntimeRecordKey, JSON.stringify(record));
  window.arhcRuntimeRecord = record;
}

function readStatVisibility() {
  try {
    return { ...defaultStatVisibility, ...(JSON.parse(localStorage.getItem(visibilityKey)) || {}) };
  } catch {
    return { ...defaultStatVisibility };
  }
}

function writeStatVisibility(settings) {
  localStorage.setItem(visibilityKey, JSON.stringify(settings));
}

function setStatVisibility(targetType, targetId, isPublic) {
  const settings = readStatVisibility();
  settings[`${targetType}:${targetId}`] = isPublic;
  writeStatVisibility(settings);
  renderTracks();
  renderArtistDashboard();
  updateLiveControls();
}

function recordLocalRuntimeEvent(payload) {
  const record = readLocalRuntimeRecord();
  const key = [payload.artistSlug, payload.action, payload.targetType, payload.targetId].map((part) => part || "unknown").join(":");
  const existing = record.totals[key] || {
    artistSlug: payload.artistSlug,
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId,
    targetTitle: payload.targetTitle,
    count: 0
  };
  const event = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    ...payload
  };

  record.events = [...record.events, event].slice(-500);
  record.totals[key] = {
    ...existing,
    targetTitle: payload.targetTitle || existing.targetTitle,
    targetUrl: payload.targetUrl || existing.targetUrl,
    isrc: payload.isrc || existing.isrc || "",
    count: existing.count + 1,
    lastEventAt: event.createdAt
  };
  writeLocalRuntimeRecord(record);
  return event;
}

function resolveMediaUrl(url) {
  if (!url || !runtimeApi) return url || "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  const normalized = url.replace(/^\.\//, "").replace(/^\//, "");
  const serverMediaRoots = ["artist-audio/", "artist-media/", "assets/"];
  if (serverMediaRoots.some((root) => normalized.startsWith(root))) {
    return `${runtimeOrigin}/${normalized}`;
  }

  return url;
}

function normalizeTrack(track) {
  return {
    ...track,
    streamUrl: resolveMediaUrl(track.streamUrl),
    downloadUrl: resolveMediaUrl(track.downloadUrl)
  };
}

function mergeById(remoteItems, localItems) {
  const merged = new Map();
  [...(remoteItems || []), ...localItems].forEach((item) => {
    const key = item?.id || item?.src || item?.title;
    if (key) merged.set(key, { ...merged.get(key), ...item });
  });
  return [...merged.values()];
}

function keepRobbieOnlyImages(images) {
  return images.filter((image) => !/gq-cover-light|lifestyle-collage/i.test(image.src || image.title || ""));
}

function selectedTrack() {
  return tracks.find((track) => track.id === selectedTrackId) || tracks[0];
}

function currentQueueTrackIds() {
  if (activeQueueId === "fan-custom") {
    return fanQueue.length ? fanQueue : tracks.map((track) => track.id);
  }

  const playlist = playlists.find((entry) => entry.id === activeQueueId);
  return playlist?.trackIds?.length ? playlist.trackIds : tracks.map((track) => track.id);
}

function selectTrack(trackId, { autoplay = false } = {}) {
  const track = tracks.find((candidate) => candidate.id === trackId);
  if (!track) return;
  selectedTrackId = track.id;
  renderTracks();
  renderPlaylists();

  const player = $("#main-track-player");
  if (autoplay && player) {
    player.play().catch(() => {});
  }
}

function moveInQueue(direction, { autoplay = true } = {}) {
  const queue = currentQueueTrackIds();
  if (!queue.length) return;
  const currentIndex = Math.max(0, queue.indexOf(selectedTrackId));
  const nextIndex = direction === "previous"
    ? (currentIndex - 1 + queue.length) % queue.length
    : (currentIndex + 1) % queue.length;
  selectTrack(queue[nextIndex], { autoplay });
}

function countFor({ action, targetType, targetId }) {
  const actions = Array.isArray(action) ? action : [action];
  return Object.values(analyticsTotals).reduce((sum, record) => {
    if (!actions.includes(record.action)) return sum;
    if (record.targetType !== targetType) return sum;
    if (record.targetId !== targetId) return sum;
    return sum + Number(record.count || 0);
  }, 0);
}

function publicCountLabel(targetType, targetId, action) {
  if (!readStatVisibility()[`${targetType}:${targetId}`]) return "";
  const count = countFor({ action, targetType, targetId });
  const noun = action.includes("stream") ? "streams" : action.includes("download") ? "downloads" : "views";
  return `<span class="public-stat">${count} ${noun}</span>`;
}

function normalizeImage(image) {
  return { ...image, src: resolveMediaUrl(image.src) };
}

function normalizeVideo(video) {
  return { ...video, src: resolveMediaUrl(video.src) };
}

function selectedArtistVideo() {
  return artistVideos.find((video) => video.id === selectedVideoId) || artistVideos[0];
}

function clearVideoSnippetRotation() {
  if (videoSnippetTimer) {
    clearTimeout(videoSnippetTimer);
    videoSnippetTimer = null;
  }
}

function setPaymentStatus(message) {
  $("#payment-status").textContent = message;
}

function applyFeaturedArtistConfig(config) {
  artistProfile = {
    artistSlug: config.artistSlug || artistProfile.artistSlug,
    artistName: config.artistName || artistProfile.artistName
  };
  promoLinks = Array.isArray(config.promoLinks) ? config.promoLinks : promoLinks;
  artistImages = Array.isArray(config.images)
    ? keepRobbieOnlyImages(mergeById(config.images, localArtistImages)).map(normalizeImage)
    : keepRobbieOnlyImages(artistImages).map(normalizeImage);
  artistVideos = Array.isArray(config.videos) ? config.videos.map(normalizeVideo) : artistVideos;
  tracks = Array.isArray(config.tracks) ? mergeById(config.tracks, localTracks).map(normalizeTrack) : tracks.map(normalizeTrack);
  selectedTrackId = selectedTrack()?.id || "";
  selectedVideoId = selectedArtistVideo()?.id || "";
  unlockedTracks = new Set(tracks.filter((track) => !track.paid).map((track) => track.id));

  document.title = config.title || document.title;
  $("#artist-title").textContent = artistProfile.artistName;
  $(".artist-line").textContent = config.tagline || $(".artist-line").textContent;
  $(".artist-hero img").src = resolveMediaUrl(config.heroImage) || $(".artist-hero img").src;
  $(".artist-hero img").alt = config.heroAlt || $(".artist-hero img").alt;
  $("#camera-placeholder strong").textContent = `${artistProfile.artistName} Live`;
  $("#promo-title").textContent = `${artistProfile.artistName} Around The Web`;
  $("#support-title").textContent = "PayPal Donations And Fan Support";
}

async function loadFeaturedArtistConfig() {
  if (!runtimeApi) return;

  try {
    const response = await fetch(`${runtimeApi}/featured-artists/robbie-rolla`, { cache: "no-store" });
    if (!response.ok) return;
    applyFeaturedArtistConfig(await response.json());
  } catch {
    setPaymentStatus("Public listening is open. Checkout will be available shortly.");
  }
}

function trackPublicEvent({ action, targetType, targetId, targetTitle, targetUrl }) {
  const trackedTrack = targetType === "track" ? tracks.find((track) => track.id === targetId) : null;
  const payload = {
    ...artistProfile,
    action,
    targetType,
    targetId,
    targetTitle,
    targetUrl,
    isrc: trackedTrack?.isrc || "",
    referrer: document.referrer,
    pagePath: location.pathname
  };
  recordLocalRuntimeEvent(payload);
  if (!runtimeApi) return;

  fetch(`${runtimeApi}/public/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify(payload)
  })
    .then((response) => response.ok ? response.json() : null)
    .then((result) => {
      if (result?.totals) {
        analyticsTotals = result.totals;
        renderArtistDashboard();
      }
    })
    .catch(() => {});
}

async function refreshAnalytics() {
  const localRecord = readLocalRuntimeRecord();
  analyticsTotals = { ...(localRecord.totals || {}) };
  if (!runtimeApi) return;

  try {
    const response = await fetch(`${runtimeApi}/public/analytics`, { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json();
    analyticsTotals = result.totals || analyticsTotals;
  } catch {
    // Local counts stay available when the live reporting endpoint cannot be reached.
  }
}

function renderTracks() {
  const activeTrack = selectedTrack();
  const queue = currentQueueTrackIds();
  const queuePosition = Math.max(0, queue.indexOf(activeTrack?.id)) + 1;
  $("#now-playing").innerHTML = activeTrack ? `
    <div>
      <span>Now streaming</span>
      <strong>${activeTrack.title}</strong>
      <small>${activeTrack.mood} ${queue.length ? `- ${queuePosition} of ${queue.length}` : ""}</small>
    </div>
    <div class="player-stack">
      <audio id="main-track-player" class="main-track-player" controls preload="metadata" src="${activeTrack.streamUrl || activeTrack.downloadUrl}" data-stream-track="${activeTrack.id}"></audio>
      <div class="player-controls" aria-label="Playlist controls">
        <button type="button" data-action="previous-track">Previous</button>
        <button type="button" data-action="next-track">Next</button>
      </div>
    </div>
  ` : "";

  $("#track-grid").innerHTML = tracks.map((track) => {
    const unlocked = unlockedTracks.has(track.id);
    const active = track.id === activeTrack?.id;
    return `
      <article class="track-card ${active ? "active" : ""}" data-track-id="${track.id}">
        <div class="track-art" style="--art: ${track.art}"></div>
        <header>
          <div>
            <strong>${track.title}</strong>
            <small>${track.mood}</small>
          </div>
          <span class="track-price">${track.price ? money(track.price) : "Free"}</span>
        </header>
        <p>Stream this title free. Downloads are ${money(track.price)} each.</p>
        ${publicCountLabel("track", track.id, "stream.played")}
        <div class="track-actions">
          <button type="button" data-action="select-track" data-track-id="${track.id}">${active ? "Playing" : "Play Stream"}</button>
          <button type="button" data-action="add-fan-track" data-track-id="${track.id}">Add To Fan Playlist</button>
          ${track.listenUrl ? `<a class="listen-link" href="${track.listenUrl}" target="_blank" rel="noreferrer" data-track-link="${track.id}">Listen</a>` : ""}
          <button type="button" data-action="${unlocked ? "download" : "pay"}" data-track-id="${track.id}">
            ${unlocked ? "Download Track" : `Purchase Download ${money(track.price)}`}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderArtistDashboard() {
  const dashboard = $("#artist-dashboard");
  const uploadSection = $("#artist-upload");
  const navLinks = document.querySelectorAll(".artist-admin-link");
  dashboard.hidden = !isArtistAdmin;
  uploadSection.hidden = !isArtistAdmin;
  navLinks.forEach((link) => {
    link.hidden = !isArtistAdmin;
  });
  if (!isArtistAdmin) return;

  const visibility = readStatVisibility();
  const rows = [
    {
      targetType: "live",
      targetId: "artist-camera",
      title: "Live Room",
      primaryAction: "live.viewed",
      secondaryAction: ["page.viewed", "page.server_viewed"]
    },
    ...tracks.map((track) => ({
      targetType: "track",
      targetId: track.id,
      title: track.title,
      primaryAction: "stream.played",
      secondaryAction: "download.payment_started"
    }))
  ];

  $("#artist-stats-grid").innerHTML = rows.map((row) => {
    const visibilityId = `${row.targetType}:${row.targetId}`;
    const publicStats = Boolean(visibility[visibilityId]);
    return `
      <article class="artist-stat-card">
        <span>${row.targetType === "live" ? "Live stream" : "Upload"}</span>
        <strong>${row.title}</strong>
        <div class="stat-counts">
          <b>${countFor({ action: row.primaryAction, targetType: row.targetType, targetId: row.targetId })}</b>
          <small>${row.targetType === "live" ? "live views" : "streams"}</small>
          <b>${countFor({ action: row.secondaryAction, targetType: row.targetType === "live" ? "page" : row.targetType, targetId: row.targetType === "live" ? "artist-page" : row.targetId })}</b>
          <small>${row.targetType === "live" ? "page views" : "purchase taps"}</small>
        </div>
        <label class="visibility-toggle">
          <input type="checkbox" data-stat-visibility="${visibilityId}" ${publicStats ? "checked" : ""} />
          <span>${publicStats ? "Counts public" : "Counts private"}</span>
        </label>
      </article>
    `;
  }).join("");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result).split(",")[1] || ""));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

async function uploadArtistAudio(event) {
  event.preventDefault();
  const status = $("#artist-upload-status");
  const token = sessionStorage.getItem(artistTokenKey);
  if (!runtimeApi || !token) {
    status.textContent = "Artist sign in is required before uploading audio.";
    return;
  }

  const form = new FormData(event.currentTarget);
  const audioFiles = form.getAll("audio").filter((file) => file && file.name);
  if (!audioFiles.length) {
    status.textContent = "Choose at least one MP3 before uploading.";
    return;
  }

  const uploads = [];
  const uploadType = form.get("uploadType");
  const albumTitle = String(form.get("albumTitle") || "").trim();
  const albumIsrc = String(form.get("albumIsrc") || "").trim();
  const singleTitle = String(form.get("title") || "").trim();
  const singleExistingIsrc = String(form.get("isrc") || "").trim();

  for (const [index, audioFile] of audioFiles.entries()) {
    const derivedTitle = audioFiles.length === 1
      ? singleTitle
      : audioFile.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    status.textContent = `Uploading ${index + 1} of ${audioFiles.length}: ${derivedTitle || audioFile.name}`;

    const response = await fetch(`${runtimeApi}/artist/robbie-rolla/uploads/audio`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uploadType,
        albumTitle,
        albumIsrc,
        title: derivedTitle || audioFile.name,
        isrc: audioFiles.length === 1 ? singleExistingIsrc : "",
        fileName: audioFile.name,
        audioBase64: await fileToBase64(audioFile)
      })
    });
    const result = await response.json();
    if (!response.ok) {
      status.textContent = result.error || `${audioFile.name} could not be uploaded.`;
      return;
    }
    uploads.push(result.upload);
  }

  tracks = mergeById(tracks, uploads.map((upload) => ({
    id: upload.id,
    title: upload.title,
    mood: `${upload.isrcSource === "artist-supplied" ? "Artist supplied ISRC" : "The ARHC assigned ISRC"} ${upload.isrc}`,
    price: 1.99,
    paid: true,
    isrc: upload.isrc,
    collectionIsrc: upload.collectionIsrc || "",
    collectionTitle: upload.albumTitle || "",
    streamUrl: resolveMediaUrl(upload.streamUrl),
    downloadUrl: resolveMediaUrl(upload.streamUrl),
    fileName: upload.fileName,
    listenUrl: "",
    art: "linear-gradient(135deg, #101718, #36c58f 45%, #e0ad4f)"
  })));
  selectedTrackId = uploads[0].id;
  renderTracks();
  renderPlaylists();
  renderArtistDashboard();
  status.textContent = uploads.length === 1
    ? `${uploads[0].title} uploaded with ISRC ${uploads[0].isrc}.`
    : `${uploads.length} tracks uploaded. Each track received its own ISRC${albumTitle ? ` under ${albumTitle}` : ""}.`;
  event.currentTarget.reset();
}

function renderPlaylists() {
  const basePlaylists = playlists.map((playlist) => {
    const playlistTracks = playlist.trackIds.map((id) => tracks.find((track) => track.id === id)).filter(Boolean);
    return `
      <article class="playlist-card ${activeQueueId === playlist.id ? "active" : ""}">
        <span>${playlist.owner}</span>
        <strong>${playlist.title}</strong>
        <div class="playlist-tracks">
          ${playlistTracks.map((track) => `<button type="button" data-action="select-track" data-track-id="${track.id}">${track.title}</button>`).join("")}
        </div>
        <button type="button" data-action="play-playlist" data-playlist-id="${playlist.id}">Play Playlist</button>
      </article>
    `;
  });
  const fanTracks = fanQueue.map((id) => tracks.find((track) => track.id === id)).filter(Boolean);
  basePlaylists.push(`
    <article class="playlist-card ${activeQueueId === "fan-custom" ? "active" : ""}">
      <span>Fan playlist</span>
      <strong>Your Listening Party Queue</strong>
      <small>Build a set, press play, and let it run.</small>
      <div class="playlist-tracks">
        ${fanTracks.length ? fanTracks.map((track) => `<button type="button" data-action="select-track" data-track-id="${track.id}">${track.title}</button>`).join("") : "<em>Add songs from the music cards.</em>"}
      </div>
      <div class="playlist-actions">
        <button type="button" data-action="play-playlist" data-playlist-id="fan-custom">Play Fan Playlist</button>
        <button type="button" data-action="clear-fan-playlist">Clear</button>
      </div>
    </article>
  `);
  $("#playlist-grid").innerHTML = basePlaylists.join("");
}

function renderPromoLinks() {
  $("#promo-grid").innerHTML = promoLinks.map((link) => `
    <a class="promo-card ${link.tone}" href="${link.url}" target="_blank" rel="noreferrer" data-promo-link="${link.title}">
      <span>${link.label}</span>
      <strong>${link.title}</strong>
      <small>${link.detail}</small>
    </a>
  `).join("");
}

function renderImages() {
  $("#image-grid").innerHTML = artistImages.map((image) => `
    <figure class="image-card">
      <img src="${image.src}" alt="${image.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <div class="image-fallback" style="--fallback: ${image.fallback || "linear-gradient(135deg, #36c58f, #101718 50%, #e0ad4f)"}"></div>
      <figcaption>
        <strong>${image.title}</strong>
        <small>${image.detail}</small>
      </figcaption>
    </figure>
  `).join("");
}

function renderVideos() {
  const activeVideo = selectedArtistVideo();
  if (!activeVideo) {
    $("#video-grid").innerHTML = "";
    return;
  }

  const previewMode = !videoRotationLocked && artistVideos.length > 1;
  $("#video-grid").innerHTML = `
    <article class="video-player-card">
      <div class="video-stage">
        <video class="featured-video" controls preload="metadata" ${previewMode ? "autoplay muted playsinline" : ""} data-video-id="${activeVideo.id}" data-preview-mode="${previewMode}">
          <source src="${activeVideo.src}" type="${activeVideo.type}" />
        </video>
        <div class="snippet-badge" id="snippet-badge">${previewMode ? "Preview rotation" : "Full video selected"}</div>
      </div>
      <div class="video-meta">
        <div>
          <strong>${activeVideo.title}</strong>
          <small>${activeVideo.detail}</small>
        </div>
        <span>${artistVideos.length} videos</span>
      </div>
      <div class="video-menu" aria-label="Select full artist video">
        ${artistVideos.map((video) => `
          <button type="button" class="video-choice ${video.id === activeVideo.id ? "active" : ""}" data-select-video="${video.id}" aria-pressed="${video.id === activeVideo.id}">
            <span>${video.title}</span>
            <small>${video.detail}</small>
          </button>
        `).join("")}
      </div>
    </article>
  `;
  startVideoSnippetRotation();
}

function startVideoSnippetRotation() {
  clearVideoSnippetRotation();
  if (videoRotationLocked || artistVideos.length < 2) return;

  videoSnippetTimer = setTimeout(() => {
    const currentIndex = artistVideos.findIndex((video) => video.id === selectedVideoId);
    const nextVideo = artistVideos[(currentIndex + 1) % artistVideos.length] || artistVideos[0];
    selectedVideoId = nextVideo.id;
    renderVideos();
  }, 12000);
}

function renderChat() {
  $("#chat-list").innerHTML = chatSeed.map((entry) => `
    <div class="chat-message">
      <strong>${entry.fan}</strong>
      <span>${entry.message}</span>
    </div>
  `).join("");
}

async function downloadTrack(track) {
  trackPublicEvent({
    action: "download.attempted",
    targetType: "track",
    targetId: track.id,
    targetTitle: track.title,
    targetUrl: track.downloadUrl
  });

  const response = await fetch(track.downloadUrl, { method: "HEAD" });
  if (!response.ok) {
    setPaymentStatus(`Upload ${track.fileName} to ${track.downloadUrl} before fans can download it.`);
    trackPublicEvent({
      action: "download.missing_file",
      targetType: "track",
      targetId: track.id,
      targetTitle: track.title,
      targetUrl: track.downloadUrl
    });
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = track.downloadUrl;
  anchor.download = track.fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setPaymentStatus(`${track.title} download started.`);
  trackPublicEvent({
    action: "download.started",
    targetType: "track",
    targetId: track.id,
    targetTitle: track.title,
    targetUrl: track.downloadUrl
  });
}

async function createPaypalOrder({ amount, purpose, label, email = "fan@example.com" }) {
  if (!runtimeApi) {
    setPaymentStatus("Checkout is being connected for Robbie Rolla downloads and donations.");
    return null;
  }
  const isDonation = purpose === "artist-tip";

  const response = await fetch(`${runtimeApi}/payments/paypal/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payerType: "fan",
      payerUsername: "robbie-rolla-page-fan",
      plan: isDonation ? "artist-tip" : "music-download",
      billingCycle: "one-time",
      amount,
      currency: "USD",
      marketPurpose: purpose,
      walletStatus: isDonation ? "Donation support" : "Music download",
      contactEmail: email,
      billingConsent: true
    })
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "PayPal order failed");

  if (!result.configured) {
    setPaymentStatus(`${label} checkout is being prepared. Please try again shortly.`);
    return result;
  }

  if (result.approvalUrl) {
    setPaymentStatus(`${label} checkout opening in PayPal.`);
    window.location.href = result.approvalUrl;
    return result;
  }

  setPaymentStatus("PayPal did not return a checkout link. Check the live PayPal env and Render logs.");
  return result;
}

function updateLiveControls() {
  const active = Boolean(mediaStream);
  const livePublicCount = readStatVisibility()["live:artist-camera"]
    ? `<span class="public-stat">${countFor({ action: ["page.viewed", "page.server_viewed"], targetType: "page", targetId: "artist-page" })} views</span>`
    : "";
  document.querySelector(".stream-controls")?.toggleAttribute("hidden", !isArtistAdmin);
  $("#start-live").disabled = active;
  $("#stop-live").disabled = !active;
  $("#toggle-video").disabled = !active;
  $("#toggle-audio").disabled = !active;
  $("#camera-placeholder").classList.toggle("is-hidden", active);
  $("#live-room-status").textContent = active ? "Broadcast preview live" : isArtistAdmin ? "Artist room ready" : "Viewer room open";
  $("#stream-access-pill").innerHTML = livePublicCount || "Public room";
}

async function startLive() {
  if (!navigator.mediaDevices?.getUserMedia) {
    $("#live-room-status").textContent = "Camera unavailable";
    return;
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  $("#artist-camera").srcObject = mediaStream;
  await $("#artist-camera").play();
  updateLiveControls();
  trackPublicEvent({
    action: "stream.started",
    targetType: "live",
    targetId: "artist-camera",
    targetTitle: `${artistProfile.artistName} Live Room`,
    targetUrl: location.href
  });
}

function stopLive() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  $("#artist-camera").srcObject = null;
  updateLiveControls();
  trackPublicEvent({
    action: "stream.stopped",
    targetType: "live",
    targetId: "artist-camera",
    targetTitle: `${artistProfile.artistName} Live Room`,
    targetUrl: location.href
  });
}

document.addEventListener("click", async (event) => {
  const promoLink = event.target.closest("[data-promo-link]");
  if (promoLink) {
    trackPublicEvent({
      action: "link.clicked",
      targetType: "promo",
      targetId: promoLink.dataset.promoLink,
      targetTitle: promoLink.dataset.promoLink,
      targetUrl: promoLink.href
    });
  }

  const trackLink = event.target.closest("[data-track-link]");
  if (trackLink) {
    const linkedTrack = tracks.find((candidate) => candidate.id === trackLink.dataset.trackLink);
    trackPublicEvent({
      action: "stream.link_clicked",
      targetType: "track",
      targetId: linkedTrack?.id || trackLink.dataset.trackLink,
      targetTitle: linkedTrack?.title || trackLink.textContent.trim(),
      targetUrl: trackLink.href
    });
  }

  const fanPath = event.target.closest("[data-fan-path]");
  if (fanPath) {
    trackPublicEvent({
      action: "fan.path_clicked",
      targetType: "fan-path",
      targetId: fanPath.dataset.fanPath,
      targetTitle: fanPath.querySelector("strong")?.textContent || fanPath.dataset.fanPath,
      targetUrl: fanPath.href
    });
  }

  const liveLink = event.target.closest('a[href="#live"]');
  if (liveLink) {
    trackPublicEvent({
      action: "live.viewed",
      targetType: "live",
      targetId: "artist-camera",
      targetTitle: `${artistProfile.artistName} Live Room`,
      targetUrl: location.href
    });
  }

  const videoChoice = event.target.closest("[data-select-video]");
  if (videoChoice) {
    videoRotationLocked = true;
    selectedVideoId = videoChoice.dataset.selectVideo;
    renderVideos();
    const selectedVideo = selectedArtistVideo();
    trackPublicEvent({
      action: "video.selected",
      targetType: "video",
      targetId: selectedVideo?.id || selectedVideoId,
      targetTitle: selectedVideo?.title || "Artist video",
      targetUrl: selectedVideo?.src || ""
    });
    return;
  }

  const button = event.target.closest("[data-action]");
  const visibilityControl = event.target.closest("[data-stat-visibility]");
  if (visibilityControl) {
    const [targetType, targetId] = visibilityControl.dataset.statVisibility.split(":");
    setStatVisibility(targetType, targetId, visibilityControl.checked);
    return;
  }

  if (!button) return;

  if (button.dataset.action === "previous-track") {
    moveInQueue("previous", { autoplay: true });
    return;
  }

  if (button.dataset.action === "next-track") {
    moveInQueue("next", { autoplay: true });
    return;
  }

  if (button.dataset.action === "play-playlist") {
    activeQueueId = button.dataset.playlistId || "artist-current-set";
    const queue = currentQueueTrackIds();
    selectTrack(queue[0], { autoplay: true });
    trackPublicEvent({
      action: "playlist.played",
      targetType: "playlist",
      targetId: activeQueueId,
      targetTitle: button.closest(".playlist-card")?.querySelector("strong")?.textContent || "Playlist",
      targetUrl: location.href
    });
    return;
  }

  if (button.dataset.action === "clear-fan-playlist") {
    fanQueue = [];
    activeQueueId = "artist-current-set";
    renderTracks();
    renderPlaylists();
    return;
  }

  const track = tracks.find((candidate) => candidate.id === button.dataset.trackId);
  if (!track) return;

  if (button.dataset.action === "add-fan-track") {
    if (!fanQueue.includes(track.id)) fanQueue.push(track.id);
    activeQueueId = "fan-custom";
    renderTracks();
    renderPlaylists();
    trackPublicEvent({
      action: "playlist.track_added",
      targetType: "track",
      targetId: track.id,
      targetTitle: track.title,
      targetUrl: track.streamUrl
    });
    return;
  }

  if (button.dataset.action === "select-track") {
    selectTrack(track.id, { autoplay: true });
    trackPublicEvent({
      action: "stream.selected",
      targetType: "track",
      targetId: track.id,
      targetTitle: track.title,
      targetUrl: track.streamUrl
    });
    return;
  }

  if (button.dataset.action === "download") {
    downloadTrack(track);
    return;
  }

  try {
    trackPublicEvent({
      action: "download.payment_started",
      targetType: "track",
      targetId: track.id,
      targetTitle: track.title,
      targetUrl: track.downloadUrl
    });
    await createPaypalOrder({
      amount: track.price,
      purpose: "music-download",
      label: track.title
    });
  } catch (error) {
    setPaymentStatus(error.message);
  }
});

document.addEventListener("play", (event) => {
  const video = event.target.closest?.("[data-video-id]");
  if (video) {
    if (video.dataset.previewMode === "true") return;
    const artistVideo = artistVideos.find((candidate) => candidate.id === video.dataset.videoId);
    trackPublicEvent({
      action: "video.played",
      targetType: "video",
      targetId: artistVideo?.id || video.dataset.videoId,
      targetTitle: artistVideo?.title || "Artist video",
      targetUrl: video.currentSrc || artistVideo?.src || ""
    });
    return;
  }

  const player = event.target.closest?.("[data-stream-track]");
  if (!player) return;
  const track = tracks.find((candidate) => candidate.id === player.dataset.streamTrack);
  trackPublicEvent({
    action: "stream.played",
    targetType: "track",
    targetId: track?.id || player.dataset.streamTrack,
    targetTitle: track?.title || "Track",
    targetUrl: player.currentSrc || player.src
  });
}, true);

document.addEventListener("ended", (event) => {
  const video = event.target.closest?.("[data-video-id]");
  if (video) {
    if (video.dataset.previewMode === "true") return;
    const artistVideo = artistVideos.find((candidate) => candidate.id === video.dataset.videoId);
    trackPublicEvent({
      action: "video.completed",
      targetType: "video",
      targetId: artistVideo?.id || video.dataset.videoId,
      targetTitle: artistVideo?.title || "Artist video",
      targetUrl: video.currentSrc || artistVideo?.src || ""
    });
    return;
  }

  const player = event.target.closest?.("[data-stream-track]");
  if (!player) return;
  const track = tracks.find((candidate) => candidate.id === player.dataset.streamTrack);
  moveInQueue("next", { autoplay: true });
  trackPublicEvent({
    action: "stream.completed",
    targetType: "track",
    targetId: track?.id || player.dataset.streamTrack,
    targetTitle: track?.title || "Track",
    targetUrl: player.currentSrc || player.src
  });
}, true);

$("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  chatSeed.push({
    fan: form.get("fanName").trim() || "Fan",
    message: form.get("message").trim()
  });
  event.currentTarget.elements.message.value = "";
  renderChat();
});

$("#support-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await createPaypalOrder({
      amount: Number(form.get("amount")),
      purpose: "artist-tip",
      label: "Robbie Rolla tip",
      email: form.get("email").trim()
    });
  } catch (error) {
    setPaymentStatus(error.message);
  }
});

$("#artist-upload-form").addEventListener("submit", (event) => {
  uploadArtistAudio(event).catch((error) => {
    $("#artist-upload-status").textContent = error.message;
  });
});

$("#start-live").addEventListener("click", () => {
  if (!isArtistAdmin) {
    $("#live-room-status").textContent = "Fans can watch and message. Robbie Rolla controls the broadcast.";
    return;
  }
  startLive().catch((error) => {
    $("#live-room-status").textContent = error.message;
  });
});

$("#stop-live").addEventListener("click", stopLive);

$("#toggle-video").addEventListener("click", () => {
  const track = mediaStream?.getVideoTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  $("#toggle-video").textContent = track.enabled ? "Camera On" : "Camera Off";
});

$("#toggle-audio").addEventListener("click", () => {
  const track = mediaStream?.getAudioTracks()[0];
  if (!track) return;
  track.enabled = !track.enabled;
  $("#toggle-audio").textContent = track.enabled ? "Mic On" : "Mic Off";
});

async function initArtistPage() {
  await loadFeaturedArtistConfig();
  renderTracks();
  renderPlaylists();
  renderPromoLinks();
  renderImages();
  renderVideos();
  renderChat();
  await refreshAnalytics();
  renderArtistDashboard();
  updateLiveControls();
  trackPublicEvent({
    action: "page.viewed",
    targetType: "page",
    targetId: "artist-page",
    targetTitle: `${artistProfile.artistName} Artist Page`,
    targetUrl: location.href
  });
}

initArtistPage();

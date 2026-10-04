import "./style.css";
import * as THREE from "three";
import { SubmarinePilot, cameraPose, type CameraMode } from "./pilot";
import {
  AquariumSimulation,
  SPECIES,
  MISSIONS,
  direction,
  type Species,
  type Vec,
} from "./simulation";
import {
  makeFish,
  makeSubmarine,
  makeEnemy,
  makeHabitat,
  fishThumbnail,
  material,
  disposeModel,
} from "./assets";

const icons: Record<string, string> = {
  sub: '<path d="M7 9h10a5 5 0 0 1 0 10H8a5 5 0 0 1-1-10Z"/><path d="M11 9V4h5M3 12l-2-1v6l2-1"/><circle cx="16" cy="14" r="2"/><circle cx="21" cy="4" r="1"/>',
  fish: '<path d="M4 12s4-7 10-7c5 0 8 7 8 7s-3 7-8 7c-6 0-10-7-10-7Z"/><path d="m4 12-3-5v10l3-5M13 5l-2-3M13 19l-2 3"/><circle cx="17" cy="10" r=".7"/>',
  pearl:
    '<circle cx="12" cy="12" r="8"/><path d="M7 11a5 5 0 0 1 5-4M16 16h.01"/>',
  food: '<path d="m10 3 4 1 1 4-3 3-4-2-1-3Zm6 11 3-1 3 3-2 4-4-1-1-3ZM3 14l4-1 3 4-3 4-4-2Z"/>',
  crosshair:
    '<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  heart:
    '<path d="M20.5 4.5a5.5 5.5 0 0 0-7.8 0L12 5.2l-.7-.7a5.5 5.5 0 0 0-7.8 7.8L12 21l8.5-8.7a5.5 5.5 0 0 0 0-7.8Z"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 13 8-13 8V4Z"/>',
  sound:
    '<path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  camera:
    '<path d="M3 7h4l2-3h6l2 3h4v13H3V7Z"/><circle cx="12" cy="13" r="4"/>',
  wave: '<path d="M2 7c4-5 6 5 10 0s6 5 10 0M2 13c4-5 6 5 10 0s6 5 10 0M2 19c4-5 6 5 10 0s6 5 10 0"/>',
  sprout:
    '<path d="M12 21V10M12 15C4 15 3 9 3 6c5 0 9 3 9 9Zm0-4c0-7 5-9 9-9 0 6-3 9-9 9Z"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 8M3 3v7h7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="m8 5 7 7-7 7"/>',
};
const icon = (name: string, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.star}</svg>`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <header class="site-header">
    <a class="brand" href="#" aria-label="Little Depths home"><span class="brand-mark">${icon("sub")}</span><span>little depths<span class="brand-dot">.</span></span></a>
    <nav class="main-nav" aria-label="Main navigation"><button class="nav-link active" id="aquarium-nav">The aquarium</button><button class="nav-link" id="guide-nav">Field guide <span class="nav-tag">04</span></button></nav>
    <div class="header-actions"><button class="help-button" id="help-button">${icon("help")}<span>Controls</span></button><span class="header-divider"></span><button class="icon-button" id="sound-button" aria-label="Enable sound" title="Enable sound">${icon("mute")}</button></div>
  </header>
  <main class="page">
    <section class="intro"><div><h1>Your little ocean<span>.</span></h1></div><div class="player-resources"><div class="keeper-badge">${icon("star")}<div><strong id="keeper-level">Level 1</strong><div class="xp-track"><i id="xp-fill"></i></div></div></div><div class="pearl-badge"><span class="pearl-orb"></span><div><strong id="pearl-count">180</strong></div></div></div></section>
    <div class="game-layout">
      <section class="aquarium" aria-label="Interactive 3D aquarium">
        <div class="tank-stage" id="tank-stage">
          <div id="world" role="application" aria-label="3D aquarium game. WASD to move, drag to look, Q and E to dive or rise, F to feed, Space to shoot, C to switch camera." tabindex="0"></div>
          <div class="cockpit-frame" aria-hidden="true"><div class="cockpit-rim"></div><div class="cockpit-dashboard"><div class="cockpit-gauge depth-gauge"><i></i>${icon("wave")}</div><div class="cockpit-gauge hull-gauge"><i></i>${icon("shield")}</div><div class="cockpit-gauge speed-gauge"><i></i>${icon("arrow")}</div></div></div><div class="pilot-reticle" aria-hidden="true">${icon("crosshair")}</div><div class="tank-top"><div class="tank-location"><span class="location-icon">${icon("wave")}</span><div><h2>Coral Cove</h2></div><span class="tank-status" id="tank-status"><i></i> Calm</span></div><div class="view-actions"><button class="icon-button camera-mode" id="camera-button" aria-label="Switch to cockpit view" title="Switch to cockpit view (C)">${icon("camera")}<span>Chase</span></button><button class="icon-button" id="fullscreen-button" aria-label="Enter fullscreen" title="Fullscreen aquarium">${icon("expand")}</button></div></div>
          <div class="wave-warning hidden" id="wave-warning">${icon("shield")}<span>Intruder! <strong>Space to shoot</strong></span></div>
          <div class="tutorial-note" id="tutorial-note"><kbd>F</kbd><span>Feed your fish</span><button id="dismiss-tip" aria-label="Dismiss hint">${icon("close")}</button></div>
          <div class="floating-labels" id="floating-labels"></div>
          <div class="tank-bottom"><div class="sub-status"><span class="sub-icon">${icon("sub")}</span><div><span class="sub-name">BUMBLE</span><div class="hull-row"><div class="hull-track"><i id="hull-fill"></i></div><span id="hull-value">100%</span></div></div></div></div>
          <div class="pause-overlay hidden" id="pause-overlay"><span>${icon("pause")}</span><h2>Paused</h2><button class="primary-button" id="resume-button">Resume ${icon("play")}</button></div>
          <div class="gameover-overlay hidden" id="gameover-overlay"><span>${icon("heart")}</span><h2>Reef lost</h2><p id="gameover-message">Let’s bring this little world back to life.</p><button class="primary-button" id="restart-button">Build a new reef ${icon("reset")}</button></div>
        </div>
        <div class="tank-toolbar"><div class="action-buttons"><button class="action-button feed-button" id="feed-button">${icon("food")}<span>Feed <small>6 <span class="mini-pearl"></span></small></span><kbd>F</kbd></button><button class="action-button defend-button" id="shoot-button">${icon("crosshair")}<span>Shoot</span><kbd>SPACE</kbd></button></div><div class="toolbar-right"><span class="movement-hint"><span class="key-cluster"><kbd>W</kbd><span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></span></span><button class="pause-button" id="pause-button" aria-label="Pause game" title="Pause game (P)">${icon("pause")}</button></div></div>
        <div class="aquarium-footer"><span><kbd>Q</kbd><kbd>E</kbd> Depth <kbd>SHIFT</kbd> Boost</span><button id="challenge-button">${icon("shield")} Invite intruder ${icon("arrow")}</button></div>
      </section>
      <aside class="sidebar">
        <section class="reef-stats"><div class="stat-item"><span class="stat-symbol fish-symbol">${icon("fish")}</span><div><strong id="fish-count">4<span> / 14</span></strong></div></div><span class="stats-divider"></span><div class="stat-item"><span class="stat-symbol happy-symbol">${icon("heart")}</span><div><strong id="happiness">65<span>%</span></strong></div></div></section>
        <section class="shop"><div class="shop-heading"><div><h2>Fish market<span>↗</span></h2></div></div><div class="shop-tabs" role="tablist" aria-label="Market categories"><button id="fish-tab" class="shop-tab active" role="tab" aria-selected="true">${icon("fish")} Fish</button><button id="upgrade-tab" class="shop-tab" role="tab" aria-selected="false">${icon("sub")} Upgrades</button></div><div class="shop-items" id="shop-items"></div></section>
        <section class="mission-card"><div class="mission-top"><span class="mission-icon">${icon("star")}</span><span class="overline">NEXT GOAL</span><span class="mission-reward" id="mission-reward">+40 <span class="mini-pearl"></span></span></div><h3 id="mission-name">Dinner is served</h3><div class="mission-description"><span id="mission-description">Feed your fish 8 meals</span><strong id="mission-progress">0 / 8</strong></div><div class="mission-track"><i id="mission-fill"></i></div></section>
      </aside>
    </div>
    <footer class="page-footer"><span class="save-state" id="save-state">${icon("check")} Saved locally</span><button id="reset-button">New game ${icon("reset")}</button></footer>
  </main>
  <div class="toast-stack" id="toasts" aria-live="polite"></div>
  <dialog id="info-dialog"><div class="dialog-header"><span class="eyebrow">LITTLE DEPTHS · FIELD NOTES</span><button class="icon-button" id="close-dialog" aria-label="Close dialog">${icon("close")}</button></div><div id="dialog-content"></div></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id)! as T;
let game = new AquariumSimulation();
let storageAvailable = true;
try {
  const saved = localStorage.getItem("little-depths-v1");
  if (saved) game.restore(JSON.parse(saved));
} catch {
  storageAvailable = false;
}
if (!storageAvailable)
  $("save-state").textContent = "Playing without local saves";

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
} catch {
  $("world").innerHTML =
    '<div class="webgl-error"><h2>This reef needs WebGL.</h2><p>Enable hardware acceleration in your browser and reload to dive in.</p></div>';
  throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const thumbnails = Object.fromEntries(
  (Object.keys(SPECIES) as Species[]).map((s) => [
    s,
    fishThumbnail(s, renderer),
  ]),
) as Record<Species, string>;
renderer.setClearColor("#173f42", 1);
$("world").appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2("#1f5555", 0.011);
const camera = new THREE.PerspectiveCamera(65, 1, 0.08, 160);
const pilot = new SubmarinePilot(game.heading);
let cameraMode: CameraMode = "chase";
const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
let cameraSnap = true;
scene.add(new THREE.HemisphereLight("#c7f8e4", "#476c65", 1.4));
const sun = new THREE.DirectionalLight("#fff1d1", 2.3);
sun.position.set(-8, 25, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -22,
  right: 22,
  top: 18,
  bottom: -18,
  near: 1,
  far: 65,
});
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.035;
scene.add(sun);
const fill = new THREE.DirectionalLight("#90d5db", 1.1);
fill.position.set(8, 14, -10);
scene.add(fill);
const habitat = makeHabitat(scene);
const subMesh = makeSubmarine();
scene.add(subMesh);
const fishMeshes = new Map<number, THREE.Group>();
const enemyMeshes = new Map<number, THREE.Group>();
const foodMeshes = new Map<number, THREE.Mesh>();
const bulletMeshes = new Map<number, THREE.Group>();
const glowMaterial = new THREE.MeshBasicMaterial({ color: "#d8ffe4" });
const foodGeom = new THREE.IcosahedronGeometry(0.12, 1);
const bubbleGeometry = new THREE.SphereGeometry(0.065, 8, 6);
const bubbleMaterial = new THREE.MeshPhysicalMaterial({
  color: "#c4f8ee",
  transparent: true,
  opacity: 0.27,
  roughness: 0.12,
  metalness: 0.2,
});
const bubbles = Array.from({ length: 65 }, (_, i) => {
  const mesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
  mesh.position.set(
    i % 2 ? -11.5 + Math.random() : 11.4 + Math.random() * 0.4,
    Math.random() * 13,
    -3 + Math.random() * 2,
  );
  mesh.scale.setScalar(0.5 + Math.random() * 1.1);
  scene.add(mesh);
  return mesh;
});
const dustPositions = new Float32Array(120 * 3);
for (let i = 0; i < dustPositions.length; i += 3) {
  dustPositions[i] = (Math.random() - 0.5) * 27;
  dustPositions[i + 1] = Math.random() * 13;
  dustPositions[i + 2] = (Math.random() - 0.5) * 13;
}
const dustGeom = new THREE.BufferGeometry();
dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(
  dustGeom,
  new THREE.PointsMaterial({
    color: "#d7efe0",
    size: 0.065,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  }),
);
scene.add(dust);
const particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] =
  [];

const world = $("world");
function resize() {
  const rect = world.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height);
  camera.aspect = rect.width / rect.height;
  camera.fov =
    cameraMode === "cockpit"
      ? camera.aspect < 1.1
        ? 82
        : 74
      : camera.aspect < 1.1
        ? 76
        : 65;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(world);
resize();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function worldPoint(event: PointerEvent): Vec | undefined {
  const rect = world.getBoundingClientRect();
  pointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    (-(event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const point = raycaster.ray.at(
    cameraMode === "cockpit" ? 5 : 11,
    new THREE.Vector3(),
  );
  return { x: point.x, y: point.y, z: point.z };
}
let heldPointer = false;
let pointerX = 0,
  pointerY = 0;
world.addEventListener("pointerdown", (event) => {
  world.focus();
  if (game.paused || game.gameOver || event.button !== 0) return;
  if (event.shiftKey) {
    const point = worldPoint(event);
    if (point && game.feed(point)) {
      begin();
      sound("feed");
    }
  } else {
    heldPointer = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    world.setPointerCapture(event.pointerId);
    begin();
  }
});
world.addEventListener("pointermove", (event) => {
  if (!heldPointer || game.paused || game.gameOver) return;
  pilot.turn(
    (event.clientX - pointerX) * 0.005,
    -(event.clientY - pointerY) * 0.004,
  );
  pointerX = event.clientX;
  pointerY = event.clientY;
  game.heading = pilot.facing;
});
world.addEventListener("pointerup", () => {
  heldPointer = false;
});
world.addEventListener("pointercancel", () => {
  heldPointer = false;
});
world.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  fire();
});
const keys = new Set<string>();
let fireHeld = false;
window.addEventListener("keydown", (e) => {
  if (
    ($("info-dialog") as HTMLDialogElement).open ||
    ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
  )
    return;
  const key = e.key.toLowerCase();
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "q",
      "e",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      " ",
      "f",
      "p",
      "c",
      "shift",
    ].includes(key)
  )
    e.preventDefault();
  keys.add(key);
  if (e.repeat) return;
  if (key === "f") feed();
  if (key === " ") {
    fireHeld = true;
    fire();
  }
  if (key === "p") togglePause();
  if (key === "c") toggleCamera();
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
  if (e.key === " ") fireHeld = false;
});
window.addEventListener("blur", () => {
  keys.clear();
  fireHeld = false;
  heldPointer = false;
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.active && !game.paused && !game.gameOver)
    togglePause();
});
function begin() {
  game.active = true;
  $("tutorial-note").classList.add("hidden");
}
function feed() {
  const facing = pilot.facing;
  const at = {
    x: game.submarine.x + facing.x * 4,
    y: game.submarine.y + facing.y * 4 + 1.2,
    z: game.submarine.z + facing.z * 4,
  };
  if (game.feed(at)) {
    begin();
    sound("feed");
    $("feed-button").classList.add("pressed");
    setTimeout(() => $("feed-button").classList.remove("pressed"), 180);
  } else if (game.paused) toast("Resume your aquarium to drop food.", "clock");
  else if (game.coins < 6)
    toast("Your next supply delivery will bring more pearls.", "pearl");
}
function fire() {
  if (game.shoot()) {
    // Assisted shots must not yank the pilot's viewpoint toward the target.
    game.heading = pilot.facing;
    begin();
    sound("shoot");
  }
}
$("feed-button").addEventListener("click", feed);
$("shoot-button").addEventListener("click", fire);
$("dismiss-tip").addEventListener("click", () =>
  $("tutorial-note").classList.add("hidden"),
);
function togglePause() {
  if (game.gameOver) return;
  game.paused = !game.paused;
  keys.clear();
  fireHeld = false;
  heldPointer = false;
  $("pause-overlay").classList.toggle("hidden", !game.paused);
  $("pause-button").innerHTML = icon(game.paused ? "play" : "pause");
  $("pause-button").setAttribute(
    "aria-label",
    game.paused ? "Resume game" : "Pause game",
  );
  save();
}
$("pause-button").addEventListener("click", togglePause);
$("resume-button").addEventListener("click", togglePause);
function toggleCamera() {
  cameraMode = cameraMode === "chase" ? "cockpit" : "chase";
  cameraSnap = true;
  subMesh.visible = cameraMode === "chase";
  $("tank-stage").classList.toggle("cockpit", cameraMode === "cockpit");
  $("camera-button").innerHTML =
    `${icon("camera")}<span>${cameraMode === "chase" ? "Chase" : "Cockpit"}</span>`;
  $("camera-button").setAttribute(
    "aria-label",
    `Switch to ${cameraMode === "chase" ? "cockpit" : "chase"} view`,
  );
  $("camera-button").title =
    `Switch to ${cameraMode === "chase" ? "cockpit" : "chase"} view (C)`;
  resize();
}
$("camera-button").addEventListener("click", toggleCamera);
$("fullscreen-button").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector(".aquarium")!.requestFullscreen();
  } catch {
    toast(
      "Fullscreen is unavailable in this preview. Try opening the game in a browser.",
      "expand",
    );
  }
});
$("challenge-button").addEventListener("click", () => {
  if (game.paused) {
    toast("Resume your aquarium first.", "clock");
    return;
  }
  if (game.summonWave()) begin();
  else toast("An intruder is already in the reef!", "shield");
});

let muted = true;
let audioCtx: AudioContext | undefined;
function sound(type: string) {
  if (muted) return;
  try {
    audioCtx ||= new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const notes =
      type === "shoot"
        ? [220, 90]
        : type === "feed"
          ? [350, 460]
          : type === "wave"
            ? [160, 120, 160]
            : [600, 790, 1000];
    notes.forEach((hz, i) => {
      const oscillator = audioCtx!.createOscillator(),
        gain = audioCtx!.createGain(),
        start = audioCtx!.currentTime + i * 0.065;
      oscillator.type = type === "shoot" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(hz, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        hz * 0.75,
        start + 0.13,
      );
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.055, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.connect(gain);
      gain.connect(audioCtx!.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.22);
    });
  } catch {
    muted = true;
  }
}
$("sound-button").addEventListener("click", () => {
  muted = !muted;
  $("sound-button").innerHTML = icon(muted ? "mute" : "sound");
  $("sound-button").setAttribute(
    "aria-label",
    muted ? "Enable sound" : "Mute sound",
  );
  $("sound-button").title = muted ? "Enable sound" : "Mute sound";
  if (!muted) sound("coin");
});

let shopTab: "fish" | "upgrades" = "fish";
function renderShop() {
  $("shop-items").innerHTML =
    shopTab === "fish"
      ? (Object.entries(SPECIES) as [Species, (typeof SPECIES)[Species]][])
          .map(
            ([s, data]) =>
              `<article class="fish-card" style="--fish-color:${data.color}"><div class="fish-portrait"><img src="${thumbnails[s]}" alt="Custom 3D ${data.name}" /><span class="portrait-dot"></span></div><div class="fish-info"><h3>${data.name}</h3></div><button class="buy-button" data-buy="${s}" aria-label="Buy ${data.name} for ${data.price} pearls"><span class="mini-pearl"></span>${data.price}</button></article>`,
          )
          .join("")
      : [
          {
            id: "cannon",
            name: "Sharper harpoons",
            description: "+1 damage per shot",
            icon: "crosshair",
            color: "#f2b593",
          },
          {
            id: "hull",
            name: "A tougher shell",
            description: "+40 hull · fully repairs",
            icon: "shield",
            color: "#a9d2c3",
          },
          {
            id: "feeder",
            name: "Generous portions",
            description: "+2 bites per food drop",
            icon: "food",
            color: "#d8cd97",
          },
        ]
          .map((u) => {
            const type = u.id as keyof typeof game.upgrades;
            return `<article class="fish-card upgrade-card" style="--fish-color:${u.color}"><div class="upgrade-portrait">${icon(u.icon)}</div><div class="fish-info"><span class="fish-label">LEVEL ${game.upgrades[type]} / 3</span><h3>${u.name}</h3></div><button class="buy-button" data-upgrade="${u.id}" aria-label="Buy ${u.name}" title="${u.description}">${game.upgrades[type] >= 3 ? icon("check") : `<span class="mini-pearl"></span>${game.upgradePrice(type)}`}</button></article>`;
          })
          .join("");
  $("fish-tab").classList.toggle("active", shopTab === "fish");
  $("fish-tab").setAttribute("aria-selected", String(shopTab === "fish"));
  $("upgrade-tab").classList.toggle("active", shopTab === "upgrades");
  $("upgrade-tab").setAttribute(
    "aria-selected",
    String(shopTab === "upgrades"),
  );
  updateShopButtons();
}
function updateShopButtons() {
  document
    .querySelectorAll<HTMLButtonElement>("[data-buy]")
    .forEach((button) => {
      const s = button.dataset.buy as Species;
      button.disabled =
        game.gameOver ||
        game.coins < SPECIES[s].price ||
        game.fish.length >= game.capacity;
      button.title =
        game.fish.length >= game.capacity
          ? "Tank full. Level up to make more room."
          : game.coins < SPECIES[s].price
            ? "Earn more pearls by feeding your fish."
            : `Welcome a ${SPECIES[s].name.toLowerCase()}`;
    });
  document
    .querySelectorAll<HTMLButtonElement>("[data-upgrade]")
    .forEach((button) => {
      const u = button.dataset.upgrade as keyof typeof game.upgrades;
      button.disabled =
        game.gameOver ||
        game.coins < game.upgradePrice(u) ||
        game.upgrades[u] >= 3;
    });
}
$("fish-tab").addEventListener("click", () => {
  shopTab = "fish";
  renderShop();
});
$("upgrade-tab").addEventListener("click", () => {
  shopTab = "upgrades";
  renderShop();
});
$("shop-items").addEventListener("click", (event) => {
  const btn = (event.target as Element).closest<HTMLButtonElement>("button");
  if (!btn || btn.disabled) return;
  if (btn.dataset.buy) {
    if (game.buyFish(btn.dataset.buy as Species)) {
      sound("coin");
      save();
    }
  } else if (btn.dataset.upgrade) {
    if (game.upgrade(btn.dataset.upgrade as keyof typeof game.upgrades)) {
      sound("coin");
      renderShop();
      save();
    }
  }
  updateHud();
});
renderShop();

let wasPaused = false;
let dialogGame: AquariumSimulation | undefined;
const dialog = $("info-dialog") as HTMLDialogElement;
function openDialog(content: string) {
  dialogGame = game;
  wasPaused = game.paused;
  game.paused = true;
  keys.clear();
  fireHeld = false;
  $("dialog-content").innerHTML = content;
  dialog.showModal();
}
dialog.addEventListener("close", () => {
  if (game === dialogGame) game.paused = wasPaused;
});
$("close-dialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  }
});
function showHelp() {
  openDialog(
    `<h2>Controls</h2><div class="control-list">${[
      ["sub", "Move", "<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>"],
      ["wave", "Change depth", "<kbd>Q</kbd><kbd>E</kbd>"],
      ["camera", "Look around", "Drag / ← →"],
      ["camera", "Chase / cockpit", "<kbd>C</kbd>"],
      ["arrow", "Boost", "<kbd>SHIFT</kbd>"],
      ["food", "Feed", "<kbd>F</kbd>"],
      ["crosshair", "Shoot · auto aim", "<kbd>SPACE</kbd>"],
      ["pause", "Pause", "<kbd>P</kbd>"],
      ["food", "Feed a spot", "Shift + click"],
    ]
      .map(
        ([symbol, label, keys]) =>
          `<div>${icon(symbol)}<span>${label}</span><strong>${keys}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="dialog-note">${icon("heart")} Feed fish to grow. Fed adult pairs make babies.</div>`,
  );
}
$("help-button").addEventListener("click", showHelp);
$("guide-nav").addEventListener("click", () =>
  openDialog(
    `<h2>Field guide</h2><div class="field-guide">${(Object.entries(SPECIES) as [Species, (typeof SPECIES)[Species]][]).map(([s, data]) => `<article style="--fish-color:${data.color}"><img src="${thumbnails[s]}" alt="${data.name}"/><div><h3>${data.name}</h3><span class="guide-income">${icon("pearl")} ${data.income} pearls / meal</span></div></article>`).join("")}</div>`,
  ),
);
$("aquarium-nav").addEventListener("click", () => {
  if (dialog.open) dialog.close();
  world.focus();
});
function reset() {
  game = new AquariumSimulation();
  pilot.reset(game.heading);
  cameraSnap = true;
  heldPointer = false;
  keys.clear();
  fireHeld = false;
  $("pause-overlay").classList.add("hidden");
  $("gameover-overlay").classList.add("hidden");
  $("tutorial-note").classList.remove("hidden");
  $("pause-button").innerHTML = icon("pause");
  $("pause-button").setAttribute("aria-label", "Pause game");
  renderShop();
  updateHud();
  save();
  toast("A fresh little ocean. Welcome back, captain.", "sub");
}
$("restart-button").addEventListener("click", reset);
$("reset-button").addEventListener("click", () => {
  openDialog(
    `<h2>A fresh little ocean?</h2><p class="dialog-lead">Start again with four fish and 180 pearls. This replaces your saved reef on this device.</p><div class="reset-actions"><button class="secondary-button" id="cancel-reset">Keep my reef</button><button class="primary-button" id="confirm-reset">Start fresh ${icon("reset")}</button></div>`,
  );
  $("cancel-reset").addEventListener("click", () => dialog.close());
  $("confirm-reset").addEventListener("click", () => {
    dialog.close();
    reset();
  });
});
function save() {
  if (game.gameOver) return;
  try {
    localStorage.setItem("little-depths-v1", JSON.stringify(game.snapshot()));
  } catch {
    storageAvailable = false;
    $("save-state").textContent = "Playing without local saves";
  }
}
setInterval(save, 5000);
window.addEventListener("beforeunload", save);

function toast(message: string, symbol = "star") {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `${icon(symbol)}<span></span>`;
  el.querySelector("span")!.textContent = message;
  $("toasts").appendChild(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 300);
  }, 4200);
  if ($("toasts").children.length > 4) $("toasts").firstElementChild?.remove();
}
const floats: { el: HTMLElement; pos: THREE.Vector3; life: number }[] = [];
function floatingText(text: string, pos: Vec, special = false) {
  const el = document.createElement("span");
  el.className = `floating-text${special ? " special" : ""}`;
  el.textContent = text;
  $("floating-labels").appendChild(el);
  floats.push({
    el,
    pos: new THREE.Vector3(pos.x, pos.y + 0.8, pos.z),
    life: 1.8,
  });
}
function burst(pos: Vec, color: string, n = 12) {
  for (let i = 0; i < n; i++) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.07, 0),
      new THREE.MeshBasicMaterial({ color }),
    );
    mesh.position.set(pos.x, pos.y, pos.z);
    scene.add(mesh);
    particles.push({
      mesh,
      life: 1,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2,
        (Math.random() - 0.5) * 3,
      ),
    });
  }
}
function consumeEvents() {
  for (const event of game.events.splice(0)) {
    if (
      event.pos &&
      ["meal", "coin", "growth", "birth", "kill"].includes(event.type)
    )
      floatingText(
        event.type === "meal" || event.type === "coin"
          ? `✧ ${event.amount}`
          : event.type === "birth"
            ? "♡ new baby!"
            : event.type === "growth"
              ? "✧ grown up!"
              : "+45 pearls",
        event.pos,
        event.type !== "meal" && event.type !== "coin",
      );
    if (event.pos && ["meal", "birth", "kill", "hit"].includes(event.type))
      burst(
        event.pos,
        event.type === "hit"
          ? "#f5a19b"
          : event.type === "birth"
            ? "#f2b5c5"
            : "#cce9a9",
        event.type === "kill" ? 25 : 7,
      );
    if (
      !["meal", "coin", "hit"].includes(event.type) ||
      (event.type === "coin" && !event.pos)
    )
      toast(
        event.text,
        event.type === "wave"
          ? "shield"
          : event.type === "birth"
            ? "heart"
            : event.type === "purchase"
              ? "fish"
              : event.type === "loss"
                ? "shield"
                : "star",
      );
    if (["birth", "kill", "mission", "growth", "level"].includes(event.type))
      sound("coin");
    if (event.type === "wave") sound("wave");
  }
}
function updateHud() {
  $("pearl-count").textContent = String(game.coins);
  $("keeper-level").textContent = `Level ${game.level}`;
  $("xp-fill").style.width = `${((game.xp % 160) / 160) * 100}%`;
  $("fish-count").innerHTML =
    `${game.fish.length}<span> / ${game.capacity}</span>`;
  $("happiness").innerHTML = `${game.happiness}<span>%</span>`;
  $("hull-fill").style.width = `${(game.health / game.maxHealth) * 100}%`;
  $("hull-fill").classList.toggle("low", game.health < game.maxHealth * 0.35);
  $("tank-stage").style.setProperty(
    "--depth-angle",
    `${-110 + ((game.submarine.y - 2) / 9.5) * 220}deg`,
  );
  $("tank-stage").style.setProperty(
    "--hull-angle",
    `${-110 + (game.health / game.maxHealth) * 220}deg`,
  );
  $("tank-stage").style.setProperty(
    "--speed-angle",
    `${keys.has("w") || keys.has("s") || keys.has("a") || keys.has("d") ? (keys.has("shift") ? 90 : 15) : -100}deg`,
  );
  $("hull-value").textContent =
    `${Math.round((game.health / game.maxHealth) * 100)}%`;
  const danger = game.enemies.length > 0;
  $("tank-status").innerHTML = `<i></i> ${danger ? "Intruder alert" : "Calm"}`;
  $("tank-status").classList.toggle("danger", danger);
  $("wave-warning").classList.toggle("hidden", !danger);
  const m = MISSIONS[game.mission];
  $("mission-name").textContent = m?.description || "All goals complete";
  $("mission-description").textContent = "";
  $("mission-reward").innerHTML = m
    ? `+${m.reward} <span class="mini-pearl"></span>`
    : icon("check");
  $("mission-progress").textContent = m
    ? `${game.missionProgress} / ${m.target}`
    : "✓";
  $("mission-fill").style.width =
    `${m ? (game.missionProgress / m.target) * 100 : 100}%`;
  $("feed-button").title = `6 pearls for ${5 + game.upgrades.feeder * 2} bites`;
  $("feed-button").toggleAttribute("disabled", game.gameOver);
  $("shoot-button").toggleAttribute("disabled", game.gameOver);
  if (game.gameOver) {
    $("gameover-overlay").classList.remove("hidden");
    $("gameover-message").textContent =
      game.health <= 0
        ? "Bumble took a few too many hits. A new adventure is waiting."
        : "The intruders got your fish. Let’s rebuild and keep them safe.";
  }
  updateShopButtons();
}

function removeMissing<T extends THREE.Object3D>(
  map: Map<number, T>,
  ids: Set<number>,
) {
  for (const [id, object] of map)
    if (!ids.has(id)) {
      scene.remove(object);
      if (object instanceof THREE.Group)
        disposeModel(object, new Set([glowMaterial]));
      map.delete(id);
    }
}
const forward = new THREE.Vector3(1, 0, 0);
const quat = new THREE.Quaternion();
function orient(obj: THREE.Object3D, dir: Vec, dt: number) {
  const vector = new THREE.Vector3(dir.x, dir.y * 0.45, dir.z);
  if (vector.length() < 0.01) return;
  vector.normalize();
  quat.setFromUnitVectors(forward, vector);
  obj.quaternion.slerp(quat, Math.min(1, dt * 4));
}
let previous = performance.now(),
  elapsed = 0,
  hudAt = 0;
function animate(now: number) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  const visualDt = game.paused ? 0 : dt;
  elapsed += visualDt;
  if (!game.paused && !game.gameOver) {
    const turn =
      (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0);
    if (turn) {
      pilot.turn(turn * dt * 1.6);
      begin();
    }
    const movement = pilot.movement(
      (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0),
      (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
      (keys.has("e") ? 1 : 0) - (keys.has("q") ? 1 : 0),
    );
    if (movement.x || movement.y || movement.z) {
      begin();
      game.move(movement, dt, keys.has("shift"));
    }
    game.heading = pilot.facing;
    if (fireHeld) fire();
    game.update(dt);
  }
  consumeEvents();
  for (const f of game.fish) {
    let mesh = fishMeshes.get(f.id);
    if (!mesh) {
      mesh = makeFish(f.species);
      fishMeshes.set(f.id, mesh);
      scene.add(mesh);
    }
    mesh.position.set(
      f.pos.x,
      f.pos.y + Math.sin(elapsed * 1.8 + f.phase) * 0.06,
      f.pos.z,
    );
    if (!game.active)
      mesh.position.x += Math.sin(elapsed * 0.32 + f.phase) * 0.55;
    mesh.scale.setScalar(f.growth * 1.08);
    orient(mesh, f.dir, visualDt);
    (mesh.userData.tail as THREE.Group).rotation.y =
      Math.sin(elapsed * (game.food.length ? 11 : 6) + f.phase) * 0.25;
  }
  removeMissing(fishMeshes, new Set(game.fish.map((f) => f.id)));
  for (const e of game.enemies) {
    let mesh = enemyMeshes.get(e.id);
    if (!mesh) {
      mesh = makeEnemy();
      enemyMeshes.set(e.id, mesh);
      scene.add(mesh);
    }
    const old = mesh.position.clone();
    mesh.position.set(e.pos.x, e.pos.y, e.pos.z);
    if (old.length() > 0)
      orient(
        mesh,
        direction({ x: old.x, y: old.y, z: old.z }, e.pos),
        visualDt,
      );
    (mesh.userData.tail as THREE.Group).rotation.y =
      Math.sin(elapsed * 8 + e.phase) * 0.26;
  }
  removeMissing(enemyMeshes, new Set(game.enemies.map((e) => e.id)));
  for (const f of game.food) {
    let mesh = foodMeshes.get(f.id);
    if (!mesh) {
      mesh = new THREE.Mesh(foodGeom, material("#d69962"));
      mesh.castShadow = true;
      foodMeshes.set(f.id, mesh);
      scene.add(mesh);
    }
    mesh.position.set(
      f.pos.x + Math.sin(elapsed * 2 + f.id) * 0.05,
      f.pos.y,
      f.pos.z,
    );
    mesh.rotation.x += visualDt;
    mesh.rotation.y += visualDt * 2;
  }
  removeMissing(foodMeshes, new Set(game.food.map((f) => f.id)));
  for (const b of game.bullets) {
    let mesh = bulletMeshes.get(b.id);
    if (!mesh) {
      mesh = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.65, 6),
        glowMaterial,
      );
      shaft.rotation.z = Math.PI / 2;
      mesh.add(shaft);
      const point = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.28, 5),
        material("#d9dbb5", 0.2, 0.7),
      );
      point.rotation.z = -Math.PI / 2;
      point.position.x = 0.35;
      mesh.add(point);
      const light = new THREE.PointLight("#b8ffdd", 1, 2);
      mesh.add(light);
      bulletMeshes.set(b.id, mesh);
      scene.add(mesh);
    }
    mesh.position.set(b.pos.x, b.pos.y, b.pos.z);
    quat.setFromUnitVectors(
      forward,
      new THREE.Vector3(b.velocity.x, b.velocity.y, b.velocity.z).normalize(),
    );
    mesh.quaternion.copy(quat);
  }
  removeMissing(bulletMeshes, new Set(game.bullets.map((b) => b.id)));
  subMesh.position.set(
    game.submarine.x,
    game.submarine.y + Math.sin(elapsed * 1.4) * 0.085,
    game.submarine.z,
  );
  const facing = pilot.facing;
  const right = new THREE.Vector3(-facing.z, 0, facing.x).normalize();
  const up = right
    .clone()
    .cross(new THREE.Vector3(facing.x, facing.y, facing.z))
    .normalize();
  quat.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(
      new THREE.Vector3(facing.x, facing.y, facing.z),
      up,
      right,
    ),
  );
  subMesh.quaternion.slerp(quat, Math.min(1, visualDt * 8));
  (subMesh.userData.propeller as THREE.Group).rotation.x +=
    visualDt * (game.active ? 15 : 4);
  habitat.caustics.uniforms.time.value = elapsed;
  habitat.plants.forEach((p) => {
    p.rotation.z = Math.sin(elapsed * 0.65 + p.userData.sway) * 0.033;
    p.rotation.x = Math.sin(elapsed * 0.5 + p.userData.sway) * 0.02;
  });
  bubbles.forEach((b) => {
    b.position.y += visualDt * 0.7;
    b.position.x += Math.sin(elapsed * 2 + b.id) * visualDt * 0.035;
    if (b.position.y > 13.4) b.position.y = 0.8;
  });
  dust.rotation.y = Math.sin(elapsed * 0.025) * 0.03;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= visualDt;
    p.mesh.position.addScaledVector(p.velocity, visualDt);
    p.mesh.scale.setScalar(Math.max(0, p.life));
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      particles.splice(i, 1);
    }
  }
  const pose = cameraPose(
    { x: subMesh.position.x, y: subMesh.position.y, z: subMesh.position.z },
    pilot.facing,
    cameraMode,
  );
  desiredCamera.set(pose.position.x, pose.position.y, pose.position.z);
  if (cameraSnap || cameraMode === "cockpit") {
    camera.position.copy(desiredCamera);
    cameraTarget.set(pose.target.x, pose.target.y, pose.target.z);
    cameraSnap = false;
  } else {
    const smooth = 1 - Math.exp(-visualDt * 9);
    camera.position.lerp(desiredCamera, smooth);
    cameraTarget.lerp(
      new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z),
      smooth,
    );
  }
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld();
  const rect = world.getBoundingClientRect();
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.life -= visualDt;
    const p = f.pos.clone();
    p.y += (1.8 - f.life) * 0.65;
    p.project(camera);
    f.el.style.left = `${(p.x * 0.5 + 0.5) * rect.width}px`;
    f.el.style.top = `${(-p.y * 0.5 + 0.5) * rect.height}px`;
    const visible =
      camera
        .getWorldDirection(new THREE.Vector3())
        .dot(f.pos.clone().sub(camera.position)) > 0 &&
      Math.abs(p.x) < 1 &&
      Math.abs(p.y) < 1;
    f.el.style.opacity = visible ? String(Math.min(1, f.life * 2)) : "0";
    if (f.life <= 0) {
      f.el.remove();
      floats.splice(i, 1);
    }
  }
  renderer.render(scene, camera);
  if (now - hudAt > 150) {
    updateHud();
    hudAt = now;
  }
}
updateHud();
requestAnimationFrame(animate);

// Read-only diagnostics let browser verification inspect the running simulation.
Object.defineProperty(window, "__reef", {
  get: () => ({
    active: game.active,
    paused: game.paused,
    coins: game.coins,
    health: game.health,
    fish: game.fish.map((f) => ({
      id: f.id,
      species: f.species,
      pos: { ...f.pos },
      growth: f.growth,
      meals: f.meals,
    })),
    food: game.food.length,
    enemies: game.enemies.map((e) => ({ pos: { ...e.pos }, health: e.health })),
    stats: { ...game.stats },
    wave: game.wave,
    time: game.time,
    mission: game.mission,
    upgrades: { ...game.upgrades },
    submarine: { ...game.submarine },
    heading: { ...game.heading },
    bullets: game.bullets.length,
    camera: {
      mode: cameraMode,
      position: camera.position.toArray(),
      target: cameraTarget.toArray(),
      fov: camera.fov,
      submarineVisible: subMesh.visible,
    },
    render: {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
    },
  }),
});

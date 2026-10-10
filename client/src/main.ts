import {
  AmbientLight,
  DirectionalLight,
  GridHelper,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
  type Group,
  type Object3D,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { parseCity, type PlaceSize } from "./city.js";
import {
  bumpDurationMs,
  bumpedScale,
  chosenPlace,
  createCity,
  placeColors,
  placeName,
} from "./city-scene.js";
import {
  chooseRecord,
  describeRecord,
  describeZones,
  districtName,
  formatDuration,
  parseRecord,
  parseZones,
  type RecordView,
} from "./record.js";

const mount = document.querySelector("#city");
const status = document.querySelector("#status");
const legend = document.querySelector("#legend");
const record = document.querySelector("#record");
const recordTitle = document.querySelector("#record-title");
const recordPlace = document.querySelector("#record-place");
const recordSummary = document.querySelector("#record-summary");
const recordEmpty = document.querySelector("#record-empty");
const recordSessions = document.querySelector("#record-sessions");

if (
  !(mount instanceof HTMLElement) ||
  !(status instanceof HTMLElement) ||
  !(legend instanceof HTMLElement) ||
  !(record instanceof HTMLElement) ||
  !(recordTitle instanceof HTMLButtonElement) ||
  !(recordPlace instanceof HTMLElement) ||
  !(recordSummary instanceof HTMLElement) ||
  !(recordEmpty instanceof HTMLElement) ||
  !(recordSessions instanceof HTMLOListElement)
) {
  throw new Error("The city page is missing its layout");
}

const scene = new Scene();
const camera = new PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(10, 7, 14);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.domElement.setAttribute("aria-label", "City");
renderer.domElement.tabIndex = 0;
mount.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.5, 0);

scene.add(new AmbientLight("#f2efe6", 0.7));
const sun = new DirectionalLight("#fff6e8", 1.4);
sun.position.set(6, 10, 4);
scene.add(sun);
scene.add(new GridHelper(24, 24, "#2a3140", "#1c2230"));

const raycaster = new Raycaster();
const pointer = new Vector2();
let places: PlaceSize[] = [];
let city: Group | undefined;
let pointerDown: { x: number; y: number } | undefined;
let bump: { mesh: Mesh; startedAt: number; size: number } | undefined;
let recordRequest = 0;

resize();
window.addEventListener("resize", resize);
renderer.domElement.addEventListener("pointerdown", (event) => {
  pointerDown = { x: event.clientX, y: event.clientY };
});
renderer.domElement.addEventListener("pointerup", (event) => {
  const down = pointerDown;
  pointerDown = undefined;
  if (down === undefined || city === undefined) {
    return;
  }
  const movement = Math.hypot(event.clientX - down.x, event.clientY - down.y);
  const place = chosenPlace(movement, objectAt(event, city));
  if (place !== undefined) {
    openPlace(place);
  }
});
recordTitle.addEventListener("click", () => {
  const district = recordTitle.dataset["district"];
  if (district === "swim" || district === "bike" || district === "run" || district === "strength") {
    showRecord(chooseRecord(places, district));
  }
});

try {
  const response = await fetch("/city");
  if (!response.ok) {
    throw new Error(await response.text());
  }
  places = parseCity(await response.json());
  city = createCity(places);
  scene.add(city);
  fillLegend(legend);
  status.hidden = true;
} catch (error) {
  status.textContent = error instanceof Error ? error.message : "The city could not be drawn";
}

renderer.setAnimationLoop((now) => {
  if (bump !== undefined) {
    const elapsed = now - bump.startedAt;
    bump.mesh.scale.setScalar(bumpedScale(bump.size, elapsed));
    if (elapsed >= bumpDurationMs) {
      bump = undefined;
    }
  }
  controls.update();
  renderer.render(scene, camera);
});

function openPlace(place: PlaceSize["place"]): void {
  const entry = places.find((candidate) => candidate.place === place);
  const mesh = city?.getObjectByName(place);
  if (entry === undefined || !(mesh instanceof Mesh)) {
    return;
  }
  if (bump !== undefined) {
    bump.mesh.scale.setScalar(bump.size);
  }
  bump = { mesh, startedAt: performance.now(), size: entry.size };
  showRecord(chooseRecord(places, place));
}

function showRecord(view: RecordView): void {
  if (
    !(record instanceof HTMLElement) ||
    !(recordTitle instanceof HTMLButtonElement) ||
    !(recordPlace instanceof HTMLElement) ||
    !(recordSummary instanceof HTMLElement) ||
    !(recordEmpty instanceof HTMLElement) ||
    !(recordSessions instanceof HTMLOListElement)
  ) {
    return;
  }
  const request = recordRequest + 1;
  recordRequest = request;
  record.hidden = false;
  recordTitle.textContent = districtName(view.district);
  recordTitle.dataset["district"] = view.district;
  if (view.place === undefined) {
    recordPlace.hidden = true;
    recordPlace.textContent = "";
  } else {
    recordPlace.hidden = false;
    recordPlace.textContent = placeName(view.place);
  }
  recordSummary.hidden = false;
  recordSummary.replaceChildren(summaryLine("Reading the record…"));
  recordSessions.replaceChildren();
  recordEmpty.hidden = view.sessions.length > 0;
  for (const session of view.sessions) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const name = document.createElement("strong");
    name.textContent = session.name;
    const detail = document.createElement("span");
    detail.textContent = `${formatWhen(session.localStart)} · ${formatDuration(session.durationSeconds)} · ${formatDistance(session.distanceMeters)}`;
    const zones = document.createElement("span");
    zones.hidden = true;
    button.append(name, detail, zones);
    button.addEventListener("click", () => {
      void loadZones(button, zones, session.id);
    });
    item.append(button);
    recordSessions.append(item);
  }
  void loadHeader(view.district, request);
}

async function loadHeader(district: RecordView["district"], request: number): Promise<void> {
  if (!(recordSummary instanceof HTMLElement)) {
    return;
  }
  try {
    const response = await fetch(`/districts/${district}`);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    if (request !== recordRequest) {
      return;
    }
    const lines = describeRecord(district, parseRecord(await response.json()));
    recordSummary.replaceChildren(...lines.map(summaryLine));
  } catch (error) {
    if (request !== recordRequest || !(recordSummary instanceof HTMLElement)) {
      return;
    }
    const message = error instanceof Error ? error.message : "The record could not be read";
    recordSummary.replaceChildren(summaryLine(message));
  }
}

async function loadZones(button: HTMLButtonElement, zones: HTMLElement, id: string): Promise<void> {
  button.disabled = true;
  zones.hidden = false;
  zones.textContent = "Reading this session…";
  try {
    const response = await fetch(`/sessions/${encodeURIComponent(id)}/zones`);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    zones.textContent = describeZones(parseZones(await response.json()));
  } catch (error) {
    zones.textContent = error instanceof Error ? error.message : "This session could not be read";
  } finally {
    button.disabled = false;
  }
}

function summaryLine(text: string): HTMLParagraphElement {
  const line = document.createElement("p");
  line.textContent = text;
  return line;
}

function objectAt(event: PointerEvent, cityGroup: Group): Object3D | null {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(cityGroup, true)[0]?.object ?? null;
}

function resize(): void {
  const width = mount instanceof HTMLElement ? mount.clientWidth : 1;
  const height = mount instanceof HTMLElement ? mount.clientHeight : 1;
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function fillLegend(list: HTMLElement): void {
  for (const place of places) {
    const item = document.createElement("li");
    const swatch = document.createElement("i");
    swatch.style.background = placeColors[place.place];
    item.append(swatch, document.createTextNode(placeName(place.place)));
    list.append(item);
  }
}

function formatWhen(localStart: string): string {
  return localStart.slice(0, 16).replace("T", " ");
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

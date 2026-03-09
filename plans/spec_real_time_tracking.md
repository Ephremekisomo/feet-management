# Specification: Real-time Tracking & Driver Features

## Contexte
Projet: Gestion de parc automobile et suivi consommation carburant (local-first / prototype en localhost)
Objectif: Permettre aux chauffeurs d'envoyer leur position et incidents en temps réel, et permettre aux gestionnaires de suivre véhicules, consommation, et alertes en temps réel.

---

## Principales parties prenantes
- Admin: lecture seule, monitoring global.
- Manager: supervision, visualisation en temps réel, résolution d'alertes, rapports.
- Driver (chauffeur): application PWA (mobile browser) pour définir trajets, rapporter carburant/panne, partager GPS en temps réel.

---

## Use cases (user stories)
1. En tant que chauffeur, je veux démarrer/arrêter un trajet et envoyer ma position périodiquement afin que le gestionnaire puisse voir où je suis en temps réel.
2. En tant que chauffeur, je veux signaler le nombre de litres ajoutés et l'odometer afin que le système calcule consommation et coût.
3. En tant que chauffeur, je veux signaler une panne/incident (texte + photo) afin que le manager reçoive une alerte.
4. En tant que manager, je veux voir la position exacte des véhicules sur une carte, cliquer pour voir détails (statistiques, dernières positions, historique) et ouvrir Street View si disponible.
5. En tant que manager, je veux voir en temps réel les alertes (assurance, entretien, panne) et filtrer/attribuer/résoudre.
6. En tant qu'admin, je veux pouvoir observer l'état du système sans pouvoir modifier les données opérationnelles.

---

## Comportement temps réel
- Transport temps réel: WebSocket via `socket.io`.
- Événements principaux:
  - `location:update` — payload: { driver_id, vehicle_id, lat, lng, timestamp }
  - `trip:start` — payload: { trip_id, driver_id, vehicle_id, route (geojson or list), start_time }
  - `trip:end` — payload: { trip_id, end_time, end_odometer }
  - `fuel:added` — payload: { driver_id, vehicle_id, liters, cost_per_liter, total_cost, odometer, timestamp }
  - `incident:reported` — payload: { driver_id, vehicle_id, type, message, photo_url, timestamp }
  - `alert:created` — payload: { alert_id, type, level, vehicle_id, message }

- Le serveur émettra aux clients managers (sous permissions): `location:update`, `incident:reported`, `fuel:added`, `alert:created`.

---

## Cartographie / Street View
- Intégration front-end: Leaflet + OpenStreetMap par défaut (gratuit).
- Option Street View: bouton ouvrant Google Street View (si clé fournie). L'utilisation de Google est conditionnelle (clé API dans `.env`).

---

## Modifications DB (propositions)
- Table `vehicles`:
  - add `last_lat REAL`, `last_lng REAL`, `last_seen TEXT`, `current_status TEXT` -- stocker la dernière position et état.

- Table `trips`:
  - add `route TEXT` (GeoJSON string or JSON array), `status TEXT` (planned|ongoing|completed), `start_time TEXT`, `end_time TEXT`, `start_odometer INTEGER`, `end_odometer INTEGER`.

- Table `alerts`:
  - add `level TEXT`, `source TEXT`, `resolved_by INTEGER`, `resolved_at TEXT`.

- Table `fuel_entries`:
  - ensure `fuel_entries` has `driver_id` (if needed) and `timestamp`.

- Option: `positions` table (history) for full tracking:
  - `id, vehicle_id, driver_id, lat, lng, timestamp`

SQL snippets (example):

ALTER TABLE vehicles ADD COLUMN last_lat REAL;
ALTER TABLE vehicles ADD COLUMN last_lng REAL;
ALTER TABLE vehicles ADD COLUMN last_seen TEXT;
ALTER TABLE vehicles ADD COLUMN current_status TEXT;

ALTER TABLE trips ADD COLUMN route TEXT;
ALTER TABLE trips ADD COLUMN status TEXT;
ALTER TABLE trips ADD COLUMN start_time TEXT;
ALTER TABLE trips ADD COLUMN end_time TEXT;

ALTER TABLE alerts ADD COLUMN level TEXT;
ALTER TABLE alerts ADD COLUMN source TEXT;
ALTER TABLE alerts ADD COLUMN resolved_by INTEGER;
ALTER TABLE alerts ADD COLUMN resolved_at TEXT;

CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY,
  vehicle_id INTEGER,
  driver_id INTEGER,
  lat REAL,
  lng REAL,
  timestamp TEXT,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

---

## Backend API (new / extended endpoints)
- POST `/api/drivers/:id/location` — fallback/polling to save latest position (body: lat, lng, timestamp)
- GET `/api/vehicles/positions?vehicle_id=&since=` — query positions history
- POST `/api/trips` (start trip), PUT `/api/trips/:id/end` (end trip)
- POST `/api/fuel/from-driver` (driver reports fuel)
- POST `/api/incidents` (driver reports incident)
- GET `/api/alerts/unresolved`, POST `/api/alerts/:id/resolve`

Note: All sensitive endpoints must be protected by JWT and RBAC.

---

## Frontend (components & flows)
### Driver PWA (mobile)
- Views:
  - Login (existing)
  - Current Trip: Start/Stop, define route (search addresses or pick on map), start sending locations via Geolocation API using sockets (e.g., every 5-10s or distance-based)
  - Report Fuel: form (liters, cost per liter, odometer, submit)
  - Report Incident: form + photo upload
- Behavior: offline-friendly, retries for failed uploads, uses `navigator.geolocation.watchPosition`.

### Manager Dashboard (web)
- Live map panel showing vehicle markers (lat/lng), popup with quick stats, last_seen, fuel consumption, quick actions (open Street View if enabled)
- Alerts panel (live updates via socket)
- Reports panel: consumption per vehicle, trips, costs

---

## Scheduler & Alerts
- `node-cron` job runs daily (or configurable) to check:
  - insurance expiry within lead days → create alert
  - next service date or mileage threshold → create alert
- Cron should create DB alerts and emit `alert:created` via socket to connected managers.

---

## Security & RBAC
- JWT for auth. Tokens issued at login and stored in frontend (localStorage) and used in Authorization headers and socket auth.
- Middleware `authorize(role)` to protect endpoints.
- Admin role: read-only UI (hide edit controls), enforced server-side.

---

## Acceptance criteria / Tests
- Driver can start a trip and manager sees marker moving on map in <5s updates via socket.
- Driver submits fuel entry → appears in manager panel and chart updates after refresh or via socket.
- Driver reports incident → manager receives an alert and can mark it resolved.
- Alerts for insurance/maintenance are generated by scheduler and visible to manager.

---

## Implementation plan & next steps
1. Create DB migrations (add columns, create positions table).
2. Add endpoints for location/trip/fuel/incident.
3. Add `socket.io` to backend and emit/save events.
4. Implement driver PWA minimal prototype (send location and report fuel/incident).
5. Implement manager map + alerts subscription to socket events.
6. Add tests for endpoints & sockets in local environment.

---

## Notes / Options
- Street View requires Google API: keep conditional support.
- For privacy and storage concerns, option to only keep last position (cheap) vs store full `positions` history.


*Document created to support the next implementation steps. Modify if you want different data retention or frequency constraints.*

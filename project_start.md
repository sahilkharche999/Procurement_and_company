# Local Start — Copy/Paste Runbook

Verified on macOS (darwin 25.5.0), Node v26, Docker 29.5. Repo root:
`/Users/ashwingorle/Desktop/projects/Procurement_and_company`

- Frontend dev URL: **http://localhost:5173/editor/** (the `/editor/` suffix is required)
- Backend URL: **http://localhost:8000** · docs at `/docs` · health at `/health`

---

## 0. First-time setup (run once)

System Python is 3.9.6 and the backend **cannot** run on it (`db/mongo.py` uses
`AsyncIOMotorClient | None`, which is a `TypeError` on 3.9; `numpy==2.4.2` needs >= 3.11).
Homebrew's `python3.10` is also too old. The Docker image uses 3.11 — match it.

```bash
# Python 3.11 (skip if `ls /opt/homebrew/bin/python3.11` already exists)
brew install python@3.11

# Backend venv + deps (~2 GB download, mostly torch — takes a while)
cd /Users/ashwingorle/Desktop/projects/Procurement_and_company
/opt/homebrew/bin/python3.11 -m venv venv
./venv/bin/pip install -U pip
./venv/bin/pip install -r backend/requirements.txt

# Frontend deps
cd frontend && npm install && cd ..
```

Nothing to configure: `backend/.env` already holds `MONGO_URI`, `GEMINI_API_KEY` and the
AWS keys, and the YOLO weights (`backend/doclayout_yolo_docstructbench_imgsz1024.pt`, 40 MB)
are already committed. The SAM `.pth` that `SETUP.md` mentions is no longer used — skip it.

**Never create `frontend/.env`.** Vite reads env from `frontend/`, finds none, and
`src/config.js` falls back to `http://localhost:8000/` — correct for local. Copying the root
`.env` there sets `VITE_SERVER_URL=/editor-api` (a deploy-only value) and breaks every API call.

---

## 1. Daily start — two terminals

**Terminal 1 — backend**

```bash
cd /Users/ashwingorle/Desktop/projects/Procurement_and_company/backend && ../venv/bin/python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend**

```bash
cd /Users/ashwingorle/Desktop/projects/Procurement_and_company/frontend && npm run dev
```

**Then open:** http://localhost:5173/editor/

---

## 2. One-liner alternative (single terminal, backgrounded backend)

```bash
cd /Users/ashwingorle/Desktop/projects/Procurement_and_company && \
  (cd backend && ../venv/bin/python -m uvicorn main:app --reload --port 8000 &) && \
  sleep 4 && cd frontend && npm run dev
```

Stop the stray backend afterwards with:

```bash
lsof -ti:8000 | xargs kill
```

---

## 3. Verify it came up

```bash
curl -s http://localhost:8000/health
```

Expect `"status":"ok"` and `"yolo_ready":true`. The backend log should print
`[YOLO] ✅ Model loaded` and `[MongoDB] ✅ Connected to Atlas`.

If you see `[MongoDB] ⚠️  Could not connect`, your current IP is not allowlisted in
MongoDB Atlas — add it in the Atlas Network Access panel.

---

## 4. Heads-up before you click around

- `MONGO_URI` points at a **shared Atlas cluster** — a local run reads/writes the deployed
  database. To isolate yourself, change `MONGO_DB_NAME` in `backend/.env`:
  ```bash
  # e.g. MONGO_DB_NAME=procurement_db_local
  ```
- PDF processing and room analysis upload to the **real S3 bucket**.
- Every "Analyze" on a room is a **paid Gemini API call**.

---

## 5. Known-broken paths (don't waste time)

- **`scripts/start_app.sh`** — stale. It runs `npm run dev` from the repo root, but
  `package.json` now lives in `frontend/`, so the frontend never starts. It also builds the
  venv from whatever `python3` is first on PATH (3.9.6), which fails at install.
  (`README.md` also points at `./start_app.sh`; the file is in `scripts/`.)
- **`make up` / docker-compose** — deploy-only, fails locally as committed:
  - `scripts/build_images.sh` tags `editor-*-image`, but `docker-compose.yml` expects
    `pco-frontend-image:latest` / `pco-backend-image:latest`
  - the `backend` service has no `build:` block → "image not found"
  - the external `shared-network` does not exist → `docker network create shared-network`
  - `VITE_SERVER_URL=/editor-api` needs an `/editor-api` → backend reverse proxy that
    `frontend/nginx.conf` does not define (handled by a proxy on the EC2 host)

---

## 6. Handy resets

```bash
# free the ports
lsof -ti:8000 | xargs kill        # backend
lsof -ti:5173 | xargs kill        # vite

# reinstall frontend deps
cd frontend && rm -rf node_modules package-lock.json && npm install

# reinstall backend deps
./venv/bin/pip install --force-reinstall -r backend/requirements.txt

# wipe local processing artifacts (S3/Mongo records are untouched)
rm -rf backend/local_file_db/* backend/uploads/*
```

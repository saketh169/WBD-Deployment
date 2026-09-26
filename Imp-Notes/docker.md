# 🐳 NutriConnect Master Docker Architecture & Commands Guide

> Comprehensive single-file reference: What Docker is, why we use it, our 5-container architecture, image size optimization, execution modes (Full Docker vs. Hybrid), and a complete command cheatsheet for running, restarting, debugging, and factory-resetting containers.

---

## 📌 1. What is Docker & Why Do We Use It?

### The Problem It Solves
The classic software engineering nightmare is: *"It works on my laptop, but fails on my teammate's machine or the cloud deployment server!"* Differences in Node.js versions, missing C++ build tools, Windows vs. Linux path formatting, or uninstalled system libraries break deployments.

### What is Docker?
**Docker** is an industry-standard containerization platform. It bundles an application and everything it needs to run—including the operating system userland, runtime (Node.js 22, Nginx), system libraries, dependencies, and configuration—into an isolated, lightweight package called a **container**.

### Why We Use Docker in NutriConnect:
1. **Identical Environments Everywhere**: Runs on lightweight Linux Alpine internally whether your host is Windows, macOS, or Linux.
2. **Speed & Efficiency**: Unlike heavy Virtual Machines (VMs) that emulate hardware and take 10GB–20GB of disk space, Docker containers share the host OS kernel, boot in **under 2 seconds**, and use minimal RAM.
3. **5-Service Single-Command Launch**: Orchestrates Express, React, Redis, Elasticsearch, and Swagger UI together with one command (`docker compose up -d`).
4. **Internal Private DNS**: Services talk to each other directly by name over an isolated bridge network (`http://backend:5000`, `redis://redis:6379`).

---

## 🏛️ 2. The 5-Container Architecture

```text
                             ┌────────────────────────┐
                             │     CLIENT BROWSER     │
                             └───────────┬────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │ Port 80                                       │ Port 5000
                 ▼                                               ▼
    ┌─────────────────────────┐                     ┌─────────────────────────┐
    │  1. wbd-frontend        │ ── /api (reverse) ─>│  2. wbd-backend         │
    │  React 18 + Nginx       │                     │  Node 22 Express Alpine │
    │  Image Size: ~132 MB    │                     │  Image Size: ~379 MB    │
    └─────────────────────────┘                     └────────┬────────┬───────┘
                                                             │        │
                                     ┌───────────────────────┴──┐     │
                                     ▼                          ▼     ▼
                        ┌─────────────────────────┐   ┌─────────────────────────┐
                        │  3. wbd-redis           │   │  4. wbd-elasticsearch   │
                        │  Redis 7 Alpine         │   │  Search & Indexing      │
                        │  Port: 6379 (~35 MB)    │   │  Port: 9200             │
                        └─────────────────────────┘   └─────────────────────────┘
                                                                   │
                                                                   ▼
                                                      ┌─────────────────────────┐
                                                      │  5. wbd-swagger         │
                                                      │  Swagger UI Docs        │
                                                      │  Port: 8080             │
                                                      └─────────────────────────┘
```

### Container Specifications

| Container Name | Service | Port | Base Image | Disk Size | Role & Responsibilities |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`wbd-frontend`** | React + Nginx | `80:80` | `nginx:alpine` | **132 MB** | Serves static production React bundle + reverse-proxies `/api` traffic to backend |
| **`wbd-backend`** | Express API | `5000:5000` | `node:22-alpine` | **379 MB** | Express REST API, MongoDB connection, Gemini 2.5 AI, Razorpay |
| **`wbd-redis`** | In-Memory Cache | `6379:6379` | `redis:7-alpine` | **57.8 MB** | Ultra-fast caching + consultation slot concurrency locks (`SET NX EX 600`) |
| **`wbd-elasticsearch`**| Search Engine | `9200:9200` | `elasticsearch:8.10.2`| **2.07 GB** | Full-text search engine for blogs & dietitians (heap capped at 512MB) |
| **`wbd-swagger`** | API Docs UI | `8080:8080` | `swagger-ui` | **209 MB** | Interactive browser UI to test and explore all backend REST endpoints |

---

## 🚫 3. How We Eliminated 1GB+ Image Bloat

Standard Docker builds often bloat past **1.2 GB to 1.8 GB** due to fat Debian base images, copying local `node_modules`, and leaving build compilers inside production containers. We solved this with 4 rules:

1. **Alpine Linux Bases**: Used `node:22-alpine` (**40MB**) and `nginx:alpine` (**23MB**) instead of standard Debian Linux (**1.1GB**).
2. **Multi-Stage Builds**: 
   * **Frontend**: Node.js compiles Vite/React in Stage 1; then Node is completely discarded and only the compiled `/dist` HTML/CSS/JS is copied into Nginx.
   * **Backend**: Stage 1 installs dependencies with native C++ build tools (`python3`, `make`, `g++`); Stage 2 runner copies only pure production `node_modules`.
3. **Production Pruning**: `npm install --omit=dev` purges Vite, ESLint, and test runners from production runtime.
4. **Strict `.dockerignore`**: Blocks host `node_modules/`, `.git/`, `.env`, and test artifacts from copying into images.

### Image Size Comparison

| Service | Traditional Naive Image | NutriConnect Alpine Image | Size Savings |
| :--- | :---: | :---: | :---: |
| **Frontend** | `1,250 MB` (Full Node runtime) | **`132 MB`** (`nginx:alpine` static bundle) | **-89.4%** |
| **Backend** | `1,180 MB` (Full Debian + devDeps) | **`379 MB`** (`node:22-alpine` + pruned deps) | **-67.8%** |
| **Redis** | `115 MB` (Standard Debian Redis) | **`57 MB`** (`redis:7-alpine`) | **-50.4%** |
| **Total Custom App** | **`2,430 MB` (2.4 GB!)** | **`511 MB`** (only 124MB compressed) | **-79.0%** |

---

## 🚀 4. How to Run: Full Docker Stack vs. Hybrid Development

You have two choices for running NutriConnect depending on your workflow:

### Option 1: Full 5-Container Docker Stack (Production Mode)
Run everything inside Docker. No need to start separate terminals for frontend or backend!

```bash
cd "C:\Users\saket\Web Projects\WBD-Deployment"
docker compose up -d
```

#### Verified Terminal Output:
```powershell
PS C:\Users\saket\Web Projects\WBD-Deployment> docker compose up -d
[+] up 5/5
 ✔ Container wbd-elasticsearch Running                                                     0.0s
 ✔ Container wbd-redis         Running                                                     0.0s
 ✔ Container wbd-backend       Running                                                     0.0s
 ✔ Container wbd-frontend      Running                                                     0.0s
 ✔ Container wbd-swagger       Running                                                     0.0s
PS C:\Users\saket\Web Projects\WBD-Deployment> 
```

---

### Option 2: Hybrid Development Mode (Live Hot-Reloading)
Use Docker for infrastructure (Redis + Elasticsearch) while running Frontend & Backend locally for instant hot-reload (`nodemon` & `Vite`):

#### 1. Start Redis & Elasticsearch in Docker
```bash
cd "C:\Users\saket\Web Projects\WBD-Deployment"
docker compose up -d redis elasticsearch
```

#### 2. Start Backend Locally (Terminal 1)
```bash
cd "C:\Users\saket\Web Projects\WBD-BackendDev\backend"
npm run dev
# Listens on http://localhost:5000 with nodemon auto-restart
```

#### 3. Start Frontend Locally (Terminal 2)
```bash
cd "C:\Users\saket\Web Projects\WBD-BackendDev\frontend"
npm run dev
# Listens on http://localhost:5173 with Vite instant HMR
```

---

## 🔗 5. Web Access Links & Credentials

| Service | Browser URL / Connection | Credentials / Port |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost](http://localhost) | Port `80` (Direct React SPA) |
| **Backend API Health** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Port `5000` |
| **Swagger UI Container** | [http://localhost:8080](http://localhost:8080) | Port `8080` (Interactive API tester) |
| **Elasticsearch Node** | [http://localhost:9200](http://localhost:9200) | Port `9200` (`nutriconnect_search` index) |
| **Redis In-Memory Cache**| `redis://localhost:6379` | Port `6379` (In-cluster hostname: `redis`) |
| **MongoDB Atlas (Cloud)**| Connection string in `.env` | Managed Cloud Cluster |

---

## 🛠️ 6. Complete Docker Command Reference (Daily & Future Cheatsheet)

All commands should be executed from `WBD-Deployment/`:

### 🚀 A. Starting & Building Containers
```bash
# 1. Start all 5 containers in the background (detached mode)
docker compose up -d

# 2. Rebuild images and start containers
docker compose up -d --build

# 3. Build images only (without running containers)
docker compose build

# 4. Rebuild from scratch ignoring Docker cache (fresh clean build)
docker compose build --no-cache
```

---

### 🔍 B. Checking Status & Viewing Logs
```bash
# 1. View all running containers and mapped ports
docker ps

# 2. View all containers (including stopped/exited)
docker ps -a

# 3. Check exact image sizes on disk
docker images

# 4. View total Docker disk usage (images, containers, build cache, volumes)
docker system df

# 5. Live stream logs from ALL containers
docker compose logs -f

# 6. Stream logs from a specific container
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f redis
docker compose logs -f elasticsearch
```

---

### 🔄 C. Single-Service Controls & Live Shell
```bash
# 1. Restart an individual service without stopping the whole stack
docker compose restart backend
docker compose restart frontend
docker compose restart redis

# 2. Open an interactive shell inside a container
docker exec -it wbd-backend sh
docker exec -it wbd-frontend sh

# 3. Connect to Redis interactive CLI
docker exec -it wbd-redis redis-cli

# Inside Redis CLI, try:
#   ping
#   keys *
#   dbsize
#   exit
```

---

### 🛑 D. Stopping & Pausing Containers
```bash
# 1. Stop all containers (keeps container state and database volumes safe)
docker compose stop

# 2. Stop and remove containers + network (keeps database volumes safe)
docker compose down

# 3. Stop EVERY running container on your computer (PowerShell / Windows / Mac / Linux)
docker stop $(docker ps -q)
```

---

### 🗑️ E. Deleting Containers, Volumes & Images
```bash
# 1. Stop containers and DELETE persistent volumes (wipes Redis & Elasticsearch data)
docker compose down -v

# 2. Stop containers, remove volumes, and remove orphaned containers
docker compose down -v --remove-orphans

# 3. Force delete ALL containers on your system (stopped and running)
# PowerShell:
docker ps -aq | ForEach-Object { docker rm -f $_ }
# Bash / Mac / Linux:
docker rm -f $(docker ps -aq)

# 4. Remove custom project images only
docker rmi wbd-deployment-backend:latest wbd-deployment-frontend:latest

# 5. Remove ALL unused / dangling Docker images
docker image prune -f

# 6. Force delete ALL images on your system
# PowerShell:
docker images -q | ForEach-Object { docker rmi -f $_ }
# Bash / Mac / Linux:
docker rmi -f $(docker images -q)
```

---

### 💥 F. Factory Reset / Nuclear Wipe (Reclaim All Disk Space)
If Docker is taking too much disk space or you want a 100% clean slate:
```bash
# Nuclear cleanup: removes all stopped containers, all unused networks,
# all dangling/unreferenced images, and all build cache:
docker system prune -a --volumes -f
```

---

### 🔄 G. Complete One-Shot Rebuild & Restart (Clean Workflow)
Whenever you update code or dependencies and want a fresh, clean startup:
```bash
# 1. Stop and remove old containers & volumes
docker compose down -v --remove-orphans

# 2. Build completely fresh images without cache
docker compose build --no-cache

# 3. Start stack in detached mode
docker compose up -d

# 4. Verify everything is running
docker ps
```

---

*NutriConnect DevOps & Architecture Reference — Consolidated and Production Ready.*

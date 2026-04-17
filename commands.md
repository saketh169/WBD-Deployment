# WBD Docker Commands & Access Links

## 🚀 Quick Start

### Start All Containers
```bash
cd "C:\Users\saket\Web Projects\WBD-BackendDev"
docker-compose up --build
```

### Stop All Containers
```bash
docker-compose down
```

### Restart All
```bash
docker-compose down -v --remove-orphans
docker-compose up --build
```

---

## 📊 View Logs

### Backend Logs
```bash
docker logs wbd-backend -f
```

### Frontend Logs
```bash
docker logs wbd-frontend -f
```

### Redis Logs
```bash
docker logs wbd-redis -f
```

### Elasticsearch Logs
```bash
docker logs wbd-elasticsearch -f
```

---

## 🔗 Access Links

| Component | Link |
|-----------|------|
| **Frontend** | http://localhost |
| **Backend API** | http://localhost:5000 |
| **Swagger Docs (Backend)** | http://localhost:5000/api-docs |
| **Swagger UI Container** | http://localhost:8080 |
| **Elasticsearch** | http://localhost:9200 |
| **Redis CLI** | `docker exec -it wbd-redis redis-cli` |

---

## 🗄️ Database

### MongoDB Atlas (Cloud)
```
Connection: mongodb+srv://Saketh:Saketh%40169@cluster0.a5er4aj.mongodb.net/NutriConnectDatabase?retryWrites=true&w=majority&appName=Cluster0
Database: NutriConnectDatabase
```

### Redis
```
Host: redis
Port: 6379
```

### Elasticsearch
```
Host: localhost
Port: 9200
Index: nutriconnect_search
```

---

## 📦 Containers (5 total)

1. **wbd-backend** - Node.js API (port 5000)
2. **wbd-frontend** - React + Nginx (port 80)
3. **wbd-redis** - Cache (port 6379)
4. **wbd-elasticsearch** - Search (port 9200)
5. **wbd-swagger** - Swagger UI (port 8080)

---

## 🛠️ Useful Commands

### View Running Containers
```bash
docker ps
```

### Check Container Status
```bash
docker-compose ps
```

### View All Containers
```bash
docker ps -a
```

### Restart Specific Container
```bash
docker-compose restart wbd-backend
docker-compose restart wbd-frontend
```

### Enter Container Shell
```bash
docker exec -it wbd-backend sh
docker exec -it wbd-frontend sh
```

---

## 🚨 Troubleshooting

### Container Won't Start
```bash
docker logs <container-name>
docker-compose build --no-cache
docker-compose down -v --remove-orphans
docker-compose up --build
```

### Port Already in Use
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
docker-compose up --build
```

### Test Connections
```bash
# Redis
docker exec -it wbd-redis redis-cli ping

# Elasticsearch
curl http://localhost:9200/

# MongoDB Atlas (from backend)
docker exec -it wbd-backend node -c "require('mongodb').MongoClient.connect('mongodb+srv://...')"
```

---

**Last Updated:** April 17, 2026  
**Project:** WBD - Docker Setup  
**Configuration:** 5 Containers + MongoDB Atlas + Swagger UI
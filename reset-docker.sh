docker compose exec screeps curl -X POST http://localhost:21026/cli -d 'system.resetAllData()'
docker compose restart screeps
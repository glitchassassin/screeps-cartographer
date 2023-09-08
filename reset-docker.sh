docker compose down -v
docker compose up -d
until docker compose run curl -X POST http://localhost:21028/cli -d 'system.resetAllData()'; do
  echo "Waiting for server..."
  sleep 10
done
docker compose restart screeps
until docker compose run curl -X POST http://localhost:21028/cli -d 'utils.addNPCTerminals()'; do
  echo "Waiting for server..."
  sleep 5
done
docker compose run curl -X POST http://localhost:21028/cli -d 'storage.db["rooms.objects"].insert({ room: "W0N5", type: "portal", x: 25, y: 25, destination: { x: 25, y: 25, room: "W10N5" } });'
docker compose run curl -X POST http://localhost:21028/cli -d 'storage.db["rooms.objects"].insert({ room: "W10N5", type: "portal", x: 25, y: 25, destination: { x: 25, y: 25, room: "W0N5" } });'
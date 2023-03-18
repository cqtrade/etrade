# etrade

Trading bot. Consists of signal service and trading bot.

```sh
 docker compose build
 docker compose down
 docker compose up
```

```sh
docker logs etrade-njs-1 -f

docker logs etrade-rsignals-1
```

## Deploy

```sh
docker compose build && docker compose down && docker compose up -d
```

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

## Architecutre

```sh
├── README.md
├── docker-compose.yml
├── njs                         # Node project njs
│   ├── Dockerfile
│   ├── _.env
│   ├── dev.js
│   ├── index.js
│   ├── package-lock.json
│   ├── package.json
│   └── src
│       ├── binance-bot
│       ├── createLogger.js
│       ├── index.js
│       ├── log.js
│       ├── logger.js
│       ├── server.js
│       ├── tradebb
│       └── utils.js
└── rsignals                    # Clojure(war JVM) project rsignals. Pedetal template
    ├── Capstanfile
    ├── Dockerfile
    ├── README.md
    ├── config
    │   └── logback.xml
    ├── resources
    ├── src
        └── rsignals
            ├── engine          # generate trading signals
            │   ├── core.clj
            │   ├── dstats.clj
            │   ├── long.clj
            │   ├── ohlc.clj
            │   ├── short.clj
            │   ├── signals.clj
            │   └── ta.clj
            ├── envs.clj
            ├── server.clj      # -main methods starts service
            ├── service.clj
            └── utils.clj

    ├── target

    └── test
        └── rsignals

```

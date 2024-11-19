# etrade

Automated algorithmic cryptocurrency trading bot.

Consists of:

- signal generation service (Clojure)
- position management service (Nodejs)
- UPCOMING: quantitave statistics service (Python)

## Deploy

Prepare `njs/.env`


```sh

docker compose down && docker compose build && docker compose up -d

```

## Basic structure

```sh

├── docker-compose.yml
├── njs                         # Node
├── rsignals                    # Clojure
└── pstats                      # Python

```

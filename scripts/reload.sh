#!/bin/bash
set -eux

git pull

docker compose down

docker compose pull

docker compose build

docker compose up -d

#!/bin/bash
set -eux

git pull

docker compose down

docker compose build

docker compose up -d

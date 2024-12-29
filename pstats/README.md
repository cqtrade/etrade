# pstats

## Deploy

This is temporary until we have a proper CI/CD pipeline.

[See for more](https://stackoverflow.com/questions/51253987/building-a-multi-stage-dockerfile-with-target-flag-builds-all-stages-instead-o)

```bash

docker login

docker build --target program -t sandermets/exploratory-stats .

docker tag sandermets/exploratory-stats sandermets/exploratory-stats:v0.x

docker push sandermets/exploratory-stats:v0.x
docker push sandermets/exploratory-stats:latest
```

PS add `--no-cache` for `docker build` if there's a need to rebuild the image from scratch.

NB! Set correct image tag in the docker compose file.

```yaml

## Develop locally

```bash

# Install dependencies
pip install -r requirements.txt

chmod +x run.sh
```

## Run locally

```bash

./run.sh

```

## Run docker separately

`source .env` before running see run.sh for an example.

```bash
docker build --target base --no-cache -t pstats1 .       # Deps

docker build --target program --no-cache -t pstats1 .    # Deps and Code

docker build --target program -t pstats1 .               # Code

docker run --name=pstats1 --rm -it pstats1

docker rm testp1
```

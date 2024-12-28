# pstats

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

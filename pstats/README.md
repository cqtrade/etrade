# pstats

## Deploy

This is temporary until we have a proper CI/CD pipeline.

[See for more](https://stackoverflow.com/questions/51253987/building-a-multi-stage-dockerfile-with-target-flag-builds-all-stages-instead-o)

```bash

docker login

docker build --target program --no-cache -t sandermets/exploratory-stats .

docker tag sandermets/exploratory-stats sandermets/exploratory-stats:v0.13
docker tag sandermets/exploratory-stats sandermets/exploratory-stats:latest

docker push sandermets/exploratory-stats:v0.13
docker push sandermets/exploratory-stats:latest
```

Docker compose file uses latest tag.

```yaml

## Develop locally

It should be possible to run modules independently.

e.g.

```bash

python app/foolsgold/b.py

```


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

## Study references

[Adjust sl](https://stackoverflow.com/questions/76328503/how-to-set-a-stoploss-in-vectorbt-based-on-the-number-of-ticks-or-price-per-cont)

[Heikin ashi](https://stackoverflow.com/questions/40613480/heiken-ashi-using-pandas-python)

[kwargs](https://stackoverflow.com/questions/1769403/what-is-the-purpose-and-use-of-kwargs)


## Roadmap

- [x] Simple funding rate stats periodic logging
- [x] Simple trading bot to forward test ideas
- [x] Simple backtesting framework to test ideas
- [x] Separate flash logging
- [ ] Mom long strategy
- [ ] Mom short strategy
- [ ] Mean reversion sort strategy
- [ ] Mean reversion sort strategy 
- [ ] Flash stats for cash and carry
- [ ] Flash stats oversold conditions
- [ ] Flash stats overbought conditions
- [ ] Analyse historical funding rates
- [ ] HL interface

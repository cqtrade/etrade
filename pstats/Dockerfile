FROM python:3.12 AS base

ARG IN_DOCKER="true"
ENV IN_DOCKER=$IN_DOCKER
ENV PYTHONUNBUFFERED=1

RUN pip install --upgrade pip
RUN pip install numpy==2.0.1

RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
  tar -xvzf ta-lib-0.4.0-src.tar.gz && \
  cd ta-lib/ && \
  ./configure --prefix=/usr && \
  make && \
  make install

RUN rm -R ta-lib ta-lib-0.4.0-src.tar.gz

WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN python3 -m pip install -r requirements.txt

FROM base AS program

COPY ./app /app

CMD ["python3", "-m", "main"]

FROM python:3.12-slim as base

ARG UID=1000
ARG GID=1000
ARG CONFIG_PATH="/opt/app/config.json"

ENV SV_CONFIG_PATH="$CONFIG_PATH"

RUN groupadd -g "$GID" python && useradd -u "$UID" -g "$GID" python

COPY ./sv-server/requirements.txt /opt/app/requirements.txt
RUN python -m pip install -r /opt/app/requirements.txt

COPY ./sv-server/ /opt/app/src
COPY ./containers/sv-server/config.json /opt/app/config.json
RUN mkdir -p /opt/app/data/apps
RUN chown -R python:python /opt/app/data/apps

WORKDIR /opt/app/src

USER python

CMD uvicorn app:create_app --reload --factory --host 0.0.0.0

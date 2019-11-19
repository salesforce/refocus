FROM node:8-alpine

ENV HOME=/home/refocus
RUN adduser -D -h $HOME refocus
COPY . $HOME 

RUN echo $'#!/bin/sh\n\
# wait-for-postgres.sh\n\
# from https://docs.docker.com/compose/startup-order/ \n\
\n\
set -e\n\
\n\
host="$1"\n\
shift\n\
cmd="$@"\n\
\n\
until psql -h "$host" -U "postgres" -c "\l"; do\n\
  >&2 echo "Postgres is unavailable - sleeping"\n\
  sleep 1\n\
done\n\
\n\
>&2 echo "Postgres is up - executing command"\n\
exec $cmd' > $HOME/wait-for-postgres.sh

RUN chown -R refocus:refocus $HOME && chmod +x $HOME/wait-for-postgres.sh
RUN apk add --no-cache postgresql-client #need for script

USER refocus
WORKDIR $HOME
RUN npm install

ENV PGHOST=pg
ENV REDIS_URL=//redis:6379

EXPOSE 3000

CMD [ "/bin/sh", "-c", "$HOME/wait-for-postgres.sh pg 'npm start'" ]


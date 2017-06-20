FROM node:6.10.3

RUN useradd -U -d /opt/refocus refocus 
ENV HOME=/opt/refocus
COPY . $HOME 
RUN chown -R refocus:refocus $HOME

USER refocus
WORKDIR $HOME
RUN npm install 

# sleep is to support pause during startup for deploys in kubernetes - delays start of refocus container to let pg and redis containers to start within the same pod.
ENV SLEEP=0
ENV PGHOST=pg
ENV REDIS_URL=//redis:6379

EXPOSE 3000

CMD [ "/bin/sh", "-c", "sleep $SLEEP; npm start" ]

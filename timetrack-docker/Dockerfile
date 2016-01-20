FROM node:5.0.0

RUN git clone https://github.com/redpelicans/timetrack.git /timetrack

ENV TIMETRACK_REVISION c31465ac44e66ac19edf56ab3929f9ca030ae678
ENV TIMETRACK_TAG c31465ac44e6

RUN \
  cd /timetrack && \
  git checkout $TIMETRACK_REVISION && \
  npm install

WORKDIR /timetrack
RUN npm run compile-server
RUN npm run compile-client

ADD start.sh /start
VOLUME ["/config"]
EXPOSE 80
CMD ["bash", "/start"]




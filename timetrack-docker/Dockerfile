FROM node:5.0.0

RUN git clone https://github.com/redpelicans/timetrack.git /timetrack

ENV TIMETRACK_REVISION 3f594d0c50d17d82d29ae9d1c54707c08ac0d2aa
ENV TIMETRACK_TAG 3f594d0c50d1

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




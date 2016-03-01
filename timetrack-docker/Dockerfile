FROM node:5.0.0

RUN git clone https://github.com/redpelicans/timetrack.git /timetrack

ENV TIMETRACK_REVISION 0c54a10fa4d1d90ea9d9fafd24d21e0d511d095d
ENV TIMETRACK_TAG 0c54a10fa4d1

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




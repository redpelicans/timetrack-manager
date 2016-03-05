FROM node:5-slim

RUN apt-get update && apt-get install -y git
RUN git clone https://github.com/redpelicans/timetrack.git /timetrack

ENV TIMETRACK_REVISION 839b0e8d80b35ba73899d2891b9a263287c2b5ac
ENV TIMETRACK_TAG 839b0e8d80b3

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




FROM node:5.0.0

RUN apt-get update && apt-get install -y git vim-tiny

RUN npm install -g n_  \
&& npm cache clear

RUN git clone https://github.com/redpelicans/timetrack.git /timetrack

ENV TIMETRACK_REVISION __HASH__
ENV TIMETRACK_TAG __VERSION__

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




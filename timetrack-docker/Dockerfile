FROM node:5.0.0

RUN apt-get update && apt-get install -y git vim-tiny

RUN npm install -g n_  \
&& npm cache clear

RUN git clone https://github.com/redpelicans/timetrack.git /timetrack

ENV TIMETRACK_REVISION 93f6558fee152ee02e19fd5b9fe6e086e8eb4627
ENV TIMETRACK_TAG 93f6558fee15

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




#!/bin/bash

PRG="/timetrack"
CONFIG="/config"

PARAMS="params.js"

cd "$PRG"

ln -fs "$CONFIG/$PARAMS" "$PRG/$PARAMS"

echo "Running timetrack  ..."
NODE_ENV=production DEBUG=timetrack:* node server/lib/main.js

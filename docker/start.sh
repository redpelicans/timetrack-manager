#!/bin/bash

cp /config/params.js /timetrack

NODE_ENV=production DEBUG=timetrack:* node server/dist/main.js

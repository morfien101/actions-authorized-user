#!/usr/bin/env bash
set -e

if [ -f index.js ]; then
    rm index.js
fi

node_modules/@vercel/ncc/dist/ncc/cli.js build main.js

mv dist/index.js ./index.js
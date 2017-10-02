#!/bin/bash

# sets up client to push data to refocus
if [ ! -d ../refocus-client-example ]; then
  git clone https://github.com/iamigo/refocus-client-example.git
  cd refocus-client-example
  npm run install
fi


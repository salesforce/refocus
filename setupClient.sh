#!/bin/bash

# sets up client to push data to refocus
cd ..
if [ ! -d ./refocus-client-example ]; then
  rm -rf
  git clone https://github.com/iamigo/refocus-client-example.git
  cd refocus-client-example
  npm install
  cd ../refocus
else
  cd refocus
fi




#!/bin/bash
#
# Populate the db with data for UI test

# clones the client to send data to refocus
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

# starts and sends server to the background, to run additional commands
node . &
TASK_PID=$!
sleep 5 # for the server process
. ./loadResources.sh # calls the client code
sleep 10 # for the server process
kill $TASK_PID

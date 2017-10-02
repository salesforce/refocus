#!/bin/bash

# populate the db with data for UI test
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

# need to send server to the background, to run additional commands
node . &
TASK_PID=$!
sleep 5 # for the server process
. loadResources.sh
sleep 10 # for the server process
kill $TASK_PID
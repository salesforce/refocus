#!/bin/bash
#
# Populate the db with data for UI test

# clones the client to send data to refocus
refocusDir=$(pwd)
echo $refocusDir
cd .. # go one dir above the refocus dir
if [ ! -d ./refocus-client-example ]; then
  rm -rf
  git clone https://github.com/iamigo/refocus-client-example.git
  cd refocus-client-example
  refocusClientDir=$(pwd)
  npm install
else
  cd refocus-client-example
  refocusClientDir=$(pwd)
fi
echo $refocusClientDir

cd $refocusDir
# starts and sends server to the background, to run additional commands
node . &
serverPID=$!
selenium . &
seleniumPID=$!
sleep 5 # for the server process

cd $refocusClientDir
echo 'populating subjects, aspects, lens, and perspective'
node subjectsAndAspects.js
node perspectiveAndLens.js
cd $refocusDir

sleep 10 # for the server process
kill $serverPID
kill $seleniumPID


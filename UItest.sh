#!/bin/bash

# populate the db with data for UI test

# need to send server to the background, to run additional commands
node . &
TASK_PID=$!
sleep 5 # for the server process
cd ../refocus-client-example
node subjectsAndAspects.js &
node perspectiveAndLens.js &

sleep 10 # for the server process
kill $TASK_PID
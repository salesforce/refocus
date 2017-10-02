if [[ $(npm list -g nightwatch) ]]; then
    echo "nightwatch is installed globally"
else
    npm run install -g nightwatch
fi

if [[ $(npm list -g selenium-server) ]]; then
    echo "selenium-server is installed globally"
else
    npm run install -g selenium-server
fi

echo $(pwd) #should be in the refocus dir
node . &
serverPID=$!

#start up selenium server
selenium . &
seleniumPID=$!
sleep 5 # for the server process
node ../refocus-client-example/samples.js

sleep 10 # for the server process
kill $serverPID
kill $seleniumPID
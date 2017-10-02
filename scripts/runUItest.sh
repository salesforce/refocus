#!/bin/bash
#
# Calls the end to end tests
# Can merge with UItest.sh

if [[ $(npm list -g nightwatch) ]]; then
    echo "nightwatch is installed globally"
else
    npm run install -g nightwatch
fi

echo $(pwd) #should be in the refocus dir
nightwatch tests/e2e/register.js

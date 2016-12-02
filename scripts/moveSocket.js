/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

 /**
 * ./scripts/moveSocket.js
 *
 * Call this script from the command line to move the socket.io.js from
 * any folder in socket.io-client  to the destination folder.
 */

require('shelljs/global');
const DEST_PATH = 'public';

const arr = find('node_modules/socket.io-client')
  .filter((file) => {
    return file.match(/socket.io.js$/);
  });
if (arr.length !== 1) {
  throw new Error('Did not find client-side socket.io script');
} else {
  cp('-f', arr[0], DEST_PATH);
}

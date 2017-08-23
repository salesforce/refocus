---
layout: docs
title: Core Development
---

<h1>Core Development Work In Progress</h1>

## Development
- Run `npm run build` and modify the webpack.config.js to take advantage of react hot module reload (react-hmr), for faster front-end development.
- At times the generated pages don't show due to this error in the browser console: `locals[0] does not appear to be a 'module' object with Hot Module replacement API enabled`. This can happen when the NODE_ENV is blank. To fix the issue, set the NODE_ENV to a non-empty value, then run the build again.
- If you want any of the packages to send output to stdout, you can start your server with `DEBUG=* node .` or you can spell out which packages you want to show debug output, e.g. `DEBUG=express*,swagger* node .`.
- Use [nodemon](http://nodemon.io/) to monitor for any changes in your source and automatically restart your server.
- Use Node.js [Debugger](https://nodejs.org/api/debugger.html).
- If you are making changes to the code, check for adherence to style guidelines by running `npm run lint` and `npm run jscs`.
- If you are making any changes to the DB schema, create a migration using `node_modules/.bin/sequelize migration:create --name example-name`. Note: be sure to wrap your migration code inside a transaction. This ensures that all migration operations are successful before committing changes to the database. This minimizes the possibility of a failed partial migration during release phase.

### Package Scripts
Execute any of the scripts in the `scripts` section of [`./package.json`](./package.json) by calling `npm run [SCRIPTNAME]`, e.g. `npm run test` or `npm run lint` or `npm run start`.

Folder structure of view/admin Single Page Application(SPA)

Folders
-------
+ actions: redux actions
+ components:
  + common: dumb components
  + pages: views
+ config: contains config data for view components, returns configured components
+ reducers: fn(action, state) => new state
+ utils: store and reducer helpers

Flat files
-------
- constants: defines action types
- index:
  - passes history and store to Root component
  - renders Root component
- index.template: used by webpack for the admin views
- Root:
  - contains react-router Routes: matches components to paths
  - used by index

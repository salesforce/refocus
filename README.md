[![Build Status](https://travis-ci.org/salesforce/refocus.svg?branch=master)](https://travis-ci.org/salesforce/refocus)
[![Coverage Status](https://coveralls.io/repos/github/salesforce/refocus/badge.svg?branch=master)](https://coveralls.io/github/salesforce/refocus?branch=master)
[![StackShare](http://img.shields.io/badge/tech-stack-0690fa.svg?style=flat)](http://stackshare.io/iamigo/refocus)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/Salesforce/refocus)

# Refocus

> ## Get started now with our [QuickStart](https://salesforce.github.io/refocus/docs/01-quickstart.html) guide!

Refocus is a platform for visualizing the health and status of systems and/or services under observation. Check out our [home page](https://salesforce.github.io/refocus) and our [docs](https://salesforce.github.io/refocus/docs/00-welcome).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Features](#features)
- [Quickstart](#quickstart)
- [Securing Refocus](#securing-refocus)
  - [IP Restrictions](#ip-restrictions)
  - [Authentication](#authentication)
  - [Using API Access Tokens](#using-api-access-tokens)
  - [Dummy SSO Password](#dummy-sso-password)
- [Perspective Debugging](#perspective-debugging)
- [API Documentation](#api-documentation)
- [Useful Resources](#useful-resources)
- [Contributing](#contributing)
- [Related Github Repositories](#related-github-repositories)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features
- API for everything
- Pluggable lenses
- Self-service
- Easy deployment to Heroku

## Quickstart

See the [Quickstart](https://salesforce.github.io/refocus/docs/01-quickstart.html) guide to get going with Refocus!

## Securing Refocus
1. After installation, log in (UI or API) as `admin@refocus.admin` with password `password` and change the password for that account.
1. Create a new user record for yourself with your real email address, and set your profile to the `Admin` profile.
1. If you want to restrict access to specific IP ranges, see [IP Restrictions](#ip-restrictions) below.
1. If you want to use your own single sign-on (SSO) user authentication service, see [Authentication](#authentication) below.
1. New users are assigned to the "RefocusUser" profile by default. This profile has read/write permission to all resource types. If you would like to restrict a class of users to have only read access to certain resource types, you can update the ____Access fields in the "RefocusUser" profile record.
1. Invite other users. Note: by default, only users with the `Admin` profile will be able to invite other users. If you want to let users register themselves as Refocus users, an Admin must set the config parameter `SELF_REGISTRATION_ENABLED` to `true`.

### IP Restrictions
By default, there are no IP restrictions for Refocus access. An admin can configure IP restrictions by adding a config var in Heroku with name ```IP_WHITELIST``` and value array of IP ranges, eg. ```[ [1.2.3.4, 1.2.3.8], [7.6.5.4, 7.6.9.9], [8.8.8.8, 9.9.9.9] ]```. Only the specified IP ranges will be allowed access to Refocus.

### Authentication
#### Local Authentication only. SSO is not enabled.
A user should sign up with Refocus using register page or POST to /v1/register. Once registered, the user can sign in using Local authentication - username/password on Refocus login page.

#### SSO enabled with Local authentication.
##### Non-SSO users
Non-SSO users should authenticate with Refocus as described above using Local Authentication.

##### SSO-Users
If Single Sign On (SSO) is configured in Refocus, SSO users can login using 'SSO Login' button on login page. In case of local authentication with username/password, SSO users will be considered as unregistered user unless they sign up using register page or POST to /v1/register. Once an SSO user is registered with SSO username, the user can sign in using local authentication as well.

### Using API Access Tokens
See [docs](https://salesforce.github.io/refocus/docs/10-security.html#api-tokens).

### Dummy SSO Password
When using SSO, a placeholder user record is created and added to the database. Specify a dummy password string for these dummy records. This dummy password is never used for authentication.

## Perspective Debugging
If you are troubleshooting realtime event handling in a perspective, add query parameter `debug=REALTIME` to any perspective URL. This turns on console logging in the browser for all the realtime subject and sample events the perspective receives.

## API Documentation
The API is self-documenting based on [`./api/v1/swagger.yaml`](./api/v1/swagger.yaml). Start your server and open `MY_HOST:MY_PORT/v1/docs` for interactive documentation of all the Refocus API endpoints.

## Useful Resources
- Redis [command line interface](http://redis.io/commands)
- [Postman](https://chrome.google.com/webstore/detail/postman-rest-client/fdmmgilgnpjigdojojpjoooidkmcomcm?hl=en) for testing API calls
- Node.js [token-based authentication](https://scotch.io/tutorials/authenticate-a-node-js-api-with-json-web-tokens)

## Contributing
Guidelines on contributing to Refocus are available [here](https://salesforce.github.io/refocus/docs/95-contributing.html).

## Related Github Repositories
- [refocus-collector](https://github.com/salesforce/refocus-collector) - Use a Refocus Collector to push your samples to Refocus
- [refocus-collector-eval](https://github.com/salesforce/refocus-collector-eval) - Utilities used by Refocus Collectors for executing the transform logic from a Sample Generator Template.
- [refocus-ldk](https://github.com/salesforce/refocus-ldk) - Refocus Lens Developer Kit - a toolkit for developing, testing and packaging Refocus lenses for deployment
- [refocus-lens-multitable](https://github.com/salesforce/refocus-lens-multitable) - A fluid multi-table layout. Each table groups subjects together under a shared parent.
- [refocus-lens-tree](https://github.com/salesforce/refocus-lens-tree) - Display your subjects and samples in a hierarchical left-to-right tree.

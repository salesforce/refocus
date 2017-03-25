---
layout: docs
title: Security
---

- [API Tokens](#api-tokens)
- [Record-Level Permissions](#record-level-permissions)

# API Tokens

## Admin: Turn on API Token Enforcement

If you want to enforce that every request has a valid API token, start your node.js server with environment variable `REQUIRE_ACCESS_TOKEN=true`.

In heroku, [add a config variable](https://devcenter.heroku.com/articles/config-vars) called `REQUIRE_ACCESS_TOKEN` and set its value to `true`.

## Creating a New API Token

If your Refocus Administrator has turned on API token enforcement, you must include a valid token in the `Authorization` header for every API request.

To get an API token using the UI, load `.../tokens/new` in your browser. You must be logged in to reach this page, and you must provide a token name which is unique to your user. Copy and paste your new token somewhere safe--you will not be able to retrieve it again!

If you have more than one API client, best practice is to create a separate API token for each client application. You may create multiple tokens from the UI as long each one is given a unique name.

Alternatively, if you already have an API token, you can use that token to create a new token from the API. Send a `POST` request to `/v1/tokens` with a body like `{ "name": "MyNewToken" }` and include an `Authorization` request header with your previously-obtained token.

# Record-Level Permissions

By default, Subjects, Aspects, Perspectives and Lenses are writable by all authenticated users. If you want to prevent unauthorized users from modifying or deleting your resources, you may designate a set of users as "writers" for a resource (provided you have permission to modify or delete that resource). If no writers are specified (the default on record creation), then the record is writable (and deletable) by all authenticated users. Once there is at least one writer designated for a resource, the record is write-protected, i.e. only a designated writer may modify or delete the record.

Note: Samples don’t have their own write-protection--a Sample inherits the write-protection of its Aspect. If a user is authorized to modify or delete an Aspect, then that user is automatically authorized to modify or delete all of the Samples for that Aspect.

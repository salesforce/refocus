---
layout: docs
title: Quick Start with Local Docker
---

# QuickStart with Local Docker
# Prerequisites
1. Install docker [docker-for-mac](https://docs.docker.com/docker-for-mac/install/).
# Build Refocus image
1. Clone this git repository.
2. Run `cd refocus`.
3. Build docker image 
```
docker build -t refocus-app .
```
# Create docker-compose.yml file 
```
version: '2'
services:
  refocus:
    image: "you-image-name"
    ports:
     - "3000:3000"
    depends_on:
     - "redis"
     - "pg"
  redis:
    image: "redis:3.2.8"
    expose:
       - 6379
  pg:
    image: "postgres:9.6.2"
    expose:
       - 5432
```
# Start Refocus with dependencies
1. From the folder with docker-compose.yml run
```
docker-compose up
```   

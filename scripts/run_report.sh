#!/bin/bash

docker stop repoart_1
docker stop repoart_2
docker rm repoart_1
docker rm repoart_2
docker rmi wfk/server

git pull

docker build -t wfk/server . 
docker-compose up report_1 report_2 -d
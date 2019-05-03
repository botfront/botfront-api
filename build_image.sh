#!/usr/bin/env bash
export GCP_PROJECT="botfront-project"
docker build -t gcr.io/${GCP_PROJECT}/botfront-api:latest .

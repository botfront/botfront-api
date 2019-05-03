# Botfront API

## How it works

The Botfront API is gateway'd by Cloud Endpoints (ESP) for requests coming from outside the cluster.
Requests coming from withing the cluster are not gateway'd.
To make the distinction, two services are exposed in the cluster:

- One mapping the port 8888 to 8080 (the Botfront API pod)
- One mapping the port 80 to 8081 (ESP port)

The ingress redirects traffic to the 80 port, ensuring requests from the outer internet are properly checked.

When an API key is present, the key will be part of the Mongo query looking up the project to make sure this key is allowed on this particular project. When no API key is present (i.e. request is trusted) then only the `projectId` is used in the Mongo query selector

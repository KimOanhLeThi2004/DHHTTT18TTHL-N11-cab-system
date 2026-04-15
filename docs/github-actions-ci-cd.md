# GitHub Actions CI/CD + Docker Hub

Workflow file:

- `.github/workflows/ci-cd.yml`

## What the pipeline does

1. On `pull_request` and `push`: run install/lint/test/build for all Node apps.
2. Validate `docker-compose.yml` via `docker compose config`.
3. Build-check all Docker images (no push).
4. On push to `main` (or tag `v*`): build and push all images to Docker Hub.

## Required GitHub Secrets

Set in repository `Settings -> Secrets and variables -> Actions -> Secrets`:

- `DOCKERHUB_USERNAME`: Docker Hub username
- `DOCKERHUB_TOKEN`: Docker Hub access token

## Optional GitHub Variables

Set in repository `Settings -> Secrets and variables -> Actions -> Variables`:

- `DOCKERHUB_NAMESPACE`: org/namespace on Docker Hub  
  If not set, workflow uses `DOCKERHUB_USERNAME`.
- `VITE_API_URL`: build-time API URL for `cab-ui` image  
  Default: `http://localhost:3000`

## Image naming

All images are pushed as:

- `docker.io/<namespace>/<image>:<tag>`

Examples:

- `docker.io/<namespace>/api-gateway:latest`
- `docker.io/<namespace>/ride-service:sha-<commit>`
- `docker.io/<namespace>/cab-ui:v1.0.0`

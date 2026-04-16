# GitHub Actions CI/CD + Docker Hub

Workflow file:

- `.github/workflows/ci-cd.yml`

## What the pipeline does

1. On `pull_request` and `push`: run install/lint/test/build for all Node apps.
2. Validate `docker-compose.yml` via `docker compose config`.
3. Validate `docker-stack.yml` for Swarm deploy.
4. Build-check all Docker images (no push).
5. On push to `main` (or tag `v*`): build and push all images to Docker Hub namespace `kietlu`.
6. On push to `main`: auto-deploy stack to Docker Swarm manager if SSH secrets are configured.

## Required GitHub Secrets

Set in repository `Settings -> Secrets and variables -> Actions -> Secrets`:

- `DOCKERHUB_USERNAME`: Docker Hub username
- `DOCKERHUB_TOKEN`: Docker Hub access token
- `SWARM_SSH_HOST`: Swarm manager host/IP (optional, only if auto deploy)
- `SWARM_SSH_PORT`: Swarm SSH port, default `22` (optional)
- `SWARM_SSH_USER`: SSH user on Swarm manager (optional, only if auto deploy)
- `SWARM_SSH_KEY`: private SSH key for Swarm manager (optional, only if auto deploy)

## Optional GitHub Variables

Set in repository `Settings -> Secrets and variables -> Actions -> Variables`:

- `VITE_API_URL`: build-time API URL for `cab-ui` image  
  Default: `http://localhost:3000`

## Image naming

All images are pushed as:

- `docker.io/kietlu/<image>:<tag>`

Examples:

- `docker.io/kietlu/api-gateway:latest`
- `docker.io/kietlu/ride-service:sha-<commit>`
- `docker.io/kietlu/cab-ui:v1.0.0`

## Swarm stack file

- `docker-stack.yml`
- Only `api-gateway` and `cab-ui` publish ports.
- Deploy command used by workflow:

```bash
IMAGE_TAG=latest docker stack deploy -c docker-stack.yml taxi-booking --with-registry-auth
```

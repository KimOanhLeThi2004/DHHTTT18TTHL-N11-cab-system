# mTLS Certificates

This folder is mounted into backend containers at `/etc/mtls`.

When `MTLS_ENABLED=true`, each service expects:

- `/etc/mtls/ca.crt`
- `/etc/mtls/<service-name>.crt`
- `/etc/mtls/<service-name>.key`

Service names used by compose:

- `api-gateway`
- `auth-service`
- `user-service`
- `pricing-service`
- `booking-service`
- `driver-service`
- `payment-service`
- `ride-service`
- `notification-service`
- `review-service`
- `ai-matching-service`

## Quick OpenSSL Setup (Linux/macOS/WSL)

Generate CA:

```bash
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/CN=taxi-booking-internal-ca" \
  -out ca.crt
```

Generate one service cert (repeat for each service name):

```bash
SERVICE=api-gateway
openssl genrsa -out ${SERVICE}.key 2048
openssl req -new -key ${SERVICE}.key -subj "/CN=${SERVICE}" -out ${SERVICE}.csr
openssl x509 -req -in ${SERVICE}.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out ${SERVICE}.crt -days 825 -sha256
rm -f ${SERVICE}.csr
```

## Enable mTLS in Compose

```bash
MTLS_ENABLED=true MTLS_REJECT_UNAUTHORIZED=true docker compose up --build
```

If you are testing with incomplete certificates, temporarily disable strict validation:

```bash
MTLS_ENABLED=true MTLS_REJECT_UNAUTHORIZED=false docker compose up --build
```

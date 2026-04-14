# Zero Trust Checklist

- All external requests are validated at `api-gateway`.
- Missing JWT returns `401 Missing token`.
- Invalid/tampered JWT returns `401 Invalid token`.
- Expired JWT returns `401 Token expired`.
- Role/permission failure returns `403 Access denied`.
- Least privilege is enforced for each endpoint and service account.
- Rate limiting enforced at gateway (`429 Too many requests`).
- Payload limit enforced (`413 Payload Too Large`).
- service-to-service calls require signed service JWT.
- service-to-service transport is protected with mTLS (client cert + server cert validation).
- Audit trace uses `x-request-id` propagated through gateway.

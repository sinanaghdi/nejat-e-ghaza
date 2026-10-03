# Production Docker layout

Production traffic should enter through Nginx.

```
Internet
   |
   v
Nginx :80/:443
   |
   v
FastAPI :8000
   |
   +--> PostgreSQL
   +--> Redis
```

PostgreSQL and Redis are internal services and should not publish host ports in production.

For real HTTPS deployment, terminate TLS at Nginx or at the hosting provider/load balancer. Do not commit certificates or private keys to the repository.

The current Nginx configuration is an HTTP reverse-proxy baseline. HTTPS certificates and domain-specific server configuration belong in deployment secrets/configuration.

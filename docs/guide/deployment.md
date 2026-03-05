# Deployment

## Docker Compose (production)

```yaml
version: "3.9"
services:
  rag-builder:
    image: ghcr.io/maxmrzk/open-rag:latest
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: openrag
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: openrag

  redis:
    image: valkey/valkey:8-alpine
    restart: unless-stopped

volumes:
  pg_data:
```

## Reverse proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name rag.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## GitHub Pages docs

The documentation on this site is deployed automatically via a manual GitHub Actions workflow. To trigger a docs rebuild, go to **Actions → Deploy Docs → Run workflow** in the [repository](https://github.com/maxmrzk/open-rag/actions).

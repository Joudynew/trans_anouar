# Déploiement en une seule commande : `make`

all: up

# Crée .env depuis .env.example (avec un JWT_SECRET et un mot de passe DB aléatoires) s'il n'existe pas.
.env:
	@cp .env.example .env
	@sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$$(openssl rand -hex 32)|" .env
	@sed -i.bak "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$(openssl rand -hex 16)|" .env
	@sed -i.bak "s|^SUPER_ADMIN_PASSWORD=.*|SUPER_ADMIN_PASSWORD=$$(openssl rand -base64 12 | tr -d '/+=')|" .env
	@rm -f .env.bak
	@echo ".env créé à partir de .env.example (identifiants super admin : voir SUPER_ADMIN_* dans .env)"

up: .env
	docker compose up --build -d
	@echo "Application disponible sur https://localhost"

down:
	docker compose down

logs:
	docker compose logs -f

clean:
	docker compose down -v

re: clean up

.PHONY: all up down logs clean re

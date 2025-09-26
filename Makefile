.PHONY: up down down-v setup-vault

# Vault セットアップ（単一 compose.yaml / .env 前提）
setup-vault:
	@echo "Setting up Vault..."
	@docker compose -f compose.yaml up -d vault-dev
	@echo "Waiting for Vault to start..."
	@sleep 5
	@echo "Configuring KV v2 secrets engine at path secret/..."
	# 既存のシークレットエンジンがあれば無効化
	@docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=$$(grep VAULT_DEV_ROOT_TOKEN_ID .env | cut -d'=' -f2) vault-dev sh -c 'vault secrets list | grep -q "^secret/" && vault secrets disable secret/ || echo "No existing secret/ mount to disable"'
	@docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=$$(grep VAULT_DEV_ROOT_TOKEN_ID .env | cut -d'=' -f2) vault-dev sh -c 'vault secrets list | grep -q "^agent/" && vault secrets disable agent/ || echo "No existing agent/ mount to disable"'
	# KV v2 シークレットエンジンを有効化
	@docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=$$(grep VAULT_DEV_ROOT_TOKEN_ID .env | cut -d'=' -f2) vault-dev sh -c 'vault secrets enable -path=secret kv-v2 || echo "KV v2 already enabled at path secret/"'
	@echo "Vault setup completed."

# Docker Compose コマンド（単一 compose.yaml）
up: setup-vault
	docker compose -f compose.yaml up

down:
	docker compose -f compose.yaml down

down-v:
	docker compose -f compose.yaml down -v
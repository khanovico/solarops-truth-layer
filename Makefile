.PHONY: dev compose-config test test-rust test-ai test-web build-web fmt-rust

dev:
	docker compose up --build

compose-config:
	docker compose config

test: test-rust test-ai test-web

test-rust:
	cd apps/api-rust && cargo test

fmt-rust:
	cd apps/api-rust && cargo fmt --check

test-ai:
	cd apps/ai-service && pytest

test-web:
	cd apps/web && npm run test -- --run

build-web:
	cd apps/web && npm run build

.PHONY: help console

bash: ## Launch bash in docker container with PHP
	docker run \
		--name=mobx-jwt_console \
		--volume=$(shell pwd):/srv \
		--env USERNAME=$(shell whoami) \
		--env UNIX_UID=$(shell id -u) \
		--env=CONTAINER_SHELL=/bin/bash \
		--env=NODE_ENV=development \
		--workdir=/srv \
		--interactive \
		--tty \
		--rm \
		meuhmeuhconcept/node:1.1 \
		/bin/login -p -f $(shell whoami)

console: ## Launch zsh in docker container with PHP
	docker run \
		--name=mobx-jwt_console \
		--volume=$(shell pwd):/srv \
		--volume=$$HOME/.home-developer:/home/developer \
		--env USERNAME=$(shell whoami) \
		--env UNIX_UID=$(shell id -u) \
		--env=CONTAINER_SHELL=/bin/zsh \
		--env=NODE_ENV=development \
		--workdir=/srv \
		--interactive \
		--tty \
		--rm \
		meuhmeuhconcept/node:1.1 \
		/bin/login -p -f $(shell whoami)

test:
	yarn test --passWithNoTests

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

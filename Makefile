.PHONY: help console

docker-compose.yml:
	cp docker-compose.yml.dist $@

.env:
	cp .env.dist $@
	sed --in-place "s/{your_unix_local_username}/$(shell whoami)/" $@
	sed --in-place "s/{your_unix_local_uid}/$(shell id -u)/" $@

install: docker-compose.yml .env ## Install

start: docker-compose.yml .env ## Launch containers
	docker-compose up -d

stop: ## Stop containers
	docker-compose stop

console: ## Connect to console container
	docker exec -it mobx-jwt_appserver /bin/login -p -f $(shell whoami)

test:
	yarn test --passWithNoTests

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help

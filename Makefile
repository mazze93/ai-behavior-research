.PHONY: install test workbench registry-dev
install:
	cd apps/registry && npm ci
test:
	node --test studies/persona-integrity/tests/registry.test.mjs
	cd studies/identity-dissolution && python3 -m unittest discover -s tests -v
	cd apps/registry && npm test && npm run typecheck
	PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s apps/registry/tests_python -v
	python3 scripts/check_repository.py
workbench:
	python3 scripts/build_workbench.py
registry-dev:
	cd apps/registry && npm run dev

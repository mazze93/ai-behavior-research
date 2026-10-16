.PHONY: install test workbench registry-dev landing
install:
	cd apps/registry && npm ci
	cd apps/landing && npm ci --ignore-scripts
landing:
	cd apps/landing && npm run check && npm run build
test:
	node --test studies/persona-integrity/tests/registry.test.mjs
	cd studies/identity-dissolution && python3 -m unittest discover -s tests -v
	cd apps/registry && npm test && npm run typecheck
	cd apps/landing && npm run check && npm run build
	python3 scripts/stage_landing.py --check
	PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s apps/registry/tests_python -v
	python3 scripts/check_repository.py
workbench:
	python3 scripts/build_workbench.py
registry-dev:
	cd apps/registry && npm run dev

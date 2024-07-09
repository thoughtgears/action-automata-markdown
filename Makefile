.PHONY: test


test:
	act -W __tests__/test.yml --secret-file .env.secrets --var-file .env

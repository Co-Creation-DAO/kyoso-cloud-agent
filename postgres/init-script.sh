#!/bin/bash

set -e
set -u

function create_user_and_database() {
	local database=$1
	local app_user=${database}-application-user
	echo "  Creating user and database '$database'"
	
	# データベースが存在するかチェック
	if psql -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$database"; then
		echo "  Database '$database' already exists, skipping creation"
	else
		psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
			CREATE USER "$app_user" WITH PASSWORD '$APPLICATION_USER_PASSWORD';
			CREATE DATABASE $database;
			\c $database
			ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "$app_user";
		EOSQL
	fi
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo "$POSTGRES_MULTIPLE_DATABASES" | tr ',' ' '); do
		create_user_and_database "$db"
	done
	echo "Multiple databases created"
fi
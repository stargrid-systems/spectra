#!/usr/bin/env bash
set -euo pipefail

run_psql() {
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
}

create_database() {
    local db_name="${1:?}"
    run_psql \
<<EOL
    CREATE DATABASE ${db_name};
    GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO ${POSTGRES_USER};
EOL
}

create_database "authentik"
create_database "spectra"

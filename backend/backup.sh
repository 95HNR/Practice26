#!/bin/bash
DATE=$(date +%Y-%m-%d)
# A Postgres adatbázis dumpolása (cseréld ki az adatbázis nevedre, ha szükséges)
pg_dump drivecheck_db > backup_$DATE.sql
tar -czf backup_$DATE.tar.gz backup_$DATE.sql
rm backup_$DATE.sql
echo "Backup elkészült: backup_$DATE.tar.gz"

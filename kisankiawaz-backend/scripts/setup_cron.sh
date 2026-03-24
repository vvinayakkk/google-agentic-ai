#!/bin/bash
# Cron setup script for KisanKiAwaz nightly jobs

echo "Setting up KisanKiAwaz cron jobs..."

CRON_FILE="/tmp/kisan_cron"

# 2:00 AM IST - Ingestion scripts
echo "00 02 * * * cd /home/ubuntu/kisankiawaz-backend && docker compose exec -T auth-service python /app/scripts/seed_reference_data.py >> /var/log/kisan_ingestion.log 2>&1" > $CRON_FILE

# 2:30 AM IST - Qdrant rebuilding
echo "30 02 * * * cd /home/ubuntu/kisankiawaz-backend && docker compose exec -T agent-service python /app/scripts/generate_qdrant_indexes.py >> /var/log/kisan_qdrant.log 2>&1" >> $CRON_FILE

# 3:00 AM IST - Analytics snapshot
echo "00 03 * * * cd /home/ubuntu/kisankiawaz-backend && docker compose exec -T auth-service python /app/scripts/generate_analytics_snapshots.py >> /var/log/kisan_analytics.log 2>&1" >> $CRON_FILE

crontab $CRON_FILE
rm $CRON_FILE

echo "Cron jobs configured successfully."
crontab -l

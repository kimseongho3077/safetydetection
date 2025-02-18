#!/bin/sh

# Wait for database
echo "Waiting for database..."
while ! nc -z db 3306; do
  sleep 0.1
done
echo "Database started"

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate
python manage.py migrate sessions

# Start server
echo "Starting server..."
python manage.py runserver 0.0.0.0:8090
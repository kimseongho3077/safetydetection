# Use the official Python image from the Docker Hub
FROM python:3.10

# Set environment variables (올바른 형식 적용)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /code

# Install dependencies
COPY requirements.txt /code/
RUN pip install --upgrade pip
RUN pip install --no-cache-dir --use-deprecated=legacy-resolver -r requirements.txt
RUN pip install protobuf==3.20.3

# Copy project
COPY . /code/

# Expose the port the app runs on
EXPOSE 8080

# Run migrations at runtime instead of build time
CMD ["sh", "-c", "python manage.py migrate && python manage.py migrate sessions && python manage.py runserver 0.0.0.0:8090"]

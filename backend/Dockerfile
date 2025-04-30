# Base image with Python and pip
FROM python:3.11-slim

# Install ffmpeg and other dependencies
RUN apt-get update && apt-get install -y ffmpeg git curl build-essential && apt-get clean

# Set the working directory
WORKDIR /app

# Copy all project files into the image
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port your app runs on (Flask defaults to 5000, but we’ll bind gunicorn to 8080)
EXPOSE 8080

# Start the Flask app via Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "300", "--log-level", "debug", "myflaskapp.app:app"]
FROM python:3.9-slim

WORKDIR /app

# Copy the script
COPY process.py /app/process.py

# Run the script when the container starts
ENTRYPOINT ["python", "/app/process.py"]
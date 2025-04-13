FROM python:3.9-slim

WORKDIR /app

# Install required packages with specific versions to ensure compatibility
RUN pip install numpy==1.24.3 pandas==1.5.3

# Copy the script
COPY process.py /app/process.py

# Run the script when the container starts
ENTRYPOINT ["python", "/app/process.py"]
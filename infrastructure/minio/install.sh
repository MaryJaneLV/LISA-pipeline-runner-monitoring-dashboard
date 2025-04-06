#!/bin/bash
set -e

echo "Installing Minio..."

kubectl apply -f ./infrastructure/minio/pv.yaml
kubectl apply -f ./infrastructure/minio/deployment.yaml

# Wait for MinIO deployment to be ready before creating buckets
echo "Waiting for MinIO deployment to be ready..."
kubectl -n scientific-workflow rollout status deployment/minio --timeout=120s

# Apply the bucket creation job
kubectl apply -f ./infrastructure/minio/create-buckets.yaml

echo "Minio installation completed!"
echo "Access Minio Console at: http://localhost:30082"
echo "Username: minioadmin"
echo "Password: minioadmin"
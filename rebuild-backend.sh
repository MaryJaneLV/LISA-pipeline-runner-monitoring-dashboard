#!/bin/bash
# Script to rebuild and redeploy the backend after making changes

set -e  # Exit on any error

echo "Rebuilding backend..."
cd /Users/masalgado/Desktop/my-own-experiment/backend
docker build -t scientific-workflow-backend:latest .

echo "Loading image into Kind cluster..."
kind load docker-image scientific-workflow-backend:latest --name scientific-workflow

echo "Restarting backend deployment..."
kubectl rollout restart deployment backend -n scientific-workflow

echo "Waiting for rollout to complete..."
kubectl rollout status deployment backend -n scientific-workflow

echo "Backend redeployment complete!"

# Wait a moment for the pod to start properly
echo "Waiting for pod to initialize..."
sleep 5

# Get the pod name of the new backend instance
BACKEND_POD=$(kubectl get pods -n scientific-workflow -l app=backend -o jsonpath='{.items[0].metadata.name}')

echo "==================================================="
echo "Showing logs for new backend pod: $BACKEND_POD"
echo "==================================================="
echo "Press Ctrl+C to exit log view"
echo ""

# Stream the logs
kubectl logs -f -n scientific-workflow $BACKEND_POD
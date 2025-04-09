#!/bin/bash
# Script to rebuild and redeploy the frontend after making changes

set -e  # Exit on any error

echo "Rebuilding frontend..."
cd /Users/masalgado/Desktop/my-own-experiment/frontend
docker build -t scientific-workflow-frontend:latest .

echo "Loading image into Kind cluster..."
kind load docker-image scientific-workflow-frontend:latest --name scientific-workflow

echo "Restarting frontend deployment..."
kubectl rollout restart deployment frontend -n scientific-workflow

echo "Waiting for rollout to complete..."
kubectl rollout status deployment frontend -n scientific-workflow

echo "Frontend redeployment complete!"

# Wait a moment for the pod to start properly
echo "Waiting for pod to initialize..."
sleep 5

# Get the pod name of the new frontend instance
FRONTEND_POD=$(kubectl get pods -n scientific-workflow -l app=frontend -o jsonpath='{.items[0].metadata.name}')

echo "==================================================="
echo "Pod info for new frontend pod: $FRONTEND_POD"
echo "==================================================="
kubectl describe pod $FRONTEND_POD -n scientific-workflow

echo ""
echo "Frontend URL: http://localhost:30080"
echo ""
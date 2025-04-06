#!/bin/bash
set -e

echo "Installing Kafdrop..."

kubectl apply -f ./infrastructure/kafdrop/deployment.yaml

# Wait for deployment to be ready
echo "Waiting for Kafdrop deployment to be ready..."
kubectl wait --namespace scientific-workflow --for=condition=available deployment/kafdrop --timeout=120s

# Setup port-forwarding in background
echo "Setting up port-forwarding for Kafdrop on port 9000..."
nohup kubectl -n scientific-workflow port-forward svc/kafdrop 9000:9000 > /dev/null 2>&1 &

echo "Kafdrop installation completed! Access the UI at: http://localhost:9000"
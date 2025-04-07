#!/bin/bash
set -e

echo "Installing Kafdrop..."

kubectl apply -f ./infrastructure/kafdrop/deployment.yaml

# Wait for deployment to be ready
echo "Waiting for Kafdrop deployment to be ready..."
kubectl wait --namespace scientific-workflow --for=condition=available deployment/kafdrop --timeout=240s

echo "Kafdrop installation completed!"
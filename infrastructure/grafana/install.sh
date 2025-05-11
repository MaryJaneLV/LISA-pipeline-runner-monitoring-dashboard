#!/bin/bash

echo "Installing Grafana..."

# Create the dashboard ConfigMap with the JSON content
kubectl create configmap grafana-dashboards \
  --from-file=argo-workflows.json=infrastructure/grafana/argo-workflows.json \
  -n scientific-workflow \
  --dry-run=client -o yaml | kubectl apply -f -

# Apply all Grafana configurations
kubectl apply -f infrastructure/grafana/dashboard-provider.yaml
kubectl apply -f infrastructure/grafana/deployment.yaml

# Wait for Grafana to be ready
echo "Waiting for Grafana to be ready..."
kubectl rollout status deployment/grafana -n scientific-workflow --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n scientific-workflow --timeout=300s

echo "Grafana is ready!"

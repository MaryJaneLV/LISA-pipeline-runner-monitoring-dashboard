#!/bin/bash

echo "Installing Prometheus..."

kubectl apply -f ./infrastructure/prometheus/deployment.yaml

echo "Waiting for Prometheus to be ready..."
kubectl rollout status deployment/prometheus -n scientific-workflow --timeout=300s
kubectl wait --for=condition=ready pod -l app=prometheus -n scientific-workflow --timeout=300s

echo "Prometheus is ready!"

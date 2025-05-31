#!/bin/bash

# helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
# helm repo update

# helm install prometheus \
#   prometheus-community/kube-prometheus-stack \
#   --namespace scientific-workflow \
#   --create-namespace


# kubectl apply -f ./infrastructure/prometheus/deployment.yaml

# echo "Waiting for Prometheus to be ready..."
# kubectl rollout status deployment/prometheus -n scientific-workflow --timeout=300s
# kubectl wait --for=condition=ready pod -l app=prometheus -n scientific-workflow --timeout=300s

# kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

echo "Installing Prometheus Operator..."

# Add and update the Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack with custom values
helm upgrade --install prometheus \
  prometheus-community/kube-prometheus-stack \
  --namespace scientific-workflow \
  --values ./infrastructure/prometheus/values.yaml

# Wait for Prometheus pods (managed by the Operator) to be ready
echo "Waiting for Prometheus pods to be ready..."
# kubectl rollout status statefulset/prometheus-prometheus-kube-prometheus-prometheus -n scientific-workflow --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n scientific-workflow --timeout=300s

# Optional: apply metrics-server if not already installed
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# kubectl apply -f ./infrastructure/prometheus/argo-workflow-rules.yaml

kubectl apply -f ./infrastructure/prometheus/services/kube-scheduler-service.yaml
kubectl apply -f ./infrastructure/prometheus/services/kube-scheduler-servicemonitor.yaml

echo "Prometheus Operator is ready!"

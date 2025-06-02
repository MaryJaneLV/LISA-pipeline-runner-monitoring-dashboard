#!/bin/bash

echo "Installing Grafana..."


# Create the dashboard ConfigMap with the JSON content
kubectl create configmap grafana-dashboards \
  --from-file=main-dashboard.json=infrastructure/grafana/dashboards/main-dashboard.json \
  --from-file=argo-dashboard.json=infrastructure/grafana/dashboards/argo-dashboard.json \
  --from-file=k8s.json=infrastructure/grafana/dashboards/k8s.json \
  --from-file=historic-dashboard.json=infrastructure/grafana/dashboards/historic-dashboard.json \
  -n scientific-workflow \
  --dry-run=client -o yaml | kubectl apply -f -

# Apply all Grafana configurations
kubectl apply -f infrastructure/grafana/dashboard-provider.yaml
kubectl apply -f infrastructure/grafana/deployment.yaml

# install Grafana Loki for logs
# helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm upgrade --install loki grafana/loki-stack \
  --namespace scientific-workflow \
  --set grafana.enabled=false \
  --set prometheus.enabled=false \
  --set promtail.enabled=true

# Wait for Grafana to be ready
echo "Waiting for Grafana to be ready..."
kubectl rollout status deployment/grafana -n scientific-workflow --timeout=300s
kubectl wait --for=condition=ready pod -l app=grafana -n scientific-workflow --timeout=300s

echo "Grafana is ready!"

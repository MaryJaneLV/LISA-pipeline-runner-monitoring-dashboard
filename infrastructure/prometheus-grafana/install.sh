#!/bin/bash
set -e

echo "Installing Prometheus and Grafana..."

# Add the Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring 2>/dev/null || true

# Install Prometheus
echo "Installing Prometheus..."
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.service.type=NodePort \
  --set prometheus.service.nodePort=30090 \
  --set grafana.service.type=NodePort \
  --set grafana.service.nodePort=30091 \
  --set grafana.adminPassword=admin \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false

echo "Waiting for Prometheus and Grafana to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=prometheus -n monitoring --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=prometheus,app.kubernetes.io/name=grafana -n monitoring --timeout=300s


echo "ServiceMonitor CRD created, waiting for it to be established..."
kubectl wait --for condition=established --timeout=60s crd/servicemonitors.monitoring.coreos.com

echo "Prometheus and Grafana installation completed!"
echo
echo "Access the following services:"
echo "Prometheus UI: http://localhost:30090"
echo "Grafana UI:    http://localhost:30091 (admin/admin)" 
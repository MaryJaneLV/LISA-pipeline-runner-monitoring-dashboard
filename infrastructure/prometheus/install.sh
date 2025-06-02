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
# helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
# helm repo update

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

echo "Creating Thanos object storage secret..."
kubectl delete secret thanos-objstore-config -n scientific-workflow --ignore-not-found
kubectl create secret generic thanos-objstore-config \
  --from-file=objstore.yml=./infrastructure/prometheus/objstore.yml \
  -n scientific-workflow

echo "Installing Thanos components..."

# Add Thanos Helm chart repo
# helm repo add bitnami https://charts.bitnami.com/bitnami
# helm repo update

# Install Thanos components
helm upgrade --install thanos bitnami/thanos \
  -n scientific-workflow \
  -f ./infrastructure/prometheus/thanos-values.yaml

echo "Waiting for Thanos components to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=thanos-query -n scientific-workflow --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=thanos-storegateway -n scientific-workflow --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=thanos-compactor -n scientific-workflow --timeout=300s

echo "Thanos is installed and integrated with Prometheus!"
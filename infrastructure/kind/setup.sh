#!/bin/bash
set -e

echo "Setting up Scientific Workflow Pipeline Runner..."

# Install Kind if not installed
if ! command -v kind &> /dev/null; then
  echo "Installing Kind..."
  brew install kind
else
  echo "Kind already installed"
fi

# Install kubectl if not installed
if ! command -v kubectl &> /dev/null; then
  echo "Installing kubectl..."
  brew install kubectl
else
  echo "kubectl already installed"
fi

# Install Helm if not installed
if ! command -v helm &> /dev/null; then
  echo "Installing Helm..."
  brew install helm
else
  echo "Helm already installed"
fi

# Create Kind configuration
cat > kind-config.yaml << EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 30080 # Argo UI
    hostPort: 30080
  - containerPort: 30081 # Kubernetes Dashboard
    hostPort: 30081
  - containerPort: 30082 # Minio Console
    hostPort: 30082
  - containerPort: 30083 # Backend API
    hostPort: 30083
  - containerPort: 30084 # Frontend
    hostPort: 30084
  extraMounts:
  - hostPath: ./data
    containerPath: /data
EOF

# Create data directory for persistent storage
mkdir -p data

# Create Kind cluster
echo "Creating Kind cluster..."
kind create cluster --name scientific-workflow --config kind-config.yaml

# Create namespace
echo "Creating namespace..."
kubectl create namespace scientific-workflow

# Create service account and cluster role binding for the workflow executor
echo "Setting up service accounts and roles..."
kubectl create serviceaccount workflow-executor -n scientific-workflow
kubectl create clusterrolebinding workflow-executor-binding --clusterrole=cluster-admin --serviceaccount=scientific-workflow:workflow-executor

echo "Kind cluster setup completed!"
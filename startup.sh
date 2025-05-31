#!/bin/bash
set -e

echo "Starting Scientific Workflow Pipeline Runner..."

# Function to check if command exists
check_command() {
  if ! command -v $1 &> /dev/null; then
    echo "Error: $1 is not installed. Please install it and try again."
    exit 1
  fi
}

# Check required commands
check_command docker
check_command kind
check_command kubectl
check_command helm

# Create kind cluster with the correct configuration
echo "Setting up Kind cluster..."
chmod +x ./infrastructure/kind/setup.sh
./infrastructure/kind/setup.sh

# Create the scientific-workflow namespace
kubectl create namespace scientific-workflow 2>/dev/null || true

# Label nodes with k8s-app=kubelet
echo "🏷️ Labeling nodes..."
for node in $(kubectl get nodes -o name); do
  kubectl label $node k8s-app=kubelet --overwrite
done


# Build and load Docker images to Kind
# echo "Building and loading Docker images..."
# docker build -t scientific-workflow-backend:latest ./backend
# docker build -t scientific-workflow-frontend:latest ./frontend

# kind load docker-image scientific-workflow-backend:latest --name scientific-workflow
# kind load docker-image scientific-workflow-frontend:latest --name scientific-workflow

# Install Kubernetes Dashboard
echo "Installing Kubernetes Dashboard..."
chmod +x ./infrastructure/dashboard/install.sh
./infrastructure/dashboard/install.sh

# Install Prometheus
echo "Installing Prometheus..."
chmod +x ./infrastructure/prometheus/install.sh
./infrastructure/prometheus/install.sh

# Install Minio
echo "Installing Minio..."
chmod +x ./infrastructure/minio/install.sh
./infrastructure/minio/install.sh

# Install Argo Workflows
echo "Installing Argo Workflows..."
chmod +x ./infrastructure/argo/install.sh
./infrastructure/argo/install.sh

# Install Kafka
# echo "Installing Kafka..."
# chmod +x ./infrastructure/kafka/install.sh
# ./infrastructure/kafka/install.sh

# Install Kafdrop
# echo "Installing Kafdrop..."
# chmod +x ./infrastructure/kafdrop/install.sh
# ./infrastructure/kafdrop/install.sh

# Install MongoDB
# echo "Installing MongoDB..."
# chmod +x ./infrastructure/mongo/install.sh
# ./infrastructure/mongo/install.sh

# Install Mongo Express
# echo "Installing Mongo Express..."
# chmod +x ./infrastructure/mongo-express/install.sh
# ./infrastructure/mongo-express/install.sh

# Install Grafana
echo "Installing Grafana..."
chmod +x ./infrastructure/grafana/install.sh
./infrastructure/grafana/install.sh

# Deploy backend
# echo "Deploying backend..."
# kubectl apply -f ./infrastructure/backend/deployment.yaml

# Deploy frontend
# echo "Deploying frontend..."
# kubectl apply -f ./infrastructure/frontend/deployment.yaml

# echo "Waiting for all services to be ready..."
# kubectl wait --for=condition=ready pod -l app=backend -n scientific-workflow --timeout=300s
# kubectl wait --for=condition=ready pod -l app=frontend -n scientific-workflow --timeout=300s

# Install Argo Events
echo "Installing Argo Events..."
chmod +x ./infrastructure/argo-events/install.sh
./infrastructure/argo-events/install.sh

nohup kubectl -n scientific-workflow port-forward svc/argo-server 2746:2746 &
# nohup kubectl -n scientific-workflow port-forward svc/kafdrop 9032:9000 &
# nohup kubectl -n scientific-workflow port-forward svc/mongo-express 9087:8081 &
nohup kubectl -n scientific-workflow port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 &
nohup kubectl -n scientific-workflow port-forward svc/workflow-controller-metrics 9091:9090 &
nohup kubectl -n scientific-workflow port-forward svc/grafana 8080:3000 &
echo
echo "Token for accessing Kubernetes Dashboard:"
kubectl -n kubernetes-dashboard create token admin-user
echo
echo "Scientific Workflow Pipeline Runner is now running!"
echo
echo "Access the following services:"
echo "Argo Workflows UI:       http://localhost:2746"
echo "Kubernetes Dashboard:    https://localhost:30081 (Access with token printed above)"
echo "Minio Console:           http://localhost:30082 (minioadmin/minioadmin)"
echo "Mongo Express:           http://localhost:9087"
echo "Kaftdrop                 http://localhost:9032"
echo "Pipeline Runner API:     http://localhost:30083"
echo "Pipeline Runner UI:      http://localhost:30084"
echo "Prometheus UI:           http://localhost:9090"
echo "Grafana UI:              http://localhost:3000 (admin/admin)"
echo
echo "To shut down the system, run: kind delete cluster --name scientific-workflow"
#!/bin/bash
set -e

echo "Installing Kubernetes Dashboard..."

# Install Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.0/aio/deploy/recommended.yaml

kubectl apply -f ./infrastructure//dashboard/admin.yaml

kubectl patch svc kubernetes-dashboard -n kubernetes-dashboard --patch "$(cat ./infrastructure//dashboard/service-patch.yaml)"

# Create the token for authentication
kubectl -n kubernetes-dashboard create token admin-user

echo "Dashboard installation completed!"
echo "Access the Dashboard at: https://localhost:30081"
echo "Use the token printed above to authenticate"
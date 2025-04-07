#!/bin/bash
set -e

echo "Installing Argo Workflows..."

kubectl apply -f infrastructure/argo/install.yaml
kubectl patch svc argo-server -n scientific-workflow --patch "$(cat ./infrastructure/argo/server-patch.yaml)"

echo "Argo Workflows installation completed!"
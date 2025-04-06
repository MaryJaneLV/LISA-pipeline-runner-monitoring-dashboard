#!/bin/bash
set -e

echo "Installing Argo Workflows..."

kubectl apply -f infrastructure/argo/install.yaml
kubectl patch svc argo-server -n scientific-workflow --patch "$(cat ./infrastructure/argo/server-patch.yaml)"
nohup kubectl -n scientific-workflow port-forward svc/argo-server 2746:2746 &

echo "Argo Workflows installation completed!"
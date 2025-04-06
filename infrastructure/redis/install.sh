#!/bin/bash
set -e

echo "Installing Redis..."

kubectl apply -f ./infrastructure/redis/deployment.yaml

echo "Redis installation completed!"
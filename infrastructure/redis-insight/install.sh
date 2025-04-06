#!/bin/bash
set -e

echo "Installing Redis Insight..."

kubectl apply -f ./infrastructure/redis-insight/deployment.yaml

echo "Redis insight installation completed!"
#!/bin/bash
set -e

echo "Installing Kafka..."

kubectl apply -f ./infrastructure/kafka/deployment.yaml

echo "Kafka installation completed!"
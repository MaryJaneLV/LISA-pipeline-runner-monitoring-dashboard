#!/bin/bash
set -e
echo "Installing Argo Events"

# Ensure the namespace exists
kubectl create namespace scientific-workflow --dry-run=client -o yaml | kubectl apply -f -

# Install the CRDs and controller
kubectl apply -f infrastructure/argo-events/install.yaml
echo "Waiting for Argo Events controller to be ready..."
kubectl rollout status deployment/controller-manager -n scientific-workflow --timeout=2m

# Apply RBAC
kubectl apply -f infrastructure/argo-events/rbac.yaml
echo "Applied RBAC rules"

# Create EventBus
kubectl apply -f infrastructure/argo-events/eventbus.yaml
echo "Created EventBus, waiting for it to be processed..."
sleep 15

# Create the EventSource
kubectl apply -f infrastructure/argo-events/eventsource-kafka.yaml
echo "Created EventSource, waiting for it to be processed..."
sleep 10

# Create the Sensors
kubectl apply -f infrastructure/argo-events/sensors.yaml
echo "Created Sensors"

echo "Argo Events installation complete!"
echo "To verify, check the status of the resources:"
echo "kubectl get eventbus,eventsources,sensors -n scientific-workflow"
echo ""
echo "To watch for workflow events being published to Kafka:"
echo "kubectl run kafka-consumer -it --rm --image=bitnami/kafka:3.4 -- kafka-console-consumer.sh --bootstrap-server kafka.scientific-workflow.svc:9092 --topic workflow-status --from-beginning"
echo ""
echo "To trigger a workflow via Kafka:"
echo "kubectl run kafka-producer -it --rm --image=bitnami/kafka:3.4 -- kafka-console-producer.sh --broker-list kafka.scientific-workflow.svc:9092 --topic workflow-triggers"
echo "Then enter a JSON message like: {\"message\": \"Run my workflow\", \"workflow_name\": \"my-workflow-\"}"
# Argo Events Integration with Kafka

This directory contains configuration files to set up Argo Events to work with Kafka and Argo Workflows.

## Architecture Overview

The setup establishes a bidirectional integration between Argo Workflows and Kafka:

1. **Workflow Events to Kafka**: Any change to Argo Workflows (creation, updates, completion) is automatically detected and published to a Kafka topic (`workflow-status`).

2. **Kafka to Workflow Triggers**: Messages sent to a specific Kafka topic (`workflow-triggers`) can automatically trigger new Argo Workflows.

## Components

1. **EventBus**: Uses Kafka as the event transport system for Argo Events
2. **EventSource**: 
   - Resource EventSource: Watches for Argo Workflow status changes
   - Kafka EventSource: Listens for incoming events from Kafka to trigger workflows
3. **Sensors**:
   - Workflow Events Sensor: Forwards workflow events to Kafka
   - Workflow Trigger Sensor: Creates workflows based on Kafka events

## Configuration Files

- `eventbus.yaml`: Configures Kafka as the EventBus
- `eventsource-kafka.yaml`: Sets up event sources (watching workflow events and listening to Kafka)
- `sensors.yaml`: Defines how to respond to events (publishing to Kafka and triggering workflows)
- `rbac.yaml`: RBAC permissions for Argo Events components
- `install.sh`: Installation script

## Installation

Run the install script to set up all the components:

```bash
./infrastructure/argo-events/install.sh
```

## Usage

### Watching Workflow Events in Kafka

Workflow status events are automatically published to the `workflow-status` Kafka topic. To watch these events:

```bash
kubectl run kafka-consumer -it --rm --image=bitnami/kafka:3.4 -- \
kafka-console-consumer.sh --bootstrap-server kafka.scientific-workflow.svc:9092 \
--topic workflow-status --from-beginning
```

You'll see JSON messages containing workflow status information whenever a workflow is created, updated, or completed.

### Triggering Workflows from Kafka

To trigger a workflow by sending a message to Kafka:

```bash
kubectl run kafka-producer -it --rm --image=bitnami/kafka:3.4 -- \
kafka-console-producer.sh --broker-list kafka.scientific-workflow.svc:9092 \
--topic workflow-triggers
```

Then enter a JSON message like:
```json
{"message": "Run my workflow", "workflow_name": "my-workflow-"}
```

This will trigger a new workflow with the name prefix specified in "workflow_name" and pass the message as a parameter to the workflow.

## Troubleshooting

If you encounter issues, check the logs of the event source and sensor pods:

```bash
kubectl logs -l eventsource-name=kafka-source -n scientific-workflow
kubectl logs -l sensor-name=workflow-events-kafka-sensor -n scientific-workflow
kubectl logs -l sensor-name=kafka-workflow-trigger-sensor -n scientific-workflow
```
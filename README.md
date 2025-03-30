# Scientific Workflow Pipeline Runner

A comprehensive platform for running scientific workflows in a Kubernetes environment.

## Overview

The Scientific Workflow Pipeline Runner is a complete solution for creating, managing, and monitoring scientific workflows. It provides:

- Argo Workflows for pipeline execution and DAG-based workflow management
- Minio object storage for scientific data and results
- Redis-based event bus for real-time system communication
- Node.js REST API for workflow management
- React frontend for user interaction
- Kubernetes-based infrastructure with one-command deployment

## Architecture

![Architecture Diagram](docs/architecture.png)

The system consists of the following components:

1. **Infrastructure**
   - Kind local Kubernetes cluster
   - Argo Workflows for workflow execution
   - Kubernetes Dashboard for cluster monitoring
   - Minio for object storage
   - Redis for event messaging

2. **Backend**
   - Node.js / Express REST API
   - MongoDB for data persistence
   - Socket.IO for real-time updates

3. **Frontend**
   - React-based user interface
   - Material-UI component library
   - WebSocket connection for real-time updates

## Prerequisites

- Docker (20.10+)
- Kind (0.17+)
- kubectl (1.25+)
- Helm (3.9+)
- Node.js (18+) - for local development only

## Quick Start

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/scientific-workflow.git
   cd scientific-workflow
   ```

2. Start the system using the one-command startup script:
   ```
   chmod +x startup.sh
   ./startup.sh
   ```

3. Once the system is running, you can access:
   - Scientific Workflow UI: http://localhost:30084
   - Argo Workflows UI: http://localhost:30080
   - Kubernetes Dashboard: https://localhost:30081
   - Minio Console: http://localhost:30082
   - Scientific Workflow API: http://localhost:30083

4. Register a new user in the Scientific Workflow UI to get started

## Development Setup

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Creating Workflows

1. Log in to the Scientific Workflow UI
2. Navigate to "Templates" and create a new template or use an existing one
3. Navigate to "Create Workflow"
4. Select a template and provide the required parameters
5. Submit the workflow

## Workflow Examples

The system comes with a sample workflow template for data processing. The workflow:

1. Fetches data from a URL
2. Validates the data
3. Processes the data based on parameters
4. Analyzes results
5. Stores results in Minio

## Deployment Options

### Local Development

Use Docker Compose for local development:

```bash
docker-compose up -d
```

### Kubernetes Deployment

The system can be deployed to any Kubernetes cluster using the provided manifests:

```bash
kubectl apply -f kubernetes/
```

### Customizing Deployment

To customize the deployment, modify the following:

- `infrastructure/kind/setup.sh` - Kind cluster configuration
- `kubernetes/` - Kubernetes manifests
- `docker-compose.yml` - Docker Compose configuration

## License

MIT
#!/bin/bash
set -e

echo "Installing Argo Workflows..."

# Apply the modified manifest
echo "Applying Argo Workflows manifest..."
kubectl apply -f infrastructure/argo/install.yaml



kubectl patch svc argo-server -n scientific-workflow --patch "$(cat ./infrastructure/argo/server-patch.yaml)"

# Create ConfigMap for artifact repository
echo "Creating artifact repository configuration..."
cat > artifact-repositories.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: artifact-repositories
  namespace: scientific-workflow
data:
  default-v1: |
    archiveLogs: true
    s3:
      bucket: workflow-artifacts
      endpoint: minio:9000
      insecure: true
      accessKeySecret:
        name: minio-credentials
        key: accesskey
      secretKeySecret:
        name: minio-credentials
        key: secretkey
EOF

kubectl apply -f artifact-repositories.yaml

# Create Secret for Minio credentials (placeholder until Minio is installed)
echo "Creating Minio credentials secret..."
cat > minio-credentials.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: minio-credentials
  namespace: scientific-workflow
type: Opaque
stringData:
  accesskey: minioadmin
  secretkey: minioadmin
EOF

kubectl apply -f minio-credentials.yaml

echo "Argo Workflows installation completed!"
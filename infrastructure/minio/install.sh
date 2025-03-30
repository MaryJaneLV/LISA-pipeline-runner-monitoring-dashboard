#!/bin/bash
set -e

echo "Installing Minio..."

# Create persistent volume and claim for Minio
cat > minio-pv.yaml << EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: minio-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /data/minio
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-pvc
  namespace: scientific-workflow
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
EOF

kubectl apply -f minio-pv.yaml

# Create Minio deployment
cat > minio-deployment.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: scientific-workflow
spec:
  selector:
    matchLabels:
      app: minio
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        args:
        - server
        - /data
        - --console-address
        - ":9001"
        env:
        - name: MINIO_ROOT_USER
          value: "minioadmin"
        - name: MINIO_ROOT_PASSWORD
          value: "minioadmin"
        ports:
        - containerPort: 9000
          name: api
        - containerPort: 9001
          name: console
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: minio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: scientific-workflow
spec:
  type: ClusterIP
  ports:
  - port: 9000
    targetPort: 9000
    protocol: TCP
    name: api
  - port: 9001
    targetPort: 9001
    protocol: TCP
    name: console
  selector:
    app: minio
---
apiVersion: v1
kind: Service
metadata:
  name: minio-console
  namespace: scientific-workflow
spec:
  type: NodePort
  ports:
  - port: 9001
    targetPort: 9001
    nodePort: 30082
  selector:
    app: minio
EOF

kubectl apply -f minio-deployment.yaml

# Create Minio client job to create buckets
cat > minio-create-buckets.yaml << EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: minio-create-buckets
  namespace: scientific-workflow
spec:
  ttlSecondsAfterFinished: 100
  template:
    spec:
      containers:
      - name: mc
        image: minio/mc:latest
        command: ["/bin/sh", "-c"]
        args:
        - |
          # Wait for MinIO to be available
          until mc alias set myminio http://minio:9000 minioadmin minioadmin; do
            echo "Waiting for MinIO to be available..."
            sleep 5
          done
          mc mb --ignore-existing myminio/workflow-artifacts;
          mc mb --ignore-existing myminio/workflow-inputs;
          mc mb --ignore-existing myminio/workflow-outputs;
          mc admin user add myminio workflow-user workflow-password;
          mc admin policy attach myminio readwrite --user workflow-user;
      restartPolicy: Never
  backoffLimit: 2
EOF

# Wait for MinIO deployment to be ready before creating buckets
echo "Waiting for MinIO deployment to be ready..."
kubectl -n scientific-workflow rollout status deployment/minio --timeout=120s

# Apply the bucket creation job
kubectl apply -f minio-create-buckets.yaml

echo "Minio installation completed!"
echo "Access Minio Console at: http://localhost:30082"
echo "Username: minioadmin"
echo "Password: minioadmin"
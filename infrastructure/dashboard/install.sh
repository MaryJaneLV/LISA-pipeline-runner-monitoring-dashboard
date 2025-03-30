#!/bin/bash
set -e

echo "Installing Kubernetes Dashboard..."

# Install Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.5.0/aio/deploy/recommended.yaml

# Create service account for dashboard
cat > dashboard-admin.yaml << EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
subjects:
  - kind: ServiceAccount
    name: admin-user
    namespace: kubernetes-dashboard
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
EOF

kubectl apply -f dashboard-admin.yaml

# Patch Dashboard service to use NodePort
cat > dashboard-service-patch.yaml << EOF
spec:
  type: NodePort
  ports:
  - port: 443
    targetPort: 8443
    nodePort: 30081
EOF

kubectl patch svc kubernetes-dashboard -n kubernetes-dashboard --patch "$(cat dashboard-service-patch.yaml)"

# Create the token for authentication
kubectl -n kubernetes-dashboard create token admin-user

echo "Dashboard installation completed!"
echo "Access the Dashboard at: https://localhost:30081"
echo "Use the token printed above to authenticate"
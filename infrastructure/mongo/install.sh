echo "Setting up MongoDB..."
kubectl apply -f ./infrastructure/mongo/deployment.yaml

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -l app=mongo -n scientific-workflow --timeout=300s
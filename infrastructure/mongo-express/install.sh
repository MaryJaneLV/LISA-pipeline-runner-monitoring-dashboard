

echo "Setting up Mongo Express..."
kubectl apply -f ./infrastructure/mongo-express/deployment.yaml

# Wait for MongoDB to be ready
echo "Waiting for Mongo Express to be ready..."
kubectl wait --for=condition=ready pod -l app=mongo-express -n scientific-workflow --timeout=300s
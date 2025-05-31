start:
	./startup.sh

stop:
	kind delete cluster --name scientific-workflow

grafana:
	kubectl apply -f infrastructure/grafana/dashboard.yaml
	kubectl apply -f infrastructure/grafana/dashboard-provider.yaml
	kubectl apply -f infrastructure/grafana/deployment.yaml
	kubectl rollout restart deployment/grafana -n scientific-workflow
	kubectl wait --for=condition=ready pod -l app=grafana -n scientific-workflow --timeout=300s

prometheus:
	kubectl apply -f infrastructure/prometheus/deployment.yaml
	kubectl rollout restart deployment/prometheus -n scientific-workflow
	kubectl wait --for=condition=ready pod -l app=prometheus -n scientific-workflow --timeout=300s


backend:
	./rebuild-backend.sh

frontend:
	./rebuild-frontend.sh
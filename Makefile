start:
	./startup.sh

stop:
	kind delete cluster --name scientific-workflow


backend:
	./rebuild-backend.sh

frontend:
	./rebuild-frontend.sh
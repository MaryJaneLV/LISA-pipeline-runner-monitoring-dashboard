# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style Guidelines
- Backend: Node.js/Express, MongoDB/Mongoose, JWT/Passport, Winston
  - MVC architecture with controllers, models, services
  - Joi for request validation
  - Express middleware pattern
- Frontend: React 18 (functional), Material-UI components
  - Formik/Yup for form validation
  - Axios for API communication
  - Context API for state management
  - Socket.IO for real-time features

This what we call a pipeline runner. A solution for running scientific workflows, which integrates Argo workflows for acutally running the workflows, minio s3 for artifacts storages, argo events for real time updates, kafka for the event bus, mongoDB for persistent data like users, backend to centralize all the logic related to the previous modules and a frontend to provide a GUI easy to use. All this is deployed locally using kind (k8s in docker)
const axios = require('axios');
const config = require('../config');

class ArgoService {
  constructor() {
    this.client = axios.create({
      baseURL: config.argo.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async submitWorkflow(workflow, namespace = config.argo.namespace) {
    try {
      console.log('[ArgoService] Submitting workflow in namespace:', namespace);

      // Check if we're submitting a workflow from a template
      let requestBody;

      if (workflow.workflowTemplateRef) {
        // If submitting from a template reference
        console.log(
          '[ArgoService] Submitting from template reference:',
          workflow.workflowTemplateRef
        );
        requestBody = {
          workflow: {
            metadata: workflow.metadata || {
              generateName: 'workflow-from-template-',
            },
            spec: {
              workflowTemplateRef: workflow.workflowTemplateRef,
              arguments: workflow.arguments,
            },
          },
        };
      } else {
        // If submitting a complete workflow
        console.log('[ArgoService] Submitting complete workflow manifest');
        requestBody = {
          workflow: workflow,
        };
      }

      console.log(
        '[ArgoService] Sending request body:',
        JSON.stringify(requestBody, null, 2)
      );

      const response = await this.client.post(
        `/api/v1/workflows/${namespace}`,
        requestBody
      );

      console.log(
        '[ArgoService] Workflow submitted successfully:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error) {
      console.error('[ArgoService] Error in submitWorkflow:', error.message);
      if (error.response) {
        console.error('[ArgoService] Response status:', error.response.status);
        console.error(
          '[ArgoService] Response data:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
      this._handleError(error);
    }
  }

  async getWorkflow(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.get(
        `/api/v1/workflows/${namespace}/${name}`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async listWorkflows(params = {}, namespace = config.argo.namespace) {
    try {
      const response = await this.client.get(`/api/v1/workflows/${namespace}`, {
        params,
      });
      return response.data.items || [];
    } catch (error) {
      this._handleError(error);
    }
  }

  async deleteWorkflow(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.delete(
        `/api/v1/workflows/${namespace}/${name}`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async terminateWorkflow(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.put(
        `/api/v1/workflows/${namespace}/${name}/terminate`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async suspendWorkflow(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.put(
        `/api/v1/workflows/${namespace}/${name}/suspend`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async resumeWorkflow(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.put(
        `/api/v1/workflows/${namespace}/${name}/resume`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async resubmitWorkflow(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.put(
        `/api/v1/workflows/${namespace}/${name}/resubmit`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async getWorkflowLogs(name, namespace = config.argo.namespace) {
    try {
      console.log(
        '[ArgoService] Fetching logs for workflow:',
        `/api/v1/workflows/${namespace}/${name}/log`
      );
      const response = await this.client.get(
        `/api/v1/workflows/${namespace}/${name}/log?logOptions.container=main&grep=&logOptions.follow=true`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async listWorkflowTemplates(namespace = config.argo.namespace) {
    try {
      const response = await this.client.get(
        `/api/v1/workflow-templates/${namespace}`
      );
      return response.data.items || [];
    } catch (error) {
      this._handleError(error);
    }
  }

  async getWorkflowTemplate(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.get(
        `/api/v1/workflow-templates/${namespace}/${name}`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  async createWorkflowTemplate(template, namespace = config.argo.namespace) {
    try {
      console.log(
        '[ArgoService] Creating workflow template in namespace:',
        namespace
      );
      console.log(
        '[ArgoService] Template object:',
        JSON.stringify(template, null, 2)
      );

      // According to Argo API documentation, we need to structure the request properly
      // The API expects the template to be in the 'template' field of the request body
      const requestBody = {
        template: template,
      };

      console.log(
        '[ArgoService] Sending request body:',
        JSON.stringify(requestBody, null, 2)
      );

      const response = await this.client.post(
        `/api/v1/workflow-templates/${namespace}`,
        requestBody
      );

      console.log(
        '[ArgoService] Successful response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error) {
      console.error(
        '[ArgoService] Error in createWorkflowTemplate:',
        error.message
      );
      if (error.response) {
        console.error('[ArgoService] Response status:', error.response.status);
        console.error(
          '[ArgoService] Response data:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
      this._handleError(error);
    }
  }

  async updateWorkflowTemplate(
    name,
    template,
    namespace = config.argo.namespace
  ) {
    try {
      console.log(
        `[ArgoService] Updating workflow template "${name}" in namespace:`,
        namespace
      );

      // First, get the current template to get its resourceVersion
      console.log(
        `[ArgoService] Fetching current template "${name}" to get resourceVersion`
      );
      const currentTemplate = await this.getWorkflowTemplate(name, namespace);

      if (!currentTemplate) {
        throw new Error(`Template "${name}" not found`);
      }

      const resourceVersion = currentTemplate.metadata.resourceVersion;
      console.log(`[ArgoService] Got resourceVersion: ${resourceVersion}`);

      // Ensure template has the resourceVersion in its metadata
      if (!template.metadata) {
        template.metadata = {};
      }
      template.metadata.resourceVersion = resourceVersion;

      console.log(
        '[ArgoService] Template object with resourceVersion:',
        JSON.stringify(template, null, 2)
      );

      // According to Argo API documentation, we need to structure the request properly
      // The API expects the template to be in the 'template' field of the request body
      const requestBody = {
        template: template,
      };

      console.log(
        '[ArgoService] Sending request body:',
        JSON.stringify(requestBody, null, 2)
      );

      const response = await this.client.put(
        `/api/v1/workflow-templates/${namespace}/${name}`,
        requestBody
      );

      console.log(
        '[ArgoService] Successful response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error) {
      console.error(
        `[ArgoService] Error in updateWorkflowTemplate for "${name}":`,
        error.message
      );
      if (error.response) {
        console.error('[ArgoService] Response status:', error.response.status);
        console.error(
          '[ArgoService] Response data:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
      this._handleError(error);
    }
  }

  async deleteWorkflowTemplate(name, namespace = config.argo.namespace) {
    try {
      const response = await this.client.delete(
        `/api/v1/workflow-templates/${namespace}/${name}`
      );
      return response.data;
    } catch (error) {
      this._handleError(error);
    }
  }

  _handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      throw new Error(`Argo API returned ${status}: ${JSON.stringify(data)}`);
    } else if (error.request) {
      throw new Error(`No response received from Argo API: ${error.message}`);
    } else {
      throw new Error(`Error setting up request to Argo API: ${error.message}`);
    }
  }
}

module.exports = new ArgoService();

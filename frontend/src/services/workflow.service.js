import api from './api';

/**
 * Service for managing workflows
 */
const WorkflowService = {
  /**
   * Get all workflows with optional filters
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Workflows and pagination data
   */
  getWorkflows: async (params = {}) => {
    const response = await api.get('/api/workflows', { params });
    return response.data;
  },

  /**
   * Get a workflow by ID
   * @param {String} id - Workflow ID
   * @returns {Promise<Object>} - Workflow and Argo data
   */
  getWorkflow: async (id) => {
    const response = await api.get(`/api/workflows/${id}`);
    return response.data;
  },

  /**
   * Create a new workflow
   * @param {Object} workflow - Workflow data
   * @returns {Promise<Object>} - Created workflow
   */
  createWorkflow: async (workflow) => {
    const response = await api.post('/api/workflows', workflow);
    return response.data;
  },

  /**
   * Delete a workflow
   * @param {String} id - Workflow ID
   * @returns {Promise<Object>} - Response data
   */
  deleteWorkflow: async (id) => {
    const response = await api.delete(`/api/workflows/${id}`);
    return response.data;
  },

  /**
   * Terminate a workflow
   * @param {String} id - Workflow ID
   * @returns {Promise<Object>} - Response data
   */
  terminateWorkflow: async (id) => {
    const response = await api.put(`/api/workflows/${id}/terminate`);
    return response.data;
  },

  /**
   * Resubmit a workflow
   * @param {String} id - Workflow ID
   * @returns {Promise<Object>} - Response data
   */
  resubmitWorkflow: async (id) => {
    const response = await api.post(`/api/workflows/${id}/resubmit`);
    return response.data;
  },

  /**
   * Get workflow logs
   * @param {String} id - Workflow ID
   * @param {String} podName - Pod name
   * @returns {Promise<Object>} - Logs data
   */
  getWorkflowLogs: async (id, podName) => {
    const response = await api.get(`/api/workflows/${id}/logs`, {
      params: { podName }
    });
    return response.data;
  }
};

export default WorkflowService;
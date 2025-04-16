import api from './api';

const WorkflowService = {
  getWorkflows: async (params = {}) => {
    const response = await api.get('/api/workflows', { params });
    return response.data;
  },

  getWorkflow: async (id) => {
    const response = await api.get(`/api/workflows/${id}`);
    return response.data;
  },

  createWorkflow: async (workflow) => {
    const response = await api.post('/api/workflows', workflow);
    return response.data;
  },

  deleteWorkflow: async (id) => {
    const response = await api.delete(`/api/workflows/${id}`);
    return response.data;
  },

  terminateWorkflow: async (id) => {
    const response = await api.put(`/api/workflows/${id}/terminate`);
    return response.data;
  },

  resubmitWorkflow: async (id) => {
    const response = await api.post(`/api/workflows/${id}/resubmit`);
    return response.data;
  },

  suspendWorkflow: async (id) => {
    const response = await api.put(`/api/workflows/${id}/suspend`);
    return response.data;
  },

  resumeWorkflow: async (id) => {
    const response = await api.put(`/api/workflows/${id}/resume`);
    return response.data;
  },

  getWorkflowLogs: async (id) => {
    const response = await api.get(`/api/workflows/${id}/logs`);
    return response.data;
  }
};

export default WorkflowService;
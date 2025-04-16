import api from './api';

const TemplateService = {
  getTemplates: async (params = {}) => {
    const response = await api.get('/api/templates', { params });
    return response.data;
  },

  getTemplate: async (id) => {
    const response = await api.get(`/api/templates/${id}`);
    return response.data;
  },

  createTemplate: async (template) => {
    const response = await api.post('/api/templates', template);
    return response.data;
  },

  updateTemplate: async (id, template) => {
    const response = await api.put(`/api/templates/${id}`, template);
    return response.data;
  },

  deleteTemplate: async (id) => {
    const response = await api.delete(`/api/templates/${id}`);
    return response.data;
  }
};

export default TemplateService;
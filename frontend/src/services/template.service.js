import api from './api';

/**
 * Service for managing templates
 */
const TemplateService = {
  /**
   * Get all templates with optional filters
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Templates and pagination data
   */
  getTemplates: async (params = {}) => {
    const response = await api.get('/api/templates', { params });
    return response.data;
  },

  /**
   * Get a template by ID
   * @param {String} id - Template ID
   * @returns {Promise<Object>} - Template data
   */
  getTemplate: async (id) => {
    const response = await api.get(`/api/templates/${id}`);
    return response.data;
  },

  /**
   * Create a new template
   * @param {Object} template - Template data
   * @returns {Promise<Object>} - Created template
   */
  createTemplate: async (template) => {
    const response = await api.post('/api/templates', template);
    return response.data;
  },

  /**
   * Update a template
   * @param {String} id - Template ID
   * @param {Object} template - Template data to update
   * @returns {Promise<Object>} - Updated template
   */
  updateTemplate: async (id, template) => {
    const response = await api.put(`/api/templates/${id}`, template);
    return response.data;
  },

  /**
   * Delete a template
   * @param {String} id - Template ID
   * @returns {Promise<Object>} - Response data
   */
  deleteTemplate: async (id) => {
    const response = await api.delete(`/api/templates/${id}`);
    return response.data;
  }
};

export default TemplateService;
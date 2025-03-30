import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import WorkflowService from '../services/workflow.service';
import TemplateService from '../services/template.service';
import { useNotification } from '../contexts/NotificationContext';

function WorkflowCreate() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await TemplateService.getTemplates();
      setTemplates(result.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      showError('Failed to load workflow templates');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const fetchTemplateDetails = async (templateId) => {
    try {
      const result = await TemplateService.getTemplate(templateId);
      setSelectedTemplate(result);
    } catch (error) {
      console.error('Failed to fetch template details:', error);
      showError('Failed to load template details');
    }
  };
  
  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    description: Yup.string(),
    templateId: Yup.string().required('Template is required'),
  });
  
  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      templateId: '',
      parameters: {}
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const selectedTemplateObj = templates.find(t => t._id === values.templateId);
        
        const workflowData = {
          name: values.name,
          description: values.description,
          templateName: selectedTemplateObj.name,
          parameters: values.parameters
        };
        
        const result = await WorkflowService.createWorkflow(workflowData);
        
        showSuccess('Workflow created successfully');
        navigate(`/workflows/${result.workflow._id}`);
      } catch (error) {
        console.error('Failed to create workflow:', error);
        showError('Failed to create workflow');
      } finally {
        setSubmitting(false);
      }
    }
  });
  
  useEffect(() => {
    if (formik.values.templateId) {
      fetchTemplateDetails(formik.values.templateId);
    } else {
      setSelectedTemplate(null);
    }
    // Reset parameters when template changes
    formik.setFieldValue('parameters', {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.templateId]);
  
  const handleParameterChange = (paramName, value) => {
    formik.setFieldValue(`parameters.${paramName}`, value);
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Workflow
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <form onSubmit={formik.handleSubmit}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflow Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    id="name"
                    name="name"
                    label="Workflow Name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    error={formik.touched.name && Boolean(formik.errors.name)}
                    helperText={formik.touched.name && formik.errors.name}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={formik.touched.templateId && Boolean(formik.errors.templateId)}>
                    <InputLabel id="template-select-label">Workflow Template</InputLabel>
                    <Select
                      labelId="template-select-label"
                      id="templateId"
                      name="templateId"
                      value={formik.values.templateId}
                      onChange={formik.handleChange}
                      label="Workflow Template"
                      required
                    >
                      {templates.map((template) => (
                        <MenuItem key={template._id} value={template._id}>
                          {template.name} - {template.category}
                        </MenuItem>
                      ))}
                    </Select>
                    {formik.touched.templateId && formik.errors.templateId && (
                      <FormHelperText>{formik.errors.templateId}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="description"
                    name="description"
                    label="Description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    error={formik.touched.description && Boolean(formik.errors.description)}
                    helperText={formik.touched.description && formik.errors.description}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          {selectedTemplate && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Workflow Parameters
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                {selectedTemplate.parameters && selectedTemplate.parameters.length > 0 ? (
                  <Grid container spacing={3}>
                    {selectedTemplate.parameters.map((param) => (
                      <Grid item xs={12} md={6} key={param.name}>
                        <TextField
                          fullWidth
                          id={`parameters-${param.name}`}
                          name={`parameters.${param.name}`}
                          label={param.name}
                          value={formik.values.parameters[param.name] || ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          required={param.required}
                          helperText={param.description}
                          type={param.type === 'number' ? 'number' : 'text'}
                        />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography>
                    This template has no configurable parameters.
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
          
          <Box display="flex" justifyContent="flex-end">
            <Button 
              variant="outlined" 
              sx={{ mr: 2 }}
              onClick={() => navigate('/workflows')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : 'Create Workflow'}
            </Button>
          </Box>
        </form>
      )}
    </Box>
  );
}

export default WorkflowCreate;
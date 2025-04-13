import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import yaml from 'js-yaml';
import TemplateService from '../services/template.service';
import { useNotification } from '../contexts/NotificationContext';

function TemplateCreate() {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useNotification();
  
  const [submitting, setSubmitting] = useState(false);
  
  // Function to extract template name and parameters from YAML template
  const extractFromYAML = (yamlContent) => {
    try {
      const parsedYAML = yaml.load(yamlContent);
      if (!parsedYAML) return { templateName: null, parameters: [] };
      
      // Extract template name from metadata
      const templateName = parsedYAML.metadata?.name;
      
      if (!parsedYAML.spec) return { templateName, parameters: [] };
  
      const workflowParams = parsedYAML.spec.arguments?.parameters || [];
      const templates = parsedYAML.spec.templates || [];
  
      // Collect all S3-related parameter references
      const inputFileParams = new Set();
      const outputRefParams = new Set();
  
      for (const template of templates) {
        // Input artifacts
        template.inputs?.artifacts?.forEach(artifact => {
          if (artifact.s3?.key) {
            const matches = artifact.s3.key.match(/{{inputs\.parameters\.([^}]+)}}/g);
            matches?.forEach(match => {
              const paramName = match.match(/{{inputs\.parameters\.([^}]+)}}/)?.[1];
              if (paramName) inputFileParams.add(paramName);
            });
          }
        });
  
        // Output artifacts
        template.outputs?.artifacts?.forEach(artifact => {
          if (artifact.s3?.key) {
            const matches = artifact.s3.key.match(/{{inputs\.parameters\.([^}]+)}}/g);
            matches?.forEach(match => {
              const paramName = match.match(/{{inputs\.parameters\.([^}]+)}}/)?.[1];
              if (paramName) outputRefParams.add(paramName);
            });
          }
        });
      }
  
      const parameters = workflowParams.map(param => {
        let type = 'string';
        if (inputFileParams.has(param.name)) type = 'file';
        else if (outputRefParams.has(param.name)) type = 'reference';
  
        return {
          name: param.name,
          description: param.description || '',
          type,
          default: param.value || '',
          required: !param.value
        };
      });
      
      return { templateName, parameters };
  
    } catch (error) {
      console.error('Error parsing YAML:', error);
      showError(error.message ? `YAML parsing error: ${error.message}` : error);
      return { templateName: null, parameters: [] };
    }
  };
  
  const validationSchema = Yup.object({
    description: Yup.string(),
    template: Yup.string().required('Template definition is required')
      .test(
        'has-metadata-name',
        'Template must contain a valid metadata.name field',
        function(value) {
          if (!value) return true; // Let the required validation handle empty case
          try {
            const parsed = yaml.load(value);
            return Boolean(parsed?.metadata?.name);
          } catch (e) {
            return false;
          }
        }
      ),
    isPublic: Yup.boolean()
  });
  
  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      template: '',
      parameters: [],
      isPublic: true
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        // Get required metadata.name from template YAML
        const { templateName, parameters: extractedParams } = extractFromYAML(values.template);
        
        if (!templateName) {
          showError('Template YAML must include a metadata.name field');
          setSubmitting(false);
          return;
        }
        
        // Merge extracted parameters with user-defined ones
        // We keep user params that don't exist in the YAML and add new ones from YAML
        const existingParamNames = values.parameters.map(p => p.name);
        
        // Keep existing user parameters
        let mergedParams = [...values.parameters];
        
        // Add new parameters from YAML that don't exist in user params
        extractedParams.forEach(yamlParam => {
          if (!existingParamNames.includes(yamlParam.name)) {
            mergedParams.push(yamlParam);
          }
        });
        
        // Submit with the metadata.name from YAML and merged parameters
        const dataToSubmit = {
          ...values,
          name: templateName,  // Always use the name from metadata.name
          parameters: mergedParams
        };
        
        await TemplateService.createTemplate(dataToSubmit);
        
        showSuccess('Template created successfully');
        navigate('/templates');
      } catch (error) {
        console.error('Failed to create template:', error);
        showError(error);
      } finally {
        setSubmitting(false);
      }
    }
  });
  
  const handleAddParameter = () => {
    const parameters = [...formik.values.parameters];
    parameters.push({
      name: '',
      description: '',
      type: 'string',
      default: '',
      required: false
    });
    formik.setFieldValue('parameters', parameters);
  };
  
  const handleRemoveParameter = (index) => {
    const parameters = [...formik.values.parameters];
    parameters.splice(index, 1);
    formik.setFieldValue('parameters', parameters);
  };
  
  const handleParameterChange = (index, field, value) => {
    const parameters = [...formik.values.parameters];
    parameters[index][field] = value;
    formik.setFieldValue('parameters', parameters);
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Template
      </Typography>
      
      <form onSubmit={formik.handleSubmit}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Template Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Template Name (from metadata.name)"
                  value={formik.values.name}
                  disabled
                  helperText="This field is automatically set from the metadata.name in your YAML template and cannot be edited"
                />
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
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.isPublic}
                      onChange={(e) => formik.setFieldValue('isPublic', e.target.checked)}
                      name="isPublic"
                    />
                  }
                  label="Make this template publicly available"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Template Definition
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box mb={2} display="flex" gap={2}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<span role="img" aria-label="upload">📄</span>}
              >
                Upload YAML File
                <input
                  type="file"
                  accept=".yaml,.yml"
                  hidden
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const yamlContent = evt.target.result;
                        formik.setFieldValue('template', yamlContent);
                        
                        // Extract name and parameters from YAML
                        const { templateName, parameters } = extractFromYAML(yamlContent);
                        
                        // Update template name if found in YAML
                        if (templateName) {
                          formik.setFieldValue('name', templateName);
                          showSuccess(`Template name set to "${templateName}" from metadata.name in YAML`);
                        } else {
                          showError('Warning: No metadata.name found in template. The template must include a metadata.name field.');
                        }
                        
                        // Only update parameters if we found some in the YAML
                        if (parameters.length > 0) {
                          formik.setFieldValue('parameters', parameters);
                          showSuccess(`Extracted ${parameters.length} parameters from template`);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => {
                  if (formik.values.template) {
                    const { templateName, parameters } = extractFromYAML(formik.values.template);
                    
                    // Update template name if found
                    if (templateName) {
                      formik.setFieldValue('name', templateName);
                      showSuccess(`Template name set to "${templateName}" from metadata.name in YAML`);
                    } else {
                      showError('No metadata.name found in template. The template must include a metadata.name field.');
                    }
                    
                    if (parameters.length > 0) {
                      // If user already has parameters, ask for confirmation before overwriting
                      if (formik.values.parameters.length > 0) {
                        const confirmed = window.confirm(
                          `Found ${parameters.length} parameters in the template. Do you want to replace your existing ${formik.values.parameters.length} parameters?`
                        );
                        
                        if (confirmed) {
                          formik.setFieldValue('parameters', parameters);
                          showSuccess(`Updated parameters from template`);
                        }
                      } else {
                        formik.setFieldValue('parameters', parameters);
                        showSuccess(`Extracted ${parameters.length} parameters from template`);
                      }
                    } else {
                      showInfo('No parameters found in the template');
                    }
                  } else {
                    showError('Please enter a template first');
                  }
                }}
              >
                Extract Parameters
              </Button>
            </Box>
            <TextField
              fullWidth
              id="template"
              name="template"
              label="Template YAML"
              value={formik.values.template}
              onChange={(e) => {
                formik.handleChange(e);
                
                // Add debounce for parameter and name extraction from pasted YAML
                if (e.target.value.trim()) {
                  const yamlContent = e.target.value;
                  const currentParams = formik.values.parameters;
                  
                  // Extract both template name and parameters
                  const { templateName, parameters } = extractFromYAML(yamlContent);
                  
                  // Update template name if found
                  if (templateName) {
                    formik.setFieldValue('name', templateName);
                    showSuccess(`Template name set to "${templateName}" from metadata.name in YAML`);
                  }
                  
                  // Only try to extract parameters if no parameters exist
                  if (currentParams.length === 0 && parameters.length > 0) {
                    formik.setFieldValue('parameters', parameters);
                    showSuccess(`Extracted ${parameters.length} parameters from template`);
                  }
                }
              }}
              error={formik.touched.template && Boolean(formik.errors.template)}
              helperText={(formik.touched.template && formik.errors.template) || "You can paste YAML directly or upload a file using the button above"}
              multiline
              rows={15}
              required
              placeholder="Enter your Argo Workflow template definition in YAML format"
            />
          </CardContent>
        </Card>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Parameters
              </Typography>
              <Button
                variant="outlined"
                onClick={handleAddParameter}
              >
                Add Parameter
              </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              {formik.values.parameters.length > 0 ? (
                formik.values.parameters.map((param, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 2, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <TextField
                          size="small"
                          label="Name"
                          value={param.name}
                          onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                          required
                          sx={{ width: '65%' }}
                        />
                        <FormControl size="small" sx={{ width: '30%' }}>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={param.type}
                            onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                            label="Type"
                          >
                            <MenuItem value="string">String</MenuItem>
                            <MenuItem value="number">Number</MenuItem>
                            <MenuItem value="boolean">Boolean</MenuItem>
                            <MenuItem value="file">File</MenuItem>
                            <MenuItem value="reference">Reference</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      <TextField
                        fullWidth
                        size="small"
                        label="Default"
                        value={param.default}
                        onChange={(e) => handleParameterChange(index, 'default', e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Description"
                        value={param.description}
                        onChange={(e) => handleParameterChange(index, 'description', e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={param.required}
                              onChange={(e) => handleParameterChange(index, 'required', e.target.checked)}
                            />
                          }
                          label="Required"
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveParameter(index)}
                        >
                          <span role="img" aria-label="remove">❌</span>
                        </IconButton>
                      </Box>
                    </Box>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No parameters defined. Click "Add Parameter" to define input parameters for your template.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
        
        <Box display="flex" justifyContent="flex-end">
          <Button 
            variant="outlined" 
            sx={{ mr: 2 }}
            onClick={() => navigate('/templates')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Create Template'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default TemplateCreate;
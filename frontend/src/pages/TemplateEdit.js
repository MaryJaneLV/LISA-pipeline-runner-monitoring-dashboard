import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
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

function TemplateEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useNotification();
  
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Function to extract template name and parameters from YAML template
  const extractFromYAML = (yamlContent) => {
    try {
      const parsedYAML = yaml.load(yamlContent);
      if (!parsedYAML) return { templateName: null, parameters: [] };
      
      // Extract template name from metadata
      const templateName = parsedYAML.metadata?.name;
      
      // Check if this is a valid Argo Workflow YAML with parameters
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
  
  // For backward compatibility
  const extractParametersFromYAML = (yamlContent) => {
    return extractFromYAML(yamlContent).parameters;
  }
  
  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const result = await TemplateService.getTemplate(id);
      setTemplate(result);
    } catch (error) {
      console.error('Failed to fetch template:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
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
      )
      .test(
        'metadata-name-matches',
        'The metadata.name in YAML must match the template name',
        function(value) {
          if (!value || !template?.name) return true;
          try {
            const parsed = yaml.load(value);
            return parsed?.metadata?.name === template.name;
          } catch (e) {
            return false;
          }
        }
      ),
    isPublic: Yup.boolean()
  });
  
  const formik = useFormik({
    initialValues: {
      description: '',
      template: '',
      parameters: [],
      isPublic: true
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        // Extract metadata.name and parameters from YAML before submission
        const { templateName, parameters: extractedParams } = extractFromYAML(values.template);
        
        if (!templateName) {
          showError('Template YAML must include a metadata.name field');
          setSubmitting(false);
          return;
        }
        
        // Check if metadata.name matches template name
        if (templateName !== template.name) {
          showError(`The metadata.name in YAML (${templateName}) doesn't match the template name (${template.name}). Please fix the YAML or create a new template.`);
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
        
        // Submit with the merged parameters
        const dataToSubmit = {
          ...values,
          parameters: mergedParams
        };
        
        await TemplateService.updateTemplate(id, dataToSubmit);
        
        showSuccess('Template updated successfully');
        navigate(`/templates/${id}`);
      } catch (error) {
        console.error('Failed to update template:', error);
        showError(error);
      } finally {
        setSubmitting(false);
      }
    }
  });
  
  useEffect(() => {
    if (template) {
      formik.setValues({
        description: template.description || '',
        template: template.template || '',
        parameters: template.parameters || [],
        isPublic: template.isPublic !== undefined ? template.isPublic : true
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);
  
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
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (!template) {
    return <Alert severity="error">Template not found</Alert>;
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Edit Template: {template.name}
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
                  label="Template Name"
                  value={template.name}
                  disabled
                  helperText="Template name must match metadata.name in YAML. Edit the metadata.name in YAML if needed."
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
                        
                        // Check if metadata.name is present and matches template name
                        if (templateName) {
                          if (templateName !== template.name) {
                            showError(`Warning: The metadata.name in YAML (${templateName}) doesn't match the template name (${template.name}). Update will be blocked.`);
                          }
                        } else {
                          showError('Warning: No metadata.name found in template. The template must include a metadata.name field.');
                        }
                        
                        // Only update parameters if we found some in the YAML
                        if (parameters.length > 0) {
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
                    
                    // First check template name
                    if (templateName) {
                      if (templateName !== template.name) {
                        showError(`Warning: The metadata.name in YAML (${templateName}) doesn't match the template name (${template.name}). Update will be blocked.`);
                      } else {
                        // Name matches, proceed with parameters
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
                      }
                    } else {
                      showError('No metadata.name found in template. The template must include a metadata.name field.');
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
                
                // Extract YAML content for validation and parameter extraction
                if (e.target.value.trim()) {
                  const yamlContent = e.target.value;
                  const { templateName, parameters } = extractFromYAML(yamlContent);
                  
                  // Check if metadata.name is present and show warnings if needed
                  if (templateName) {
                    // Check if metadata.name matches the template name
                    if (templateName !== template.name) {
                      showError(`Warning: The metadata.name in YAML (${templateName}) doesn't match the template name (${template.name}). Update will be blocked.`);
                    }
                  } else {
                    showError('Warning: No metadata.name found in template. The template must include a metadata.name field.');
                  }
                  
                  // Only try to extract parameters if no parameters exist
                  const currentParams = formik.values.parameters;
                  if (currentParams.length === 0 && parameters.length > 0) {
                    formik.setFieldValue('parameters', parameters);
                    showSuccess(`Extracted ${parameters.length} parameters from template`);
                  }
                }
              }}
              error={formik.touched.template && Boolean(formik.errors.template)}
              helperText={(formik.touched.template && formik.errors.template) || "You can paste YAML directly or upload a file using the button above. The metadata.name in YAML must match the template name."}
              multiline
              rows={15}
              required
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
            
            {formik.values.parameters.length > 0 ? (
              formik.values.parameters.map((param, index) => (
                <Box key={index} sx={{ mb: 4, p: 3, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Parameter Name"
                        value={param.name}
                        onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
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
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        value={param.description}
                        onChange={(e) => handleParameterChange(index, 'description', e.target.value)}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Default Value"
                        value={param.default !== undefined ? param.default : ''}
                        onChange={(e) => handleParameterChange(index, 'default', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={param.required}
                            onChange={(e) => handleParameterChange(index, 'required', e.target.checked)}
                          />
                        }
                        label="Required"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="flex-end">
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleRemoveParameter(index)}
                        >
                          Remove
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ))
            ) : (
              <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                No parameters defined. Click "Add Parameter" to define input parameters for your template.
              </Typography>
            )}
          </CardContent>
        </Card>
        
        {/* Check for metadata.name mismatch */}
        {(() => {
          if (!formik.values.template) return null;
          
          try {
            const parsed = yaml.load(formik.values.template);
            const templateNameInYaml = parsed?.metadata?.name;
            
            if (templateNameInYaml && templateNameInYaml !== template.name) {
              return (
                <Box sx={{ mb: 3, mt: 2 }}>
                  <Alert severity="error">
                    The metadata.name in YAML ({templateNameInYaml}) doesn't match the template name ({template.name}). 
                    Please update the metadata.name in your YAML to match the template name, or create a new template.
                  </Alert>
                </Box>
              );
            }
          } catch (e) {
            // Ignore YAML parsing errors here
          }
          return null;
        })()}
        
        <Box display="flex" justifyContent="flex-end">
          <Button 
            variant="outlined" 
            sx={{ mr: 2 }}
            onClick={() => navigate(`/templates/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting || (() => {
              if (!formik.values.template) return false;
              
              try {
                const parsed = yaml.load(formik.values.template);
                const templateNameInYaml = parsed?.metadata?.name;
                return !templateNameInYaml || templateNameInYaml !== template.name;
              } catch (e) {
                return true;
              }
            })()}
          >
            {submitting ? <CircularProgress size={24} /> : 'Update Template'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}

export default TemplateEdit;
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
  FormHelperText,
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
import TemplateService from '../services/template.service';
import { useNotification } from '../contexts/NotificationContext';

function TemplateCreate() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [submitting, setSubmitting] = useState(false);
  
  const validationSchema = Yup.object({
    name: Yup.string().required('Name is required'),
    description: Yup.string(),
    template: Yup.string().required('Template definition is required'),
    category: Yup.string().required('Category is required'),
    isPublic: Yup.boolean()
  });
  
  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      template: '',
      parameters: [],
      category: 'Other',
      isPublic: true
    },
    validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        await TemplateService.createTemplate(values);
        
        showSuccess('Template created successfully');
        navigate('/templates');
      } catch (error) {
        console.error('Failed to create template:', error);
        showError('Failed to create template');
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
                  label="Template Name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={formik.touched.category && Boolean(formik.errors.category)}>
                  <InputLabel id="category-select-label">Category</InputLabel>
                  <Select
                    labelId="category-select-label"
                    id="category"
                    name="category"
                    value={formik.values.category}
                    onChange={formik.handleChange}
                    label="Category"
                    required
                  >
                    <MenuItem value="Data Processing">Data Processing</MenuItem>
                    <MenuItem value="Machine Learning">Machine Learning</MenuItem>
                    <MenuItem value="Visualization">Visualization</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                  {formik.touched.category && formik.errors.category && (
                    <FormHelperText>{formik.errors.category}</FormHelperText>
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
            
            <Box mb={2}>
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
                        formik.setFieldValue('template', evt.target.result);
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </Button>
            </Box>
            <TextField
              fullWidth
              id="template"
              name="template"
              label="Template YAML"
              value={formik.values.template}
              onChange={formik.handleChange}
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
                        value={param.default}
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
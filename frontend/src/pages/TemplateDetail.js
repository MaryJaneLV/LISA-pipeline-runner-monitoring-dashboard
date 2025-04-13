import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import docco from 'react-syntax-highlighter/dist/esm/styles/hljs/docco';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import TemplateService from '../services/template.service';
import { useNotification } from '../contexts/NotificationContext';

// Register language for syntax highlighting
SyntaxHighlighter.registerLanguage('yaml', yaml);

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await TemplateService.deleteTemplate(id);
        showSuccess('Template deleted successfully');
        navigate('/templates');
      } catch (error) {
        console.error('Failed to delete template:', error);
        showError(error);
      }
    }
  };

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/templates')}
          sx={{ cursor: 'pointer' }}
        >
          Templates
        </Link>
        <Typography color="text.primary">
          {template?.name || 'Template Details'}
        </Typography>
      </Breadcrumbs>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/templates')}
        >
          Back to Templates
        </Button>
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={() => navigate('/workflows/create', { state: { templateId: id } })}
            sx={{ mr: 1 }}
          >
            Use Template
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/templates/${id}/edit`)}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : template ? (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                {template.name}
                <Chip
                  label={template.isPublic ? 'Public' : 'Private'}
                  color={template.isPublic ? 'success' : 'default'}
                  size="small"
                  sx={{ ml: 2, verticalAlign: 'middle' }}
                />
              </Typography>
              {template.description && (
                <Typography variant="body1" paragraph>
                  {template.description}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Box display="flex" flexWrap="wrap" gap={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Category:
                  </Typography>
                  <Typography variant="body1">{template.category}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Version:
                  </Typography>
                  <Typography variant="body1">{template.version}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Created:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(template.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(template.updatedAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Paper sx={{ width: '100%', mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="template tabs"
              centered
            >
              <Tab label="Parameters" />
              <Tab label="Template Definition" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Input Parameters
              </Typography>
              {template.parameters && template.parameters.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  {template.parameters.map((param, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Typography variant="subtitle1">
                        {param.name}
                        {param.required && (
                          <Chip
                            label="Required"
                            color="primary"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Type: {param.type}
                      </Typography>
                      {param.description && (
                        <Typography variant="body2" paragraph>
                          {param.description}
                        </Typography>
                      )}
                      {param.default !== undefined && (
                        <Typography variant="body2">
                          Default value: <code>{param.default?.toString()}</code>
                        </Typography>
                      )}
                    </Card>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">No parameters defined for this template</Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                YAML Definition
              </Typography>
              <Paper variant="outlined" sx={{ mt: 2, overflow: 'auto' }}>
                <SyntaxHighlighter
                  language="yaml"
                  style={docco}
                  showLineNumbers
                  customStyle={{ margin: 0, padding: '16px', maxHeight: '500px' }}
                >
                  {template.template}
                </SyntaxHighlighter>
              </Paper>
            </TabPanel>
          </Paper>
        </>
      ) : (
        <Alert severity="error">Template not found</Alert>
      )}
    </Box>
  );
}

export default TemplateDetail;
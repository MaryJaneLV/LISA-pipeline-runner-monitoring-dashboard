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
  FormControlLabel,
  Grid,
  Link,
  Paper,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import WorkflowService from '../services/workflow.service';
import { useNotification } from '../contexts/NotificationContext';
import { useSocket } from '../contexts/SocketContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workflow-tabpanel-${index}`}
      aria-labelledby={`workflow-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { connected } = useSocket();

  const [workflow, setWorkflow] = useState(null);
  const [argoWorkflow, setArgoWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  const fetchWorkflow = async () => {
    setLoading(true);
    try {
      const result = await WorkflowService.getWorkflow(id);
      setWorkflow(result.workflow);
      setArgoWorkflow(result.argoWorkflow);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
      showError('Failed to load workflow details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
  // Listen for real-time workflow updates
  useEffect(() => {
    if (!workflow || !realtimeEnabled) return;
    
    // Event handler for direct workflow data updates
    const handleWorkflowUpdate = (event) => {
      const updatedWorkflow = event.detail;
      
      // Only update if it's our workflow
      if (updatedWorkflow && updatedWorkflow._id === id) {
        console.log('Received workflow update from backend:', updatedWorkflow);
        
        // Show notification if status changed
        if (workflow && workflow.status !== updatedWorkflow.status) {
          showSuccess(`Workflow status changed to ${updatedWorkflow.status}`);
        }
        
        setWorkflow(updatedWorkflow);
      }
    };
    
    // Event handler for Argo workflow status updates
    const handleArgoWorkflowUpdate = (event) => {
      const data = event.detail;
      
      // Only update if it matches our workflow's Argo name
      if (data && workflow && data.metadata?.name === workflow.argoWorkflowName) {
        console.log('Received Argo workflow update:', data);
        setArgoWorkflow(data);
        
        // If the data contains our workflow data, update it
        if (data.workflowData && data.workflowData._id === id) {
          setWorkflow(data.workflowData);
        } else {
          // If we just got an update but no workflow data, refresh to get latest
          fetchWorkflow();
        }
      }
    };
    
    // Add event listeners
    window.addEventListener('workflow:updated', handleWorkflowUpdate);
    
    if (workflow && workflow.argoWorkflowName) {
      window.addEventListener(
        `workflow:status:${workflow.argoWorkflowName}`,
        handleArgoWorkflowUpdate
      );
    }
    
    // Clean up listeners on unmount
    return () => {
      window.removeEventListener('workflow:updated', handleWorkflowUpdate);
      
      if (workflow && workflow.argoWorkflowName) {
        window.removeEventListener(
          `workflow:status:${workflow.argoWorkflowName}`,
          handleArgoWorkflowUpdate
        );
      }
    };
  }, [id, workflow, realtimeEnabled]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTerminate = async () => {
    if (window.confirm('Are you sure you want to terminate this workflow?')) {
      try {
        await WorkflowService.terminateWorkflow(id);
        showSuccess('Workflow terminated successfully');
        fetchWorkflow();
      } catch (error) {
        console.error('Failed to terminate workflow:', error);
        showError('Failed to terminate workflow');
      }
    }
  };

  const handleResubmit = async () => {
    if (window.confirm('Are you sure you want to resubmit this workflow?')) {
      try {
        await WorkflowService.resubmitWorkflow(id);
        showSuccess('Workflow resubmitted successfully');
        fetchWorkflow();
      } catch (error) {
        console.error('Failed to resubmit workflow:', error);
        showError('Failed to resubmit workflow');
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await WorkflowService.deleteWorkflow(id);
        showSuccess('Workflow deleted successfully');
        navigate('/workflows');
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        showError('Failed to delete workflow');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'succeeded':
        return 'success';
      case 'running':
        return 'info';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'terminated':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/workflows')}
          sx={{ cursor: 'pointer' }}
        >
          Workflows
        </Link>
        <Typography color="text.primary">
          {workflow?.name || 'Workflow Details'}
        </Typography>
      </Breadcrumbs>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/workflows')}
        >
          Back to Workflows
        </Button>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={realtimeEnabled}
                onChange={(e) => setRealtimeEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="Real-time updates"
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchWorkflow}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          {workflow?.status === 'Running' || workflow?.status === 'Pending' ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleTerminate}
              sx={{ mr: 1 }}
            >
              Terminate
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ReplayIcon />}
              onClick={handleResubmit}
              sx={{ mr: 1 }}
            >
              Resubmit
            </Button>
          )}
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
      ) : workflow ? (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                {workflow.name}
              </Typography>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="body1" color="text.secondary" sx={{ mr: 2 }}>
                  Status:
                </Typography>
                <Chip
                  label={workflow.status}
                  color={getStatusColor(workflow.status)}
                />
              </Box>
              {workflow.description && (
                <Typography variant="body1" paragraph>
                  {workflow.description}
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Template:
                  </Typography>
                  <Typography variant="body1">{workflow.templateName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Created:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(workflow.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Started:
                  </Typography>
                  <Typography variant="body1">
                    {workflow.startedAt
                      ? new Date(workflow.startedAt).toLocaleString()
                      : 'Not started'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Finished:
                  </Typography>
                  <Typography variant="body1">
                    {workflow.finishedAt
                      ? new Date(workflow.finishedAt).toLocaleString()
                      : 'Not finished'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Paper sx={{ width: '100%', mb: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="workflow tabs"
              centered
            >
              <Tab label="Parameters" />
              <Tab label="Workflow Details" />
              <Tab label="Outputs" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Input Parameters
              </Typography>
              {workflow.parameters && Object.keys(workflow.parameters).length > 0 ? (
                <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  {Object.entries(workflow.parameters).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 2 }}>
                      <Typography component="dt" variant="body2" color="text.secondary">
                        {key}:
                      </Typography>
                      <Typography component="dd" variant="body1">
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Alert severity="info">No parameters for this workflow</Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Argo Workflow Details
              </Typography>
              {argoWorkflow ? (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Phase: <Chip label={argoWorkflow.status?.phase || 'Unknown'} size="small" />
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Started: {argoWorkflow.status?.startedAt ? new Date(argoWorkflow.status.startedAt).toLocaleString() : 'Not started'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Finished: {argoWorkflow.status?.finishedAt ? new Date(argoWorkflow.status.finishedAt).toLocaleString() : 'Not finished'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Message: {argoWorkflow.status?.message || 'No message'}
                  </Typography>
                </Box>
              ) : (
                <Alert severity="info">No Argo workflow details available</Alert>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Workflow Outputs
              </Typography>
              {workflow.artifacts && workflow.artifacts.length > 0 ? (
                <Grid container spacing={2}>
                  {workflow.artifacts.map((artifact, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">{artifact.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {artifact.path}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={() => window.open(`/api/storage/presigned-url?bucket=${artifact.s3.bucket}&objectName=${artifact.s3.key}`)}
                          >
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info">No outputs available for this workflow</Alert>
              )}
            </TabPanel>
          </Paper>
        </>
      ) : (
        <Alert severity="error">Workflow not found</Alert>
      )}
    </Box>
  );
}

export default WorkflowDetail;
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Link,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import WorkflowService from '../services/workflow.service';
import { useNotification } from '../contexts/NotificationContext';
import TabPanel from '../components/TabPanel';
import WorkflowActions from '../components/workflow/WorkflowActions';
import WorkflowSummary from '../components/workflow/WorkflowSummary';
import WorkflowParameters from '../components/workflow/WorkflowParameters';
import WorkflowDetails from '../components/workflow/WorkflowDetails';
import WorkflowOutputs from '../components/workflow/WorkflowOutputs';
import WorkflowLogs from '../components/workflow/WorkflowLogs';
import { getStatusColor } from '../utils/workflowUtils';

function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [workflow, setWorkflow] = useState(null);
  const [argoWorkflow, setArgoWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  const fetchWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const result = await WorkflowService.getWorkflow(id);
      setWorkflow(result.workflow);
      setArgoWorkflow(result.argoWorkflow);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

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
        
        setWorkflow(prevWorkflow => ({...updatedWorkflow, parameters: prevWorkflow.parameters}));
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
          setWorkflow(prevWorkflow => ({...data.workflowData, parameters: prevWorkflow.parameters}));
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
  }, [id, workflow, realtimeEnabled, showSuccess, fetchWorkflow]);

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
        showError(error);
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
        showError(error);
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
        showError(error);
      }
    }
  };

  const handleSuspend = async () => {
    if (window.confirm('Are you sure you want to suspend this workflow?')) {
      try {
        await WorkflowService.suspendWorkflow(id);
        showSuccess('Workflow suspended successfully');
        fetchWorkflow();
      } catch (error) {
        console.error('Failed to suspend workflow:', error);
        showError(error);
      }
    }
  };

  const handleResume = async () => {
    if (window.confirm('Are you sure you want to resume this workflow?')) {
      try {
        await WorkflowService.resumeWorkflow(id);
        showSuccess('Workflow resumed successfully');
        fetchWorkflow();
      } catch (error) {
        console.error('Failed to resume workflow:', error);
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
        <WorkflowActions 
          workflow={workflow}
          realtimeEnabled={realtimeEnabled}
          setRealtimeEnabled={setRealtimeEnabled}
          onRefresh={fetchWorkflow}
          onTerminate={handleTerminate}
          onResubmit={handleResubmit}
          onDelete={handleDelete}
          onSuspend={handleSuspend}
          onResume={handleResume}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : workflow ? (
        <>
          <WorkflowSummary 
            workflow={workflow} 
            getStatusColor={getStatusColor} 
          />

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
              <Tab label="Logs" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <WorkflowParameters parameters={workflow.parameters} />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <WorkflowDetails argoWorkflow={argoWorkflow} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <WorkflowOutputs artifacts={workflow.artifacts} />
            </TabPanel>
            
            <TabPanel value={tabValue} index={3}>
              <WorkflowLogs workflowId={id} />
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
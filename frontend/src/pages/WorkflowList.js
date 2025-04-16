import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import WorkflowService from '../services/workflow.service';
import { useNotification } from '../contexts/NotificationContext';

function WorkflowList() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const result = await WorkflowService.getWorkflows({
        page: page + 1,
        limit: rowsPerPage,
      });
      
      setWorkflows(result.data);
      setTotalCount(result.pagination.total);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchWorkflows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);
  
  // Listen for workflow updates
  useEffect(() => {
    if (!realtimeEnabled) return;
    
    const handleWorkflowUpdate = (event) => {
      const updatedWorkflow = event.detail;
      
      // Update the workflow list if we have the workflow in the current page
      setWorkflows(currentWorkflows => {
        const index = currentWorkflows.findIndex(w => w._id === updatedWorkflow._id);
        
        if (index !== -1) {
          // Create a new array with the updated workflow
          const newWorkflows = [...currentWorkflows];
          newWorkflows[index] = {
            ...newWorkflows[index],
            ...updatedWorkflow
          };
          return newWorkflows;
        }
        
        return currentWorkflows;
      });
    };
    
    window.addEventListener('workflow:updated', handleWorkflowUpdate);
    
    return () => {
      window.removeEventListener('workflow:updated', handleWorkflowUpdate);
    };
  }, [realtimeEnabled]);
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
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
  
  const handleViewWorkflow = (id) => {
    navigate(`/workflows/${id}`);
  };
  
  const handleDeleteWorkflow = async (id) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await WorkflowService.deleteWorkflow(id);
        showSuccess('Workflow deleted successfully');
        fetchWorkflows();
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        showError(error);
      }
    }
  };
  
  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" component="h1" gutterBottom>
          Workflows
        </Typography>
        <Box display="flex" alignItems="center">
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
            onClick={fetchWorkflows}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/workflows/create')}
          >
            New Workflow
          </Button>
        </Box>
      </Box>
      
      <Card>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Template</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workflows.length > 0 ? (
                    workflows.map((workflow) => (
                      <TableRow key={workflow._id}>
                        <TableCell>{workflow.name}</TableCell>
                        <TableCell>{workflow.templateName}</TableCell>
                        <TableCell>
                          <Chip
                            label={workflow.status}
                            color={getStatusColor(workflow.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(workflow.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => handleViewWorkflow(workflow._id)}
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteWorkflow(workflow._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No workflows found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Card>
    </Box>
  );
}

export default WorkflowList;
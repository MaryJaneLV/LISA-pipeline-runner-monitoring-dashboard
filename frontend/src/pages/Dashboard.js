import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import WorkflowService from '../services/workflow.service';
import TemplateService from '../services/template.service';
import { useNotification } from '../contexts/NotificationContext';
import { useSocket } from '../contexts/SocketContext';

function Dashboard() {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const { workflowUpdates } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [workflowStats, setWorkflowStats] = useState({
    pending: 0,
    running: 0,
    succeeded: 0,
    failed: 0,
    total: 0
  });
  const [recentWorkflows, setRecentWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  
  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      // Fetch workflows
      const workflowResponse = await WorkflowService.getWorkflows({ limit: 5 });
      setRecentWorkflows(workflowResponse.data);
      
      // Calculate stats
      const stats = {
        pending: 0,
        running: 0,
        succeeded: 0,
        failed: 0,
        total: workflowResponse.pagination.total
      };
      
      workflowResponse.data.forEach(workflow => {
        const status = workflow.status.toLowerCase();
        if (stats[status] !== undefined) {
          stats[status]++;
        }
      });
      
      setWorkflowStats(stats);
      
      // Fetch templates
      const templateResponse = await TemplateService.getTemplates({ limit: 5 });
      setTemplates(templateResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showError('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchDashboardData}
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
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Workflow Stats */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Workflow Statistics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                      <Typography variant="h4">{workflowStats.total}</Typography>
                      <Typography variant="body2">Total</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.100', textAlign: 'center' }}>
                      <Typography variant="h4">{workflowStats.running}</Typography>
                      <Typography variant="body2">Running</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.100', textAlign: 'center' }}>
                      <Typography variant="h4">{workflowStats.succeeded}</Typography>
                      <Typography variant="body2">Succeeded</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.100', textAlign: 'center' }}>
                      <Typography variant="h4">{workflowStats.failed}</Typography>
                      <Typography variant="body2">Failed</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Recent Workflows */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Recent Workflows
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigate('/workflows')}
                  >
                    View All
                  </Button>
                </Box>
                <List>
                  {recentWorkflows.length > 0 ? (
                    recentWorkflows.map((workflow, index) => (
                      <React.Fragment key={workflow._id}>
                        <ListItem
                          button
                          onClick={() => navigate(`/workflows/${workflow._id}`)}
                        >
                          <ListItemText
                            primary={workflow.name}
                            secondary={`Status: ${workflow.status} | Template: ${workflow.templateName}`}
                          />
                        </ListItem>
                        {index < recentWorkflows.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="No workflows found" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Recent Updates */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Real-time Updates
                </Typography>
                <List>
                  {workflowUpdates.length > 0 ? (
                    workflowUpdates.map((update, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={`Workflow ${update.metadata.name}`}
                            secondary={`Status changed to ${update.status.phase} (${update.status.progress})`}
                          />
                        </ListItem>
                        {index < workflowUpdates.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="No recent updates" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>       

          {/* Available Templates */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Available Templates
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigate('/templates')}
                  >
                    View All
                  </Button>
                </Box>
                <List>
                  {templates.length > 0 ? (
                    templates.map((template, index) => (
                      <React.Fragment key={template._id}>
                        <ListItem
                          button
                          onClick={() => navigate(`/templates/${template._id}`)}
                        >
                          <ListItemText
                            primary={template.name}
                            secondary={`Version: ${template.version}`}
                          />
                        </ListItem>
                        {index < templates.length - 1 && <Divider />}
                      </React.Fragment>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="No templates found" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;
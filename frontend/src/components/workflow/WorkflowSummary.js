import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Chip, 
  Divider, 
  Grid, 
  Typography 
} from '@mui/material';

function WorkflowSummary({ workflow, getStatusColor }) {
  return (
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
  );
}

export default WorkflowSummary;
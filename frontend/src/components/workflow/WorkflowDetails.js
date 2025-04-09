import React from 'react';
import { Alert, Box, Chip, Typography } from '@mui/material';

function WorkflowDetails({ argoWorkflow }) {
  return (
    <>
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
    </>
  );
}

export default WorkflowDetails;
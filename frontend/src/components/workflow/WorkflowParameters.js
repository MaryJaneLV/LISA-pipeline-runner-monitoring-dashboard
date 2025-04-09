import React from 'react';
import { Alert, Box, Typography } from '@mui/material';

function WorkflowParameters({ parameters }) {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Input Parameters
      </Typography>
      {parameters && Object.keys(parameters).length > 0 ? (
        <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          {Object.entries(parameters).map(([key, value]) => (
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
    </>
  );
}

export default WorkflowParameters;
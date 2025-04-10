import React from 'react';
import { Divider, Typography } from '@mui/material';

function StorageInfo() {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Storage Information
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Typography variant="body2" paragraph>
        <strong>Default Buckets:</strong>
      </Typography>
      <ul>
        <li><Typography variant="body2">pipeline-runner-artifacts: Intermediate workflow data</Typography></li>
      </ul>
      
      <Typography variant="body2" sx={{ mt: 2 }}>
        Files uploaded here are accessible to your workflows by using the Minio endpoint.
      </Typography>
    </>
  );
}

export default StorageInfo;
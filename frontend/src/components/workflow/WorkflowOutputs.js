import React from 'react';
import { Alert, Button, Card, CardContent, Grid, Typography } from '@mui/material';
import StorageService from '../../services/storage.service';

const getFilenameFromS3Key = (key) => {
  if (!key) return 'download';
  return key.split('/').pop();
};

const getRelativePath = (key) => {
  if (!key) return '';
  
  const parts = key.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : '';
};

const handleDownload = (bucket, objectName) => {
  const downloadUrl = StorageService.getDownloadUrl(bucket, objectName);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.target = '_blank';
  
  const token = localStorage.getItem('token');
  if (token) {
    const separator = downloadUrl.includes('?') ? '&' : '?';
    a.href = `${downloadUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  
  a.download = getFilenameFromS3Key(objectName);;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

function WorkflowOutputs({ artifacts }) {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Workflow Outputs
      </Typography>
      {artifacts && artifacts.length > 0 ? (
        <Grid container spacing={2}>
          {artifacts.map((artifact, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {getFilenameFromS3Key(artifact.s3.key)}
                  </Typography>
                  {artifact.name && artifact.name !== getFilenameFromS3Key(artifact.s3.key) && (
                    <Typography variant="body2" color="primary.main" sx={{ mt: 0.5 }}>
                      {artifact.name}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                    {getRelativePath(artifact.s3.key)}
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    size="small"
                    sx={{ mt: 1.5 }}
                    onClick={() => handleDownload(
                      artifact.s3.bucket, 
                      artifact.s3.key
                    )}
                  >
                    Download File
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info">No outputs available for this workflow</Alert>
      )}
    </>
  );
}

export default WorkflowOutputs;
import React from 'react';
import { Alert, Button, Card, CardContent, Grid, Typography } from '@mui/material';

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
    </>
  );
}

export default WorkflowOutputs;
import React from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

function BucketSelector({ 
  bucket, 
  onRefresh, 
  currentPrefix 
}) {
  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Bucket: {bucket}
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box mb={2}>
        <Typography variant="subtitle1">
          Path: {currentPrefix ? currentPrefix : '/'}
        </Typography>
        {currentPrefix && (
          <Button 
            variant="text" 
            onClick={() => onRefresh('up')}
            sx={{ mt: 1 }}
          >
            Go up one level
          </Button>
        )}
      </Box>
    </>
  );
}

export default BucketSelector;
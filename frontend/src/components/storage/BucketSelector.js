import React from 'react';
import { Box, Button, Divider, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

function BucketSelector({ 
  buckets, 
  selectedBucket, 
  onBucketChange, 
  onRefresh, 
  currentPrefix 
}) {
  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="bucket-select-label">Bucket</InputLabel>
          <Select
            labelId="bucket-select-label"
            value={selectedBucket}
            onChange={onBucketChange}
            label="Bucket"
          >
            {buckets.map((bucket) => (
              <MenuItem key={bucket} value={bucket}>
                {bucket}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
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
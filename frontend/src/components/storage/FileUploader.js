import React from 'react';
import { Box, Button, CircularProgress, Divider, TextField, Typography } from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

function FileUploader({ 
  file, 
  objectName, 
  onFileChange, 
  onObjectNameChange, 
  onUpload, 
  uploading, 
  formatSize,
  currentPrefix 
}) {
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Upload File
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Box mb={3}>
        <input
          accept="*/*"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={onFileChange}
        />
        <label htmlFor="file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
          >
            Select File
          </Button>
        </label>
        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected: {file.name} ({formatSize(file.size)})
          </Typography>
        )}
      </Box>
      
      <TextField
        fullWidth
        label="Object Name"
        value={objectName}
        onChange={onObjectNameChange}
        margin="normal"
        helperText={currentPrefix ? `Will be stored as: ${currentPrefix}${objectName}` : null}
      />
      
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={onUpload}
        disabled={!file || !objectName || uploading}
        sx={{ mt: 2 }}
      >
        {uploading ? <CircularProgress size={24} /> : 'Upload'}
      </Button>
    </>
  );
}

export default FileUploader;
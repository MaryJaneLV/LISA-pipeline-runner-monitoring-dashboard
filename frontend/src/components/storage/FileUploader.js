import React, { useState } from 'react';
import { 
  Alert,
  Box, 
  Button, 
  CircularProgress, 
  Divider, 
  TextField, 
  ToggleButton,
  ToggleButtonGroup,
  Typography 
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import { formatSize } from '../../utils/storageUtils'

function FileUploader({ 
  file, 
  objectName, 
  onFileChange, 
  onObjectNameChange, 
  onUpload, 
  uploading, 
  currentPrefix 
}) {
  const [folderType, setFolderType] = useState('input');
  
  const isInInputFolder = currentPrefix && currentPrefix.includes('/input/');
  const isInOutputFolder = currentPrefix && currentPrefix.includes('/output/');
  const isInScriptsFolder = currentPrefix && currentPrefix.includes('/scripts/');
  
  const isToggleDisabled = isInInputFolder || isInOutputFolder || isInScriptsFolder;
  
  const handleFolderTypeChange = (event, newFolderType) => {
    if (newFolderType !== null) {
      setFolderType(newFolderType);
    }
  };
  
  // Determine upload path display
  let displayPath = currentPrefix || '';
  if (!isToggleDisabled && currentPrefix) {
    // If not already in input/output/scripts folder or their subfolders, 
    // show the path with the selected folder type
    const pathBase = displayPath.endsWith('/') ? displayPath : `${displayPath}/`;
    displayPath = `${pathBase}${folderType}/`;
  } else {
    // Make sure the display path ends with a slash for visual consistency
    displayPath = displayPath.endsWith('/') ? displayPath : `${displayPath}/`;
  }
  
  return (
    <>
      <Typography variant="h6" gutterBottom>
        Upload File
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {!currentPrefix && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please navigate to a storage location first.
        </Alert>
      )}
      
      {!isToggleDisabled && currentPrefix && (
        <Box mb={2}>
          <Typography variant="body2" gutterBottom>
            Select folder type:
          </Typography>
          <ToggleButtonGroup
            value={folderType}
            exclusive
            onChange={handleFolderTypeChange}
            aria-label="folder type"
            size="small"
          >
            <ToggleButton value="input" aria-label="input folder">
              Input
            </ToggleButton>
            <ToggleButton value="output" aria-label="output folder">
              Output
            </ToggleButton>
            <ToggleButton value="scripts" aria-label="scripts folder">
              Scripts
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      
      <Box mb={3}>
        <input
          accept="*/*"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={onFileChange}
          disabled={!currentPrefix}
        />
        <label htmlFor="file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
            disabled={!currentPrefix}
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
        disabled={!currentPrefix}
        helperText={currentPrefix ? `Will be stored as: ${displayPath}${objectName}` : 'Please select a location first'}
      />
      
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={onUpload}
        disabled={!currentPrefix || !file || !objectName || uploading}
        sx={{ mt: 2 }}
      >
        {uploading ? <CircularProgress size={24} /> : 'Upload'}
      </Button>
    </>
  );
}

export default FileUploader;
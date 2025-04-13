import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  Button,
  FormHelperText,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Paper
} from '@mui/material';
import { Folder as FolderIcon, InsertDriveFile as FileIcon } from '@mui/icons-material';
import StorageService from '../../services/storage.service';
import { useAuth } from '../../contexts/AuthContext';
import { processObjects } from '../../utils/storageUtils';

function WorkflowParametersInput({ parameters, onChange }) {
  const { user } = useAuth();
  const userId = user?._id;
  
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedParam, setSelectedParam] = useState(null);
  const DEFAULT_BUCKET = 'pipeline-runner-artifacts';

  const handleParameterChange = (name, value) => {
    onChange(name, value);
  };

  const handleTabChange = useCallback((_, newValue) => {
    setSelectedTab(newValue);
    
    // Set prefix based on selected tab
    if (newValue === 0 && userId) { // My Files tab
      setCurrentPrefix(`${userId}/`);
    } else if (newValue === 1) { // Public Files tab
      setCurrentPrefix('public/');
    }
  }, [userId]);

  useEffect(() => {    
    // Set initial prefix based on user ID
    if (userId && currentPrefix === '' && fileModalOpen) {
      handleTabChange(null, selectedTab);
    }
  }, [userId, currentPrefix, handleTabChange, selectedTab, fileModalOpen]);
  
  useEffect(() => {
    if (currentPrefix && fileModalOpen) {
      fetchObjects();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrefix, fileModalOpen]);

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const result = await StorageService.listObjects(DEFAULT_BUCKET, currentPrefix);
      
      // Process objects to handle folders
      const processedObjects = processObjects(result.objects, currentPrefix);
      setObjects(processedObjects);
    } catch (error) {
      console.error('Failed to fetch objects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFileSelector = (param) => {
    setSelectedParam(param);
    setFileModalOpen(true);
  };

  const handleClose = () => {
    setFileModalOpen(false);
  };

  const navigateToFolder = (prefix) => {
    setCurrentPrefix(prefix);
  };

  const navigateUp = () => {
    // Remove trailing slash
    const prefixWithoutTrailingSlash = currentPrefix.endsWith('/') 
      ? currentPrefix.slice(0, -1) 
      : currentPrefix;
    
    // Find the last slash
    const lastSlashIndex = prefixWithoutTrailingSlash.lastIndexOf('/');
    
    if (lastSlashIndex >= 0) {
      // Navigate to parent folder
      const newPrefix = prefixWithoutTrailingSlash.substring(0, lastSlashIndex + 1);
      
      // If going back would take us out of the allowed prefixes, reset to the tab's root
      if ((selectedTab === 0 && userId && !newPrefix.startsWith(`${userId}/`)) ||
          (selectedTab === 1 && !newPrefix.startsWith('public/'))) {
        handleTabChange(null, selectedTab);
      } else {
        setCurrentPrefix(newPrefix);
      }
    } else {
      // Navigate to tab's root
      handleTabChange(null, selectedTab);
    }
  };

  const selectItem = (obj) => {
    // For reference type, ONLY allow selecting folders
    if (selectedParam?.type === 'reference') {
      // Only allow folder selection for reference type
      if (obj.isFolder) {
        let folderPath = obj.prefix;

        // Remove trailing slash if present
        if (folderPath.endsWith('/')) {
          folderPath = folderPath.slice(0, -1);
        }

        console.log(folderPath); // "output"
        handleParameterChange(selectedParam.name, folderPath);
        setFileModalOpen(false);
      }
      // If it's a file, do nothing for reference type
      return;
    } 
    
    // For file type, only allow file selection (not folders)
    if (selectedParam?.type === 'file') {
      if (obj.isFolder) {
        return; // Don't allow folder selection for file type
      }
      
      const fullPath = obj.name.startsWith(currentPrefix) ? 
        obj.name : `${currentPrefix}${obj.name}`;
        
      handleParameterChange(selectedParam.name, fullPath);
      
      setFileModalOpen(false);
    }
  };

  if (!parameters || parameters.length === 0) {
    return (
      <Typography variant="body1">
        No parameters defined for this workflow template.
      </Typography>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {parameters.map((param) => {
          if (param.type === 'file' || param.type === 'reference') {
            return (
              <Grid item xs={12} md={6} key={param.name}>
                <Typography variant="subtitle2" gutterBottom>
                  {param.name} {param.required && <span style={{ color: 'red' }}>*</span>}
                </Typography>
                
                <Box display="flex" alignItems="center">
                  <TextField
                    fullWidth
                    size="small"
                    value={param.value || param.default || ''}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.type === 'file' ? 'Enter file path' : 'Enter folder path'}
                    sx={{ mr: 2 }}
                  />
                  
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => openFileSelector(param)}
                  >
                    Select
                  </Button>
                </Box>
                
                {param.description && (
                  <FormHelperText>
                    {param.description}
                  </FormHelperText>
                )}
                {param.type === 'reference' && (
                  <FormHelperText>
                    Reference type: Select a folder path (files cannot be selected)
                  </FormHelperText>
                )}
              </Grid>
            );
          } else if (param.type === 'boolean') {
          return (
            <Grid item xs={12} md={6} key={param.name}>
              <FormControlLabel
                control={
                  <Switch
                    checked={param.value === true || param.value === 'true' || param.default === true || param.default === 'true'}
                    onChange={(e) => handleParameterChange(param.name, e.target.checked)}
                  />
                }
                label={param.name}
              />
              {param.description && (
                <FormHelperText>
                  {param.description}
                </FormHelperText>
              )}
            </Grid>
          );
        } else if (param.type === 'number') {
          return (
            <Grid item xs={12} md={6} key={param.name}>
              <TextField
                fullWidth
                label={param.name}
                type="number"
                value={param.value !== undefined ? param.value : param.default || ''}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                helperText={param.description}
                required={param.required}
              />
            </Grid>
          );
        } else {
          // Default to string type
          return (
            <Grid item xs={12} md={6} key={param.name}>
              <TextField
                fullWidth
                label={param.name}
                value={param.value !== undefined ? param.value : param.default || ''}
                onChange={(e) => handleParameterChange(param.name, e.target.value)}
                helperText={param.description}
                required={param.required}
              />
            </Grid>
          );
        }
      })}
    </Grid>
    <Dialog 
      open={fileModalOpen} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{selectedParam?.type === 'reference' ? 'Select Folder' : 'Select File'}</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            <Tab label="My Files" />
            <Tab label="Public Files" />
          </Tabs>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">
              Current path: {currentPrefix || '/'}
            </Typography>
            <Button 
              size="small" 
              onClick={navigateUp}
              disabled={!currentPrefix || currentPrefix === 'public/' || (userId && currentPrefix === `${userId}/`)}
            >
              Up
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : objects.length > 0 ? (
                  objects.map((obj) => (
                    <TableRow 
                      key={obj.name}
                      hover
                      onClick={() => {
                        if (obj.isFolder) {
                          navigateToFolder(obj.prefix);
                        } else if (selectedParam?.type === 'file') {
                          selectItem(obj);
                        }
                      }}
                      sx={{ cursor: obj.isFolder || (selectedParam?.type === 'file' && !obj.isFolder) ? 'pointer' : 'default' }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {obj.isFolder ? (
                            <FolderIcon 
                              color={selectedParam?.type === 'reference' ? 'success' : 'primary'} 
                              sx={{ mr: 1 }} 
                            />
                          ) : (
                            <FileIcon 
                              sx={{ mr: 1 }} 
                              color={selectedParam?.type === 'reference' ? 'disabled' : 'inherit'} 
                            />
                          )}
                          {obj.name}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {obj.isFolder ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {selectedParam?.type === 'reference' && (
                              <Button 
                                size="small" 
                                variant="contained" 
                                color="success" 
                                sx={{ mr: 1 }}
                                onClick={(e) => {
                                  e.stopPropagation(); 
                                  selectItem(obj);
                                }}
                              >
                                Select Folder
                              </Button>
                            )}
                            <span>Folder</span>
                          </Box>
                        ) : (
                          selectedParam?.type === 'reference' ?
                            <span style={{ color: 'grey' }}>File (Not selectable)</span> :
                            'File'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      <Typography variant="body2">No files found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        {selectedParam?.type === 'reference' && (
          <Typography variant="caption" sx={{ mr: 2, color: 'text.secondary', fontWeight: 'bold' }}>
            Note: Click on a folder to navigate into it. Use the "Select Folder" button to choose the current folder.
          </Typography>
        )}
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  </>
  );
}

export default WorkflowParametersInput;
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import StorageService from '../services/storage.service';
import { useNotification } from '../contexts/NotificationContext';

const DEFAULT_BUCKETS = ['workflow-artifacts', 'workflow-inputs', 'workflow-outputs'];

function StorageBrowser() {
  const { showSuccess, showError } = useNotification();
  
  const [buckets, setBuckets] = useState(DEFAULT_BUCKETS);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // File upload state
  const [file, setFile] = useState(null);
  const [objectName, setObjectName] = useState('');
  
  useEffect(() => {
    if (buckets.length > 0 && !selectedBucket) {
      setSelectedBucket(buckets[0]);
    }
  }, [buckets, selectedBucket]);
  
  useEffect(() => {
    if (selectedBucket) {
      fetchObjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBucket, currentPrefix]);
  
  const fetchObjects = async () => {
    setLoading(true);
    try {
      const result = await StorageService.listObjects(selectedBucket, currentPrefix);
      
      // Process objects to handle folders
      const processedObjects = processObjects(result.objects);
      setObjects(processedObjects);
    } catch (error) {
      console.error('Failed to fetch objects:', error);
      showError('Failed to load objects from storage');
    } finally {
      setLoading(false);
    }
  };
  
  // Process objects to identify folders (objects with same prefix)
  const processObjects = (objectsList) => {
    const folders = new Map();
    const files = [];
    
    objectsList.forEach(obj => {
      // Remove current prefix from name
      const name = obj.name.startsWith(currentPrefix) 
        ? obj.name.substring(currentPrefix.length) 
        : obj.name;
      
      // Skip if empty
      if (!name) return;
      
      // Check if it's a folder (has '/' in it)
      const slashIndex = name.indexOf('/');
      
      if (slashIndex > 0) {
        // It's a folder
        const folderName = name.substring(0, slashIndex + 1);
        
        if (!folders.has(folderName)) {
          folders.set(folderName, {
            name: folderName,
            prefix: currentPrefix + folderName,
            isFolder: true,
            size: 0,
            lastModified: obj.lastModified
          });
        }
      } else {
        // It's a file
        files.push({
          ...obj,
          name,
          isFolder: false
        });
      }
    });
    
    // Combine folders and files, sorted by name
    return [...Array.from(folders.values()), ...files].sort((a, b) => {
      // Folders first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      // Then by name
      return a.name.localeCompare(b.name);
    });
  };
  
  const handleBucketChange = (event) => {
    setSelectedBucket(event.target.value);
    setCurrentPrefix('');
  };
  
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setObjectName(selectedFile.name);
    }
  };
  
  const handleUpload = async () => {
    if (!file || !objectName) {
      showError('Please select a file and provide an object name');
      return;
    }
    
    setUploading(true);
    try {
      const fullObjectName = currentPrefix + objectName;
      await StorageService.uploadFile(file, selectedBucket, fullObjectName);
      
      showSuccess('File uploaded successfully');
      setFile(null);
      setObjectName('');
      fetchObjects();
    } catch (error) {
      console.error('Failed to upload file:', error);
      showError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDownload = async (objectName) => {
    try {
      const result = await StorageService.getPresignedUrl(selectedBucket, objectName);
      
      // Open the URL in a new tab
      window.open(result.url, '_blank');
    } catch (error) {
      console.error('Failed to generate download link:', error);
      showError('Failed to download file');
    }
  };
  
  const handleDelete = async (objectName) => {
    if (window.confirm('Are you sure you want to delete this object?')) {
      try {
        await StorageService.deleteObject(selectedBucket, objectName);
        
        showSuccess('Object deleted successfully');
        fetchObjects();
      } catch (error) {
        console.error('Failed to delete object:', error);
        showError('Failed to delete object');
      }
    }
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
      setCurrentPrefix(prefixWithoutTrailingSlash.substring(0, lastSlashIndex + 1));
    } else {
      // Navigate to root
      setCurrentPrefix('');
    }
  };
  
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Storage Browser
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel id="bucket-select-label">Bucket</InputLabel>
                  <Select
                    labelId="bucket-select-label"
                    value={selectedBucket}
                    onChange={handleBucketChange}
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
                  onClick={fetchObjects}
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
                    onClick={navigateUp}
                    sx={{ mt: 1 }}
                  >
                    Go up one level
                  </Button>
                )}
              </Box>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Last Modified</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : objects.length > 0 ? (
                      objects.map((obj) => (
                        <TableRow key={obj.name}>
                          <TableCell>
                            {obj.isFolder ? (
                              <Link
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  cursor: 'pointer' 
                                }}
                                onClick={() => navigateToFolder(obj.prefix)}
                              >
                                <FolderIcon color="primary" sx={{ mr: 1 }} />
                                {obj.name}
                              </Link>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FileIcon sx={{ mr: 1 }} />
                                {obj.name}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            {obj.isFolder ? '—' : formatSize(obj.size)}
                          </TableCell>
                          <TableCell>
                            {obj.lastModified ? new Date(obj.lastModified).toLocaleString() : '—'}
                          </TableCell>
                          <TableCell align="right">
                            {!obj.isFolder && (
                              <>
                                <IconButton
                                  color="primary"
                                  onClick={() => handleDownload(obj.name.startsWith(currentPrefix) ? obj.name : currentPrefix + obj.name)}
                                >
                                  <DownloadIcon />
                                </IconButton>
                                <IconButton
                                  color="error"
                                  onClick={() => handleDelete(obj.name.startsWith(currentPrefix) ? obj.name : currentPrefix + obj.name)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No objects found in this location
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
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
                  onChange={handleFileChange}
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
                onChange={(e) => setObjectName(e.target.value)}
                margin="normal"
                helperText={currentPrefix ? `Will be stored as: ${currentPrefix}${objectName}` : null}
              />
              
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={!file || !objectName || uploading}
                sx={{ mt: 2 }}
              >
                {uploading ? <CircularProgress size={24} /> : 'Upload'}
              </Button>
            </CardContent>
          </Card>
          
          <Card sx={{ mt: 4 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Information
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Typography variant="body2" paragraph>
                <strong>Default Buckets:</strong>
              </Typography>
              <ul>
                <li><Typography variant="body2">workflow-artifacts: Intermediate workflow data</Typography></li>
                <li><Typography variant="body2">workflow-inputs: Input files for workflows</Typography></li>
                <li><Typography variant="body2">workflow-outputs: Final results from workflows</Typography></li>
              </ul>
              
              <Typography variant="body2" sx={{ mt: 2 }}>
                Files uploaded here are accessible to your workflows by using the Minio endpoint.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default StorageBrowser;
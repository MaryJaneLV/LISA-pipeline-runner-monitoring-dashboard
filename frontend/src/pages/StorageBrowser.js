import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import StorageService from '../services/storage.service';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import BucketSelector from '../components/storage/BucketSelector';
import StorageFileList from '../components/storage/StorageFileList';
import FileUploader from '../components/storage/FileUploader';
import StorageInfo from '../components/storage/StorageInfo';
import { processObjects } from '../utils/storageUtils';

const DEFAULT_BUCKET = 'pipeline-runner-artifacts';

function StorageBrowser() {
  const { showSuccess, showError } = useNotification();
  const { user } = useAuth();
  const userId = user?._id;
  
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  
  // File upload state
  const [file, setFile] = useState(null);
  const [objectName, setObjectName] = useState('');
  
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
    if (userId && currentPrefix === '') {
      handleTabChange(null, selectedTab);
    }
  }, [userId, currentPrefix, handleTabChange, selectedTab]);
  
  useEffect(() => {
    if (currentPrefix) {
      fetchObjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrefix]);
  
  useEffect(() => {
    const handleStorageRefresh = () => {
      if (currentPrefix) {
        fetchObjects();
      }
    };
    
    window.addEventListener('storage:refresh', handleStorageRefresh);
    
    return () => {
      window.removeEventListener('storage:refresh', handleStorageRefresh);
    };
  }, [currentPrefix]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchObjects = async () => {
    setLoading(true);
    try {
      const result = await StorageService.listObjects(DEFAULT_BUCKET, currentPrefix);
      
      // Process objects to handle folders
      const processedObjects = processObjects(result.objects, currentPrefix);
      setObjects(processedObjects);
    } catch (error) {
      console.error('Failed to fetch objects:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
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
    
    // Determine if we need to add an input/ or output/ subfolder
    let targetPrefix = currentPrefix;
    // Only add input/ if we're at the root level, not in any of the standard folders or their subfolders
    if (!targetPrefix.includes('/input/') && 
        !targetPrefix.includes('/output/') && 
        !targetPrefix.includes('/scripts/')) {
      // Default to input/ if not in any standard subfolder or their children
      targetPrefix = `${targetPrefix}${targetPrefix.endsWith('/') ? '' : '/'}input/`;
    }
    
    setUploading(true);
    try {
      const fullObjectName = targetPrefix + objectName;
      await StorageService.uploadFile(file, DEFAULT_BUCKET, fullObjectName);
      
      showSuccess('File uploaded successfully');
      setFile(null);
      setObjectName('');
      // Navigate to the folder where the file was uploaded
      setCurrentPrefix(targetPrefix);
      fetchObjects();
    } catch (error) {
      console.error('Failed to upload file:', error);
      showError(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDownload = async (objectName) => {
    try {
      showSuccess('Starting download...');
      
      // Make sure the object name includes the correct user prefix if needed
      let fullObjectName = objectName;
      
      // If the path doesn't already include the user ID and isn't a public file,
      // ensure it has the proper user prefix for authorization
      if (userId && !objectName.includes(`${userId}/`) && !objectName.startsWith('public/')) {
        // Two cases:
        // 1. Path already has the currentPrefix (e.g., "userId/input/file.csv")
        // 2. Path is relative to currentPrefix (e.g., just "file.csv" while in the "userId/input/" folder)
        
        if (objectName.startsWith(currentPrefix)) {
          // Case 1: Path already has the prefix
          fullObjectName = objectName;
        } else {
          // Case 2: Path is relative to current prefix
          fullObjectName = `${currentPrefix}${objectName}`;
        }
        
        console.log('- Adjusted path for authorization:', fullObjectName);
      }
      
      const filename = fullObjectName.split('/').pop();
      
      const token = localStorage.getItem('token');
      
      const downloadUrl = StorageService.getDownloadUrl(DEFAULT_BUCKET, fullObjectName);
      
      try {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.target = '_blank'; 
        
        // Add token to URL if available
        if (token) {
          // Add token as a query parameter instead of header
          const separator = downloadUrl.includes('?') ? '&' : '?';
          a.href = `${downloadUrl}${separator}token=${encodeURIComponent(token)}`;
        }
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showSuccess(`Download started for "${filename}"`);
      } catch (fetchError) {
        console.error('Fetch download failed:', fetchError);
        showError(`Download failed: ${fetchError.message}`);
      }
    } catch (error) {
      console.error('Failed to start download:', error);
      showError(error);
    }
  };
  
  const handleDelete = async (objectName) => {
    if (window.confirm('Are you sure you want to delete this object?')) {
      try {
        await StorageService.deleteObject(DEFAULT_BUCKET, objectName);
        
        showSuccess('Object deleted successfully');
        fetchObjects();
      } catch (error) {
        console.error('Failed to delete object:', error);
        showError(error);
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
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Storage Browser
      </Typography>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <BucketSelector 
                bucket={DEFAULT_BUCKET}
                onRefresh={navigateUp}
                currentPrefix={currentPrefix}
              />
              
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab label="My Files" />
                <Tab label="Public Files" />
              </Tabs>
              
              {!currentPrefix && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please select a storage location to view files.
                </Alert>
              )}
              
              <StorageFileList 
                loading={loading}
                objects={objects}
                onFolderClick={navigateToFolder}
                onDownload={handleDownload}
                onDelete={handleDelete}
                currentPrefix={currentPrefix}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <FileUploader 
                file={file}
                objectName={objectName}
                onFileChange={handleFileChange}
                onObjectNameChange={(e) => setObjectName(e.target.value)}
                onUpload={handleUpload}
                uploading={uploading}
                currentPrefix={currentPrefix}
              />
            </CardContent>
          </Card>
          
          <Card sx={{ mt: 4 }}>
            <CardContent>
              <StorageInfo />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default StorageBrowser;
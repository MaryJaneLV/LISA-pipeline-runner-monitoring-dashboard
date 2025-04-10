import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import StorageService from '../services/storage.service';
import { useNotification } from '../contexts/NotificationContext';
import BucketSelector from '../components/storage/BucketSelector';
import StorageFileList from '../components/storage/StorageFileList';
import FileUploader from '../components/storage/FileUploader';
import StorageInfo from '../components/storage/StorageInfo';
import { formatSize, processObjects } from '../utils/storageUtils';

const DEFAULT_BUCKETS = ['pipeline-runner-artifacts'];

function StorageBrowser() {
  const { showSuccess, showError } = useNotification();
  
  const [selectedBucket, setSelectedBucket] = useState(DEFAULT_BUCKETS[0]);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // File upload state
  const [file, setFile] = useState(null);
  const [objectName, setObjectName] = useState('');
  
  useEffect(() => {
    if (!selectedBucket) {
      setSelectedBucket(DEFAULT_BUCKETS[0]);
    }
  }, [selectedBucket]);
  
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
      const processedObjects = processObjects(result.objects, currentPrefix);
      setObjects(processedObjects);
    } catch (error) {
      console.error('Failed to fetch objects:', error);
      showError('Failed to load objects from storage');
    } finally {
      setLoading(false);
    }
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
                buckets={DEFAULT_BUCKETS}
                selectedBucket={selectedBucket}
                onBucketChange={handleBucketChange}
                onRefresh={navigateUp}
                currentPrefix={currentPrefix}
              />
              
              <StorageFileList 
                loading={loading}
                objects={objects}
                onFolderClick={navigateToFolder}
                onDownload={handleDownload}
                onDelete={handleDelete}
                formatSize={formatSize}
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
                formatSize={formatSize}
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
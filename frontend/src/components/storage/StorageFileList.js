import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  CreateNewFolder as CreateFolderIcon
} from '@mui/icons-material';
import { formatSize } from '../../utils/storageUtils';
import StorageService from '../../services/storage.service';

function StorageFileList({ 
  loading, 
  objects, 
  onFolderClick, 
  onDownload, 
  onDelete,
  currentPrefix 
}) {
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  const openCreateFolderDialog = () => {
    setNewFolderName('');
    setCreateFolderOpen(true);
  };
  
  const closeCreateFolderDialog = () => {
    setCreateFolderOpen(false);
  };
  
  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    
    setIsCreatingFolder(true);
    try {
      const folderPath = `${currentPrefix}${newFolderName}`;
      
      await StorageService.createFolder('pipeline-runner-artifacts', folderPath);
      
      closeCreateFolderDialog();
      
      window.dispatchEvent(new CustomEvent('storage:refresh'));
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert(error.response?.data?.message || 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };
  const handleDownloadClick = (obj) => {
    const objectName = obj.name.startsWith(currentPrefix) ? 
      obj.name : currentPrefix + obj.name;
    
    onDownload(objectName);
  };
  
  return (
    <>
      {currentPrefix && (currentPrefix.includes('/input/') || 
          currentPrefix.includes('/output/') || 
          currentPrefix.includes('/scripts/')) && (
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            startIcon={<CreateFolderIcon />}
            variant="outlined"
            size="small"
            onClick={openCreateFolderDialog}
          >
            New Folder
          </Button>
        </Box>
      )}
      
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
                        onClick={() => onFolderClick(obj.prefix)}
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
                          onClick={() => handleDownloadClick(obj)}
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => onDelete(obj.name.startsWith(currentPrefix) ? obj.name : currentPrefix + obj.name)}
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
                  <Typography variant="body1">No objects found in this location</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onClose={closeCreateFolderDialog}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter a name for the new folder. The folder will be created at the current location.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            disabled={isCreatingFolder}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateFolderDialog} disabled={isCreatingFolder}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFolder} 
            variant="contained" 
            disabled={!newFolderName || isCreatingFolder}
          >
            {isCreatingFolder ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default StorageFileList;
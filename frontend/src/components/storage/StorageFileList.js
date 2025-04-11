import React from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';

function StorageFileList({ 
  loading, 
  objects, 
  onFolderClick, 
  onDownload, 
  onDelete,
  formatSize,
  currentPrefix 
}) {
  // Function to handle file download
  const handleDownloadClick = (obj) => {
    const objectName = obj.name.startsWith(currentPrefix) ? 
      obj.name : currentPrefix + obj.name;
    
    // Call the parent handler to download the file
    onDownload(objectName);
  };
  
  return (
    <>
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
    </>
  );
}

export default StorageFileList;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import TemplateService from '../services/template.service';
import { useNotification } from '../contexts/NotificationContext';

function TemplateList() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await TemplateService.getTemplates({
        page: page + 1,
        limit: rowsPerPage,
      });
      
      setTemplates(result.data);
      setTotalCount(result.pagination.total);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      showError(error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleViewTemplate = (id) => {
    navigate(`/templates/${id}`);
  };
  
  const handleEditTemplate = (id) => {
    navigate(`/templates/${id}/edit`);
  };
  
  const handleDeleteTemplate = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await TemplateService.deleteTemplate(id);
        showSuccess('Template deleted successfully');
        fetchTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
        showError(error);
      }
    }
  };
  
  return (
    <Box>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" component="h1" gutterBottom>
          Workflow Templates
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTemplates}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/templates/create')}
          >
            New Template
          </Button>
        </Box>
      </Box>
      
      <Card>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Visibility</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.length > 0 ? (
                    templates.map((template) => (
                      <TableRow key={template._id}>
                        <TableCell>{template.name}</TableCell>
                        <TableCell>{template.version}</TableCell>
                        <TableCell>
                          <Chip
                            label={template.isPublic ? 'Public' : 'Private'}
                            color={template.isPublic ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(template.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            color="primary"
                            onClick={() => handleViewTemplate(template._id)}
                          >
                            <ViewIcon />
                          </IconButton>
                          <IconButton
                            color="secondary"
                            onClick={() => handleEditTemplate(template._id)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteTemplate(template._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No templates found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Card>
    </Box>
  );
}

export default TemplateList;
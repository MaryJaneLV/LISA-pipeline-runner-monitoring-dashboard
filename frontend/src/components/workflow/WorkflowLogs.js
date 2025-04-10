import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  Alert
} from '@mui/material';
import WorkflowService from '../../services/workflow.service';

const getLogColor = (logLine) => {
  if (logLine.includes('error') || logLine.includes('Error') || logLine.includes('ERROR')) {
    return '#ff5252';
  } else if (logLine.includes('warn') || logLine.includes('Warn') || logLine.includes('WARNING')) {
    return '#ffb74d';
  } else if (logLine.includes('info') || logLine.includes('Info') || logLine.includes('INFO')) {
    return '#90caf9';
  } else if (logLine.includes('success') || logLine.includes('Success') || logLine.includes('Successfully')) {
    return '#66bb6a';
  }
  return '#f8f8f8';
};

const parseLogEntry = (line) => {
  try {
    const parsed = JSON.parse(line);
    if (parsed.result && parsed.result.content) {
      return parsed.result.content;
    }
    return null;
  } catch (e) {
    return line;
  }
};

const formatLogs = (logs) => {
  if (!logs) return [];
  
  // Split log string into lines
  const lines = logs.split('\n');
  
  // Parse each line and extract content field
  return lines
    .map(parseLogEntry)
    .filter(Boolean); // Remove null entries
};


function WorkflowLogs({ workflowId }) {
  const [formattedLogs, setFormattedLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await WorkflowService.getWorkflowLogs(workflowId);
      const formatted = formatLogs(result.logs);
      setFormattedLogs(formatted);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to fetch logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (workflowId) {
      fetchLogs();
    }
  }, [workflowId, fetchLogs]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Workflow Logs</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper
          sx={{
            p: 2,
            backgroundColor: '#1e1e1e',
            color: '#f8f8f8',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: '500px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        >
          {formattedLogs.length > 0 ? (
            <Box component="pre" sx={{ margin: 0 }}>
              {formattedLogs.map((line, index) => (
                <Box 
                  component="div" 
                  key={index} 
                  sx={{ 
                    borderBottom: '1px solid #333',
                    py: 0.5,
                    color: getLogColor(line)
                  }}
                >
                  {line}
                </Box>
              ))}
            </Box>
          ) : 'No logs available.'}
        </Paper>
      )}
    </Box>
  );
}

export default WorkflowLogs;
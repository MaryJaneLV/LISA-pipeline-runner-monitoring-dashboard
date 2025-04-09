import React from 'react';
import { Box, Button, FormControlLabel, Switch } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Stop as StopIcon,
  Replay as ReplayIcon,
  Delete as DeleteIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

function WorkflowActions({ 
  workflow, 
  realtimeEnabled, 
  setRealtimeEnabled, 
  onRefresh, 
  onTerminate, 
  onResubmit, 
  onDelete, 
  onSuspend, 
  onResume 
}) {
  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={realtimeEnabled}
            onChange={(e) => setRealtimeEnabled(e.target.checked)}
            color="primary"
          />
        }
        label="Real-time updates"
        sx={{ mr: 2 }}
      />
      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={onRefresh}
        sx={{ mr: 1 }}
      >
        Refresh
      </Button>
      {workflow?.status === 'Running' && (
        <>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<PauseIcon />}
            onClick={onSuspend}
            sx={{ mr: 1 }}
          >
            Suspend
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={onTerminate}
            sx={{ mr: 1 }}
          >
            Terminate
          </Button>
        </>
      )}
      {workflow?.status === 'Suspended' && (
        <Button
          variant="outlined"
          color="info"
          startIcon={<PlayArrowIcon />}
          onClick={onResume}
          sx={{ mr: 1 }}
        >
          Resume
        </Button>
      )}
      {workflow?.status === 'Pending' && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<StopIcon />}
          onClick={onTerminate}
          sx={{ mr: 1 }}
        >
          Terminate
        </Button>
      )}
      {(workflow?.status === 'Succeeded' || workflow?.status === 'Failed' || workflow?.status === 'Terminated') && (
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<ReplayIcon />}
          onClick={onResubmit}
          sx={{ mr: 1 }}
        >
          Resubmit
        </Button>
      )}
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={onDelete}
      >
        Delete
      </Button>
    </Box>
  );
}

export default WorkflowActions;
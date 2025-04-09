export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return 'success';
    case 'running':
      return 'info';
    case 'pending':
      return 'warning';
    case 'suspended':
      return 'warning';
    case 'failed':
    case 'terminated':
      return 'error';
    default:
      return 'default';
  }
};
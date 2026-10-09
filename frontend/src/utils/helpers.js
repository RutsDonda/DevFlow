/**
 * Format a date string to a human-readable format
 */
export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

/**
 * Truncate a string to a given length
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate a random color for agent avatars
 */
export const getAgentColor = (agentType) => {
  const colors = {
    coding: 'bg-emerald-500',
    documentation: 'bg-blue-500',
    monitor: 'bg-amber-500',
  };
  return colors[agentType] || 'bg-gray-500';
};

/**
 * Get status-specific styles
 */
export const getStatusStyle = (status) => {
  const styles = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    idle: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    working: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    completed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  };
  return styles[status] || styles.idle;
};

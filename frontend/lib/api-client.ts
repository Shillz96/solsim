// Re-export the API client for backwards compatibility with tests
import apiClient from './api';

export default apiClient;
export type { ApiError } from './api';

import axios from "axios";
import API_CONFIG from "../config/api.js";

const api = axios.create({
  baseURL: API_CONFIG.getApiUrl("jobs"),
  ...API_CONFIG.axiosConfig,
});

const apiArchived = axios.create({
  baseURL: API_CONFIG.getApiUrl("archived"),
  ...API_CONFIG.axiosConfig,
});

// ✅ Fetch all archived jobs (soft deleted)
export const getArchivedJobs = (params = {}) =>
  apiArchived.get("/", { params });

// ✅ Restore a job (undo soft delete)
export const restoreJob = (id) => apiArchived.patch(`/${id}/restore`);

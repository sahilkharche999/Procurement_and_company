// const RAW_SERVER_URL = import.meta.env.VITE_SERVER_URL || "/editor-api"; // for deployment
const RAW_SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8000/";

export const SERVER_URL = RAW_SERVER_URL.endsWith("/")
  ? RAW_SERVER_URL
  : `${RAW_SERVER_URL}/`;

export const buildServerUrl = (path = "") => {
  const value = String(path || "").trim();
  if (!value) return SERVER_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SERVER_URL}${value.replace(/^\/+/, "")}`;
};

const RAW_SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://18.217.140.21:8000/";

export const SERVER_URL = RAW_SERVER_URL.endsWith("/")
  ? RAW_SERVER_URL
  : `${RAW_SERVER_URL}/`;

export const buildServerUrl = (path = "") =>
  `${SERVER_URL}${String(path).replace(/^\/+/, "")}`;

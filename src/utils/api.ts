const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Ensure it ends with /api (without duplicate /api/api or trailing slash)
const cleanedApiUrl = rawApiUrl.replace(/\/$/, ""); // remove trailing slash
export const apiUrl = cleanedApiUrl.endsWith("/api") ? cleanedApiUrl : `${cleanedApiUrl}/api`;

export const backendUrl = apiUrl.replace(/\/api$/, "");

export const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || backendUrl || "http://localhost:4000";

export const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalizedBackendUrl = backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${normalizedBackendUrl}${normalizedPath}`;
};

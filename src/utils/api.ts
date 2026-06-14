const DEFAULT_LOCAL_API = "http://localhost:4000/api";
const DEFAULT_PRODUCTION_API = "https://api.carrygoo.in/api";

function resolveApiUrl(): string {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "";

    if (!raw) {
        return typeof window !== "undefined" && window.location.hostname !== "localhost"
            ? DEFAULT_PRODUCTION_API
            : DEFAULT_LOCAL_API;
    }

    if (!/^https?:\/\//i.test(raw)) {
        console.error(
            "[Carry Goo] Invalid NEXT_PUBLIC_API_URL:",
            raw,
            "— expected https://api.carrygoo.in/api (not the Google Maps key).",
        );
        return typeof window !== "undefined" && window.location.hostname !== "localhost"
            ? DEFAULT_PRODUCTION_API
            : DEFAULT_LOCAL_API;
    }

    return raw;
}

const rawApiUrl = resolveApiUrl();

// Ensure it ends with /api (without duplicate /api/api or trailing slash)
const cleanedApiUrl = rawApiUrl.replace(/\/$/, ""); // remove trailing slash
export const apiUrl = cleanedApiUrl.endsWith("/api") ? cleanedApiUrl : `${cleanedApiUrl}/api`;

export const backendUrl = apiUrl.replace(/\/api$/, "");

function resolveSocketUrl(): string {
    const raw = process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || "";
    if (raw && /^https?:\/\//i.test(raw)) return raw.replace(/\/$/, "");
    if (raw && !/^https?:\/\//i.test(raw)) {
        console.error(
            "[Carry Goo] Invalid NEXT_PUBLIC_SOCKET_URL:",
            raw,
            "— expected https://api.carrygoo.in (not the Google Maps key).",
        );
    }
    return backendUrl || "http://localhost:4000";
}

export const socketUrl = resolveSocketUrl();

export const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalizedBackendUrl = backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return `${normalizedBackendUrl}${normalizedPath}`;
};

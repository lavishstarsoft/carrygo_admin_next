export const GOOGLE_MAPS_LOADER_ID = "carrygo-admin-google-maps";

export const GOOGLE_MAPS_LIBRARIES: (
    "drawing" | "geometry" | "places" | "visualization"
)[] = ["drawing", "geometry", "places"];

export const GOOGLE_MAPS_API_KEY =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";

export const hasGoogleMapsKey = () => GOOGLE_MAPS_API_KEY.length > 10;

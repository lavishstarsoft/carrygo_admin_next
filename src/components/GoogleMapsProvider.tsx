"use client";

import React, { createContext, useContext } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import {
    GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_LIBRARIES,
    GOOGLE_MAPS_LOADER_ID,
    hasGoogleMapsKey,
} from "@/lib/googleMaps";

type GoogleMapsContextValue = {
    isLoaded: boolean;
    loadError: Error | undefined;
    apiKey: string;
};

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
    isLoaded: false,
    loadError: undefined,
    apiKey: "",
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: GOOGLE_MAPS_LOADER_ID,
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
        preventGoogleFontsLoading: true,
    });

    return (
        <GoogleMapsContext.Provider
            value={{
                isLoaded: hasGoogleMapsKey() ? isLoaded : false,
                loadError,
                apiKey: GOOGLE_MAPS_API_KEY,
            }}
        >
            {children}
        </GoogleMapsContext.Provider>
    );
}

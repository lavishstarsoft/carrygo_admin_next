"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
    authFailed: boolean;
    apiKey: string;
};

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
    isLoaded: false,
    loadError: undefined,
    authFailed: false,
    apiKey: "",
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
    const [authFailed, setAuthFailed] = useState(false);

    const { isLoaded, loadError } = useJsApiLoader({
        id: GOOGLE_MAPS_LOADER_ID,
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
        preventGoogleFontsLoading: true,
    });

    useEffect(() => {
        const w = window as Window & { gm_authFailure?: () => void };
        const previous = w.gm_authFailure;
        w.gm_authFailure = () => {
            setAuthFailed(true);
            previous?.();
        };
        return () => {
            w.gm_authFailure = previous;
        };
    }, []);

    return (
        <GoogleMapsContext.Provider
            value={{
                isLoaded: hasGoogleMapsKey() && !authFailed ? isLoaded : false,
                loadError,
                authFailed,
                apiKey: GOOGLE_MAPS_API_KEY,
            }}
        >
            {children}
        </GoogleMapsContext.Provider>
    );
}

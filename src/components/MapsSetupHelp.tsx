"use client";

import React from "react";

type Props = {
    title?: string;
    detail?: string;
};

export default function MapsSetupHelp({ title, detail }: Props) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-sm font-black text-amber-900">
                {title || "Google Maps setup required"}
            </p>
            <p className="text-xs text-amber-800 mt-2 max-w-lg leading-relaxed">
                Admin panel browser map ki Google Cloud lo billing + APIs enable cheyali:
            </p>
            <ol className="text-[11px] text-amber-900 mt-3 max-w-lg text-left space-y-1.5 list-decimal list-inside">
                <li>
                    <a
                        href="https://console.cloud.google.com/billing"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-bold"
                    >
                        Billing enable
                    </a>{" "}
                    cheyandi (free tier undi)
                </li>
                <li>APIs enable: <strong>Maps JavaScript API</strong>, <strong>Maps Static API</strong>, <strong>Places API</strong></li>
                <li>
                    API key → Application restrictions → HTTP referrers:
                    {" "}<code className="bg-white px-1 rounded">http://localhost:3000/*</code>
                    {" "}+ Vercel/admin domain
                </li>
                <li>Vercel lo <code className="bg-white px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> env var set cheyandi</li>
            </ol>
            {detail ? (
                <p className="text-[10px] text-amber-700 mt-3 font-mono break-all max-w-lg">{detail}</p>
            ) : null}
        </div>
    );
}

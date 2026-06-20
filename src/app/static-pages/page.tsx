"use client";

import React, { useState, useEffect } from "react";
import { apiUrl } from "@/utils/api";

const TABS = [
    { id: "support_help", label: "Support & Help" },
    { id: "terms_conditions", label: "Terms & Conditions" },
    { id: "privacy_policy", label: "Privacy Policy" },
    { id: "about_us", label: "About CarryGo" },
];

export default function StaticPages() {
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const [content, setContent] = useState<Record<string, string>>({
        support_help: "",
        terms_conditions: "",
        privacy_policy: "",
        about_us: "",
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchStaticPages = async () => {
            try {
                const res = await fetch(`${apiUrl}/settings/static_pages`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.value) {
                        setContent({
                            support_help: data.value.support_help || "",
                            terms_conditions: data.value.terms_conditions || "",
                            privacy_policy: data.value.privacy_policy || "",
                            about_us: data.value.about_us || "",
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch static pages", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStaticPages();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${apiUrl}/settings/static_pages`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ value: content }),
            });

            if (res.ok) {
                setMessage({ text: "Content saved successfully!", type: "success" });
            } else {
                setMessage({ text: "Failed to save content.", type: "error" });
            }
        } catch (error) {
            console.error("Save error", error);
            setMessage({ text: "Network error occurred.", type: "error" });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Static Pages Management</h1>
                    <p className="text-slate-500 mt-1 text-sm">Update the content for your app's support, terms, and policies dynamically.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-cyan-500/30 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center min-w-[120px]"
                >
                    {isSaving ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        "Save Changes"
                    )}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Tabs / Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 rounded-xl text-left font-medium transition-colors ${
                                activeTab === tab.id 
                                    ? "bg-white text-cyan-600 shadow-sm border border-slate-200" 
                                    : "text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Editor Area */}
                <div className="flex-1 p-6 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-slate-800">{TABS.find(t => t.id === activeTab)?.label}</h2>
                        <p className="text-sm text-slate-500">You can use basic text formatting. Paragraphs separated by blank lines will be rendered neatly in the app.</p>
                    </div>

                    <textarea
                        value={content[activeTab]}
                        onChange={(e) => setContent(prev => ({ ...prev, [activeTab]: e.target.value }))}
                        className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none resize-none font-mono text-sm text-slate-700 leading-relaxed custom-scrollbar"
                        placeholder={`Enter content for ${TABS.find(t => t.id === activeTab)?.label}...`}
                    />
                </div>
            </div>
        </div>
    );
}

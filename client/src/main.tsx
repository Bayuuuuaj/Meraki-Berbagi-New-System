import { createRoot } from "react-dom/client";
import { Suspense } from "react";
import App from "./App";
import "./index.css";
import { Loader2 } from "lucide-react";

// Monkey-patch fetch to globally add ngrok-skip-browser-warning header
if (typeof window !== "undefined") {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const [resource, config] = args;
        const newConfig = { ...config };
        newConfig.headers = {
            ...newConfig.headers,
            "ngrok-skip-browser-warning": "69420", // Use any value
        };
        return originalFetch(resource, newConfig);
    };
}

const rootElement = document.getElementById("root");
if (rootElement) {
    createRoot(rootElement).render(
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <App />
        </Suspense>
    );
}

// Register Service Worker for PWA (Soft Update - No Forced Reload)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('[PWA] Service Worker registered successfully');

            // Log when update is available, but don't force reload
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('[PWA] New version available. Will update on next visit.');
                        }
                    });
                }
            });
        }).catch(registrationError => {
            console.log('[PWA] SW registration failed: ', registrationError);
        });
    });
}

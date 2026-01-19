import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Monkey-patch fetch to globally add ngrok-skip-browser-warning header
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

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
        }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
    });
}

"use client";

import dynamic from "next/dynamic";

// Dynamically import AppsIcons with SSR disabled
const AppsIcons = dynamic(
    () => import("@/components/apps").then((mod) => mod.AppsIcons),
    {
        ssr: false,
        // Optional: Add a loading component if desired
        // loading: () => <p>Loading desktop...</p>,
    },
);

// This component just renders the dynamically imported AppsIcons
export default function DynamicAppsIcons() {
    return <AppsIcons />;
}

"use client";

import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import Image from "next/image";
import { taskbarAppsAtom, toggleTaskbarAtom } from "@/atoms/windowAtoms";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const Taskbar: React.FC = () => {
    const [apps] = useAtom(taskbarAppsAtom);
    const toggleWindow = useAtom(toggleTaskbarAtom)[1];
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return (
        <TooltipProvider delayDuration={100}>
            <div className="fixed bottom-0 left-0 right-0 h-12 bg-background/80 backdrop-blur-md border-t border-border z-[2000] flex items-center justify-center px-4 shadow-lg">
                <div className="flex items-center space-x-2 overflow-x-auto max-w-full scrollbar-hide">
                    {hasMounted && apps.map((app) => (
                        <Tooltip key={app.id}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => toggleWindow(app.id)}
                                    className={cn(
                                        "p-1.5 rounded-md flex items-center justify-center transition-colors duration-150 ease-in-out hover:bg-accent group relative",
                                        app.isActive
                                            ? "bg-accent/80"
                                            : "bg-transparent",
                                    )}
                                    aria-label={`Toggle ${app.title}`}
                                >
                                    <Image
                                        src={app.iconSrc}
                                        alt={app.title}
                                        width={28}
                                        height={28}
                                        className="drop-shadow-sm"
                                    />
                                    {/* Indicator Dot for Minimized/Open */}
                                    <span
                                        className={cn(
                                            "absolute bottom-0.5 left-1/2 transform -translate-x-1/2 h-1 w-4 rounded-full",
                                            app.isMinimized
                                                ? "bg-secondary"
                                                : app.isActive
                                                ? "bg-primary"
                                                : "bg-muted-foreground/50",
                                        )}
                                    >
                                    </span>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <p>{app.title}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
};

export default Taskbar;

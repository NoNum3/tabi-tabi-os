"use client";

import * as React from "react";
import * as ToolbarPrimitive from "@radix-ui/react-toolbar";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toolbarVariants = cva(
    "relative flex select-none items-stretch gap-1 bg-muted",
    {
        variants: {
            orientation: {
                horizontal:
                    "h-10 min-w-min rounded-md border border-border p-1",
                vertical:
                    "h-min min-w-min flex-col rounded-md border border-border p-1",
            },
        },
        defaultVariants: {
            orientation: "horizontal",
        },
    },
);

const Toolbar = React.forwardRef<
    React.ElementRef<typeof ToolbarPrimitive.Root>,
    & React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Root>
    & VariantProps<typeof toolbarVariants>
>(({ className, orientation = "horizontal", ...props }, ref) => (
    <ToolbarPrimitive.Root
        ref={ref}
        className={cn(toolbarVariants({ orientation }), className)}
        orientation={orientation}
        {...props}
    />
));
Toolbar.displayName = ToolbarPrimitive.Root.displayName;

const ToolbarLink = React.forwardRef<
    React.ElementRef<typeof ToolbarPrimitive.Link>,
    React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Link>
>(({ className, ...props }, ref) => (
    <ToolbarPrimitive.Link
        ref={ref}
        className={cn("hover:text-primary", className)} // Basic styling
        {...props}
    />
));
ToolbarLink.displayName = ToolbarPrimitive.Link.displayName;

const ToolbarButton = React.forwardRef<
    React.ElementRef<typeof ToolbarPrimitive.Button>,
    React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Button>
>(({ className, ...props }, ref) => (
    <ToolbarPrimitive.Button
        ref={ref}
        className={cn(
            "flex-none rounded px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
            className,
        )}
        {...props}
    />
));
ToolbarButton.displayName = ToolbarPrimitive.Button.displayName;

const ToolbarSeparator = React.forwardRef<
    React.ElementRef<typeof ToolbarPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <ToolbarPrimitive.Separator
        ref={ref}
        className={cn(
            "shrink-0 bg-border",
            props.orientation === "vertical" ? "h-px w-full" : "h-full w-px",
            className,
        )}
        {...props}
    />
));
ToolbarSeparator.displayName = ToolbarPrimitive.Separator.displayName;

const ToolbarToggleGroup = React.forwardRef<
    React.ElementRef<typeof ToolbarPrimitive.ToggleGroup>,
    React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleGroup>
>(({ className, ...props }, ref) => (
    <ToolbarPrimitive.ToggleGroup
        ref={ref}
        className={cn("flex items-center gap-1", className)}
        {...props}
    />
));
ToolbarToggleGroup.displayName = ToolbarPrimitive.ToggleGroup.displayName;

const ToolbarToggleItem = React.forwardRef<
    React.ElementRef<typeof ToolbarPrimitive.ToggleItem>,
    React.ComponentPropsWithoutRef<typeof ToolbarPrimitive.ToggleItem>
>(({ className, ...props }, ref) => (
    <ToolbarPrimitive.ToggleItem
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center rounded text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
            "h-8 w-8 p-0", // Default size matching toolbar example
            className,
        )}
        {...props}
    />
));
ToolbarToggleItem.displayName = ToolbarPrimitive.ToggleItem.displayName;

export {
    Toolbar,
    ToolbarButton,
    ToolbarLink,
    ToolbarSeparator,
    ToolbarToggleGroup,
    ToolbarToggleItem,
};
 
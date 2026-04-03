"use client";

import { useState } from "react";
import Image from "next/image";
import { Globe } from "lucide-react";

export function FaviconImage({ domain, size = 32, className = "" }) {
    const [error, setError] = useState(false);
    
    // Normalize domain
    const host = String(domain || "").split(" · ")[0].trim();
    
    if (!host || error) {
        return (
            <div 
                className={`flex items-center justify-center bg-foreground/10 rounded-lg text-muted ${className}`}
                style={{ width: size, height: size }}
            >
                <Globe size={size * 0.6} />
            </div>
        );
    }

    const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size * 2}`;

    return (
        <Image
            src={src}
            width={size}
            height={size}
            className={`${className} rounded-lg`}
            alt=""
            unoptimized
            onError={() => setError(true)}
        />
    );
}

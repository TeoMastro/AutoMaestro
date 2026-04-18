'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Animated hero visual — floating orbs + a pulsing connection diagram
 * representing the "glue" between user, platform, and clients.
 * Pure CSS animations, no dependencies.
 */
export function HeroVisual({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn('relative w-full max-w-2xl mx-auto', className)} aria-hidden="true">
      {/* Ambient orbs — large and bright for background glow */}
      <div
        className={cn(
          'absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-[100px] transition-opacity duration-1000',
          mounted ? 'opacity-100 animate-[float_8s_ease-in-out_infinite]' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-primary/25 blur-[100px] transition-opacity duration-1000 delay-300',
          mounted ? 'opacity-100 animate-[float_10s_ease-in-out_infinite_reverse]' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-primary/20 blur-[80px] transition-opacity duration-1000 delay-500',
          mounted ? 'opacity-100 animate-[pulse_6s_ease-in-out_infinite]' : 'opacity-0'
        )}
      />

      {/* Connection diagram */}
      <svg
        viewBox="0 0 600 200"
        className={cn(
          'relative w-full transition-all duration-1000 delay-200',
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        {/* Connection lines with animated dash */}
        <line x1="130" y1="100" x2="270" y2="100" className="stroke-primary/30" strokeWidth="2" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
        </line>
        <line x1="330" y1="100" x2="470" y2="100" className="stroke-primary/30" strokeWidth="2" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
        </line>

        {/* Node: You — single person silhouette */}
        <g>
          <circle cx="100" cy="100" r="40" className="fill-card stroke-primary/20" strokeWidth="2" />
          <circle cx="100" cy="100" r="40" className="fill-transparent stroke-primary/10" strokeWidth="1">
            <animate attributeName="r" values="40;46;40" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Head */}
          <circle cx="100" cy="86" r="11" className="fill-primary/50" />
          {/* Shoulders/torso — rounded arc */}
          <path d="M82 120 C82 108, 90 102, 100 102 C110 102, 118 108, 118 120" className="fill-primary/35" />
          <text x="100" y="158" textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
            You
          </text>
        </g>

        {/* Node: Platform (center, larger) */}
        <g>
          <circle cx="300" cy="100" r="50" className="fill-primary/10 stroke-primary/40" strokeWidth="2" />
          <circle cx="300" cy="100" r="50" className="fill-transparent stroke-primary/20" strokeWidth="1">
            <animate attributeName="r" values="50;58;50" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* Zap icon */}
          <path d="M294 80 L306 80 L300 96 L310 96 L296 120 L300 104 L290 104 Z" className="fill-primary" />
          <text x="300" y="158" textAnchor="middle" className="fill-primary text-[11px] font-semibold">
            Platform
          </text>
        </g>

        {/* Node: Clients — two-person silhouette */}
        <g>
          <circle cx="500" cy="100" r="40" className="fill-card stroke-primary/20" strokeWidth="2" />
          <circle cx="500" cy="100" r="40" className="fill-transparent stroke-primary/10" strokeWidth="1">
            <animate attributeName="r" values="40;46;40" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0;1" dur="3.5s" repeatCount="indefinite" />
          </circle>
          {/* Front person — head */}
          <circle cx="495" cy="86" r="9" className="fill-primary/50" />
          {/* Front person — shoulders */}
          <path d="M480 118 C480 107, 487 102, 495 102 C503 102, 510 107, 510 118" className="fill-primary/35" />
          {/* Back person — head (offset right and slightly up) */}
          <circle cx="511" cy="83" r="8" className="fill-primary/30" />
          {/* Back person — shoulders (partially behind front) */}
          <path d="M500 115 C500 106, 505 101, 511 101 C517 101, 522 106, 522 115" className="fill-primary/20" />
          <text x="500" y="158" textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium">
            Clients
          </text>
        </g>

        {/* Animated data particles traveling along the lines */}
        <circle r="3" className="fill-primary/70">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M130,100 L270,100" />
        </circle>
        <circle r="3" className="fill-primary/70">
          <animateMotion dur="2.5s" repeatCount="indefinite" begin="1.25s" path="M130,100 L270,100" />
        </circle>
        <circle r="3" className="fill-primary/50">
          <animateMotion dur="3s" repeatCount="indefinite" path="M330,100 L470,100" />
        </circle>
        <circle r="3" className="fill-primary/50">
          <animateMotion dur="3s" repeatCount="indefinite" begin="1.5s" path="M330,100 L470,100" />
        </circle>
      </svg>
    </div>
  );
}

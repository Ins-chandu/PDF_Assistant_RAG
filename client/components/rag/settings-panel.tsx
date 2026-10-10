"use client";

import { SlidersHorizontal } from "lucide-react";

interface SettingsPanelProps {
  topK: number;
  onTopKChange: (value: number) => void;
}

export function SettingsPanel({ topK, onTopKChange }: SettingsPanelProps) {
  return (
    <section className="panel-surface py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-xl bg-slate-950 p-2 text-white">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Top-K chunks</p>
          <p className="text-xs text-slate-500">Control how many retrieved chunks are sent to generation.</p>
        </div>
        <div className="ml-auto rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">{topK}</div>
        <div className="w-full">
          <input
            type="range"
            min={3}
            max={10}
            value={topK}
            onChange={(event) => onTopKChange(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-cyan-600"
          />
        </div>
      </div>
    </section>
  );
}

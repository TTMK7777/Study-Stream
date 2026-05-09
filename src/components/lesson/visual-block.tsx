import type { Visual } from "@/lib/anthropic/schemas";

import { VisualBar } from "./visual-bar";
import { VisualComparison } from "./visual-comparison";
import { VisualMetrics } from "./visual-metrics";

export function VisualBlock({ visual }: { visual: Visual }) {
  switch (visual.type) {
    case "bar":
      return <VisualBar visual={visual} />;
    case "metrics":
      return <VisualMetrics visual={visual} />;
    case "comparison":
      return <VisualComparison visual={visual} />;
    case "none":
      return null;
  }
}

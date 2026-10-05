import { Calculator, Church, Hammer, Scale, Wrench, Zap } from "lucide-react";
import { Category } from "./types";

export const CATEGORY_ICONS: Record<Category, typeof Wrench> = {
  Handyman: Hammer,
  Mechanic: Wrench,
  Attorney: Scale,
  Auditor: Calculator,
  Clergy: Church,
  Electrician: Zap,
};

export function CategoryIcon({ category, size = 16 }: { category: Category; size?: number }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={size} strokeWidth={1.8} />;
}

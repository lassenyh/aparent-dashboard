type ListProject = {
  name: string;
  internalTitle?: string | null;
  customer?: { name: string } | null;
};

export function projectListLabel(project: ListProject): string {
  return [project.internalTitle?.trim(), project.customer?.name.trim(), project.name.trim()]
    .filter(Boolean)
    .join(" · ");
}

const numberOrder = new Intl.Collator("nb", { numeric: true, sensitivity: "base" });

/** Missing numbers sort first ascending and last descending. */
export function compareProjectNumbers(a: ListProject, b: ListProject, direction: "asc" | "desc") {
  const left = a.internalTitle?.trim() || "";
  const right = b.internalTitle?.trim() || "";
  if (!left && right) return direction === "asc" ? -1 : 1;
  if (left && !right) return direction === "asc" ? 1 : -1;
  const result = numberOrder.compare(left, right);
  return result ? result * (direction === "asc" ? 1 : -1) : numberOrder.compare(a.name, b.name);
}

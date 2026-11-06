"use client";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export function CrewRoleInput({ id, value, onChange, roleOptions }: { id: string; value: string; onChange: (value: string) => void; roleOptions: string[] }) {
  const [roleSuggestionsOpen, setRoleSuggestionsOpen] = useState(false);
  const [activeRoleIndex, setActiveRoleIndex] = useState(-1);
  const roleListRef = useRef<HTMLUListElement>(null);
  const roleParts = value.split(",");
  const previousRoles = roleParts.slice(0, -1).map((role) => role.trim()).filter(Boolean);
  const roleQuery = roleParts.at(-1)?.trim().toLocaleLowerCase("nb") ?? "";
  const suggestedRoles = [...new Map(roleOptions.map((role) => [role.toLocaleLowerCase("nb"), role])).values()]
    .filter((role) => roleQuery && role.toLocaleLowerCase("nb").includes(roleQuery)
      && !previousRoles.some((selected) => selected.toLocaleLowerCase("nb") === role.toLocaleLowerCase("nb")));

  const showRoleSuggestions = roleSuggestionsOpen && suggestedRoles.length > 0;

  function chooseRole(role: string) {
    onChange([...previousRoles, role].join(", "));
    setRoleSuggestionsOpen(false);
    setActiveRoleIndex(-1);
  }

  return (
          <div className="relative">
            <Input
              id={id}
              name="roles"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showRoleSuggestions}
              aria-controls={showRoleSuggestions ? `${id}-suggestions` : undefined}
              aria-activedescendant={showRoleSuggestions && activeRoleIndex >= 0 && activeRoleIndex < suggestedRoles.length ? `${id}-option-${activeRoleIndex}` : undefined}
              autoComplete="off"
              placeholder="f.eks. DOP, Camera operator"
              value={value}
              onFocus={() => { setRoleSuggestionsOpen(true); setActiveRoleIndex(-1); }}
              onBlur={() => setRoleSuggestionsOpen(false)}
              onChange={(event) => {
                onChange(event.target.value);
                setRoleSuggestionsOpen(true);
                setActiveRoleIndex(-1);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && showRoleSuggestions) {
                  event.preventDefault();
                  event.stopPropagation();
                  setRoleSuggestionsOpen(false);
                  setActiveRoleIndex(-1);
                } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestedRoles.length) {
                  event.preventDefault();
                  setRoleSuggestionsOpen(true);
                  const next = event.key === "ArrowDown"
                    ? (activeRoleIndex + 1) % suggestedRoles.length
                    : (activeRoleIndex <= 0 ? suggestedRoles.length - 1 : activeRoleIndex - 1);
                  setActiveRoleIndex(next);
                  roleListRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
                } else if (event.key === "Enter" && showRoleSuggestions) {
                  event.preventDefault();
                  if (suggestedRoles[activeRoleIndex]) chooseRole(suggestedRoles[activeRoleIndex]);
                }
              }}
            />
            {showRoleSuggestions ? (
              <ul ref={roleListRef} id={`${id}-suggestions`} role="listbox" aria-label="Foreslåtte roller" className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto border border-border bg-popover py-1 text-popover-foreground shadow-md">
                {suggestedRoles.map((role, index) => (
                  <li
                    key={role}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={index === activeRoleIndex}
                    className={`cursor-pointer px-3 py-2.5 text-sm hover:bg-accent ${index === activeRoleIndex ? "bg-accent text-accent-foreground" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseRole(role)}
                  >{role}</li>
                ))}
              </ul>
            ) : null}
          </div>
  );
}

"use client";

import { useActionState, useCallback, useState } from "react";
import Link from "next/link";
import { createPerson } from "@/actions/crew";
import { VcardDropzone } from "@/components/crew/vcard-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { nativeSelectClassName } from "@/lib/form-classes";
import {
  emptyCrewFormFields,
  mergeVcardIntoCrewFields,
  type CrewFormFields,
  type VcardParsed,
} from "@/lib/vcard";

export function CrewNewForm() {
  const [state, action, pending] = useActionState(createPerson, null);
  const [fields, setFields] = useState<CrewFormFields>(emptyCrewFormFields);

  const onVcard = useCallback((v: VcardParsed) => {
    setFields((prev) => mergeVcardIntoCrewFields(prev, v));
  }, []);

  return (
    <form action={action} className="max-w-lg space-y-8">
      <VcardDropzone onParsed={onVcard} disabled={pending} />

      {state?.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Fornavn</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              autoComplete="given-name"
              value={fields.firstName}
              onChange={(e) =>
                setFields((f) => ({ ...f, firstName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Etternavn</Label>
            <Input
              id="lastName"
              name="lastName"
              required
              autoComplete="family-name"
              value={fields.lastName}
              onChange={(e) =>
                setFields((f) => ({ ...f, lastName: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={(e) =>
                setFields((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              name="phone"
              autoComplete="tel"
              value={fields.phone}
              onChange={(e) =>
                setFields((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="addressLine">Adresse (gate)</Label>
          <Input
            id="addressLine"
            name="addressLine"
            autoComplete="street-address"
            value={fields.addressLine}
            onChange={(e) =>
              setFields((f) => ({ ...f, addressLine: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postnummer</Label>
            <Input
              id="postalCode"
              name="postalCode"
              autoComplete="postal-code"
              value={fields.postalCode}
              onChange={(e) =>
                setFields((f) => ({ ...f, postalCode: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Poststed</Label>
            <Input
              id="city"
              name="city"
              autoComplete="address-level2"
              value={fields.city}
              onChange={(e) =>
                setFields((f) => ({ ...f, city: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Land (valgfritt)</Label>
          <Input
            id="country"
            name="country"
            autoComplete="country-name"
            value={fields.country}
            onChange={(e) =>
              setFields((f) => ({ ...f, country: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="roles">Roller (kommaseparert)</Label>
          <Input
            id="roles"
            name="roles"
            placeholder="f.eks. DOP, Camera operator"
            value={fields.roles}
            onChange={(e) =>
              setFields((f) => ({ ...f, roles: e.target.value }))
            }
          />
          <p className="text-xs text-muted-foreground">Fritekst — ingen fast liste.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultRate">Standard sats pr dag (NOK)</Label>
          <Input
            id="defaultRate"
            name="defaultRate"
            type="number"
            min={0}
            step={1}
            value={fields.defaultRate}
            onChange={(e) =>
              setFields((f) => ({ ...f, defaultRate: e.target.value }))
            }
          />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-4 text-sm font-medium text-foreground">Logistikk</legend>
        <div className="space-y-2">
          <Label htmlFor="dietaryPreference">Kosthold</Label>
          <select
            id="dietaryPreference"
            name="dietaryPreference"
            className={nativeSelectClassName}
            value={fields.dietaryPreference}
            onChange={(e) =>
              setFields((f) => ({
                ...f,
                dietaryPreference: e.target.value,
              }))
            }
          >
            <option value="none">Ingen</option>
            <option value="vegetarian">Vegetar</option>
            <option value="vegan">Vegan</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="allergies">Allergier</Label>
          <Textarea
            id="allergies"
            name="allergies"
            rows={2}
            value={fields.allergies}
            onChange={(e) =>
              setFields((f) => ({ ...f, allergies: e.target.value }))
            }
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          value="true"
          checked={fields.isActive}
          onChange={(e) =>
            setFields((f) => ({ ...f, isActive: e.target.checked }))
          }
          className="h-4 w-4 rounded border border-input"
        />
        <Label htmlFor="isActive" className="font-normal text-muted-foreground">
          Aktiv i databasen
        </Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" variant="sidebar" disabled={pending}>
          {pending ? "Lagrer…" : "Opprett person"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/crew">Avbryt</Link>
        </Button>
      </div>
    </form>
  );
}

// src/components/settings/characters-editor.tsx
"use client";
import { useState } from "react";
import { Crown, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserStore } from "@/store/user-store";
import { addCharacter, removeCharacter, setMain, updateCharacter, MAX_CHARACTERS } from "@/lib/characters";
import { CLASSES, DEFAULT_CLASS_ID } from "@/lib/classes";

function ClassSelect({ id, value, onChange }: { id: string; value: string; onChange(v: string): void }) {
  return (
    <Select value={value} items={CLASSES.map((c) => ({ value: c.id, label: c.name }))} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger id={id} className="min-h-11 w-40"><SelectValue /></SelectTrigger>
      <SelectContent>{CLASSES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function CharactersEditor() {
  const t = useTranslations("settings.characters");
  const characters = useUserStore((s) => s.data.characters);
  const update = useUserStore((s) => s.update);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState<string>(DEFAULT_CLASS_ID);
  const full = characters.length >= MAX_CHARACTERS;

  return (
    <div className="space-y-4">
      {characters.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="space-y-2">
        {characters.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2">
            <Input
              key={c.name}
              aria-label={`${t("name")}: ${c.name}`}
              defaultValue={c.name}
              maxLength={32}
              className="min-h-11 w-48"
              onBlur={(e) => {
                update((d) => updateCharacter(d, c.id, { name: e.target.value }));
                if (!e.target.value.trim()) e.target.value = c.name;
              }}
            />
            <ClassSelect id={`class-${c.id}`} value={c.classId} onChange={(v) => update((d) => updateCharacter(d, c.id, { classId: v }))} />
            {c.isMain ? (
              <Badge>{t("main")}</Badge>
            ) : (
              <Button variant="ghost" size="sm" className="min-h-11" onClick={() => update((d) => setMain(d, c.id))}>
                <Crown className="size-4" aria-hidden />
                {t("makeMain")}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={t("remove", { name: c.name })} onClick={() => {
                const before = useUserStore.getState().data;
                update((d) => removeCharacter(d, c.id));
                toast(t("removed", { name: c.name }), { action: { label: t("undo"), onClick: () => update(() => before) } });
              }}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => addCharacter(d, { name, classId }));
          setName("");
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="new-name">{t("name")}</Label>
          <Input id="new-name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} className="min-h-11 w-48" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="new-class">{t("class")}</Label>
          <ClassSelect id="new-class" value={classId} onChange={setClassId} />
        </div>
        <Button type="submit" className="min-h-11" disabled={full || !name.trim()}>{t("add")}</Button>
      </form>
      <p className="text-xs text-muted-foreground">{t("limit")}</p>
    </div>
  );
}

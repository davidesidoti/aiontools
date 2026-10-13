// src/app/[locale]/builds/[classId]/page.tsx
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { BUILD_IDS, BUILDS, buildText, classIcon } from "@/lib/builds";
import { SkillChip } from "@/components/builds/skill-chip";
import { BuildGroup, BuildSection, Priority } from "@/components/builds/build-section";
import { GEAR_META } from "@/lib/gear";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => BUILD_IDS.map((classId) => ({ locale, classId })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; classId: string }> }) {
  const { classId } = await params;
  return { title: BUILDS[classId]?.name ?? "Build" };
}

const SECTIONS = ["skills", "stigmas", "arcana", "boards", "soulbind", "endgame", "wings", "enhancing", "titles", "stones", "pantheon", "media", "links"] as const;

export default async function BuildPage({ params }: { params: Promise<{ locale: string; classId: string }> }) {
  const { locale, classId } = await params;
  const b = BUILDS[classId];
  if (!b) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("builds");
  const T = (s: string) => buildText(s, locale);
  const hint = (g: keyof typeof GEAR_META.groups) => GEAR_META.groups[g][locale === "it" ? "it" : "en"];
  const chips = (list: typeof b.skills) => (
    <div className="flex flex-wrap gap-2">{list.map((s) => <SkillChip key={`${s.rank}-${s.name}`} classId={classId} {...s} />)}</div>
  );
  const ranked = b.stigmas.filter((s) => s.rank !== undefined);
  const alternatives = b.stigmas.filter((s) => s.rank === undefined);
  const dl = (rows: [string, React.ReactNode][]) => (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="sticky top-16 z-20 -mx-4 space-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Link href="/builds" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- small class emblem */}
          <img src={classIcon(classId)} alt="" width={48} height={48} className="size-12" />
          <h1 className="font-display text-3xl font-bold">{b.name}</h1>
        </div>
        <nav aria-label={t("title")} className="-mx-1 flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <a key={s} href={`#${s}`} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
              {t(`nav.${s}`)}
            </a>
          ))}
        </nav>
      </header>

      <BuildSection id="skills" title={t("skills")}>
        <p className="text-xs text-muted-foreground">{t("skillsHint")}</p>
        {chips(b.skills)}
      </BuildSection>

      <BuildSection id="stigmas" title={t("nav.stigmas")}>
        <h3 className="text-sm font-medium">{t("stigmas")}</h3>
        {chips(ranked)}
        {alternatives.length > 0 && (
          <>
            <h3 className="text-sm font-medium">{t("stigmaAlternatives")}</h3>
            {chips(alternatives)}
          </>
        )}
        {b.passives.length > 0 && (
          <>
            <h3 className="text-sm font-medium">{t("passives")}</h3>
            {chips(b.passives)}
          </>
        )}
      </BuildSection>

      <BuildSection id="arcana" title={t("nav.arcana")}>
        <table className="w-full max-w-md text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="py-1 font-normal">{t("arcana")}</th>
              <th className="py-1 font-normal">{t("godStats")}</th>
            </tr>
          </thead>
          <tbody>
            {b.arcana.map((a, i) => (
              <tr key={`${i}-${a.set}`} className="border-t border-border/60">
                <th scope="row" className="py-1 pr-4 text-left font-normal">{a.set}</th>
                <td className="py-1">{a.stat}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="text-sm font-medium">{t("equipEffects")}</h3>
        <p className="text-xs text-muted-foreground">{t("equipEffectsHint")}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">{b.equipEffects.map((e, i) => <li key={i}><Priority items={e} /></li>)}</ol>
      </BuildSection>

      <BuildSection id="boards" title={t("boards")}>
        <div className="grid gap-4 md:grid-cols-2">
          {b.boards.map((board) => (
            <div key={board.name} className="space-y-1.5">
              <h3 className="text-sm font-medium">{t("board", { name: board.name })}</h3>
              <ul className="space-y-1 text-sm">
                {board.lines.map((l) => (
                  <li key={l.lines} className="flex flex-wrap gap-x-2">
                    <span className="shrink-0 font-mono text-xs text-primary">{t("line", { lines: l.lines })}</span>
                    <Priority items={l.priority} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </BuildSection>

      <BuildSection id="soulbind" title={t("soulbind")}>
        {b.soulbind.map((g) => (
          <div key={g.group} className="space-y-1.5">
            <h3 className="text-sm font-medium">{g.group}</h3>
            {dl(g.slots.map((s) => [s.slot, <Priority key={s.slot} items={s.priority} />]))}
          </div>
        ))}
      </BuildSection>

      <BuildSection id="gear" title={t("gearTitle")}>
        <BuildGroup id="endgame" title={t("groups.endgame")} hint={hint("endgame")}>
          {/* Task 5 fills this group */}
          <span />
        </BuildGroup>
        <BuildGroup id="wings" title={t("groups.wings")} hint={hint("wings")}>
          {dl([
            [t("wingsMeta"), b.wings.meta],
            [t("wingsLeveling"), b.wings.leveling],
          ])}
        </BuildGroup>
        <BuildGroup id="enhancing" title={t("groups.enhancing")} hint={hint("enhancing")}>
          <Priority items={b.enhancing} />
        </BuildGroup>
        <BuildGroup id="titles" title={t("groups.titles")} hint={hint("titles")}>
          {dl([
            [t("titlesOffensive"), <Priority key="o" items={b.titles.offensive} />],
            [t("titlesDefensive"), <Priority key="d" items={b.titles.defensive} />],
            [t("titlesSpecial"), <Priority key="s" items={b.titles.special} />],
          ])}
        </BuildGroup>
        <BuildGroup id="stones" title={t("groups.stones")} hint={hint("stones")}>
          {dl([
            [t("theostones"), T(b.theostones)],
            [t("manastones"), <Priority key="m" items={b.manastones} />],
          ])}
        </BuildGroup>
        <BuildGroup id="pantheon" title={t("groups.pantheon")} hint={hint("pantheon")}>
          {dl([
            [t("colossus"), T(b.pantheon.colossus)],
            [t("statues"), T(b.pantheon.statues)],
            [t("paintings"), T(b.pantheon.paintings)],
          ])}
        </BuildGroup>
      </BuildSection>

      {(b.screenshots.length > 0 || b.notes.length > 0) && (
        <BuildSection id="media" title={t("media")}>
          {b.notes.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{b.notes.map((n) => <li key={n} className="whitespace-pre-line">{T(n)}</li>)}</ul>}
          <div className="grid gap-3 sm:grid-cols-2">
            {b.screenshots.map((src, i) => (
              <a key={src} href={src} target="_blank" rel="noreferrer" aria-label={t("openImage", { n: i + 1 })}>
                {/* eslint-disable-next-line @next/next/no-img-element -- screenshots of unknown size */}
                <img src={src} alt="" loading="lazy" className="w-full rounded-lg border border-border" />
              </a>
            ))}
          </div>
        </BuildSection>
      )}

      {b.links.length > 0 && (
        <BuildSection id="links" title={t("links")}>
          <ul className="space-y-1">
            {b.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-primary underline underline-offset-2 [overflow-wrap:anywhere]">
                  {l.label}
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </BuildSection>
      )}
    </div>
  );
}

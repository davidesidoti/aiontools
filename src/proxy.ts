import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { CLASSES } from "./lib/classes";

const intl = createMiddleware(routing);
const CLASS_IDS = new Set<string>(CLASSES.map((c) => c.id));
const BUILD_PATH = new RegExp(`^/(?:${routing.locales.join("|")})/builds/([^/]+)/?$`);

export default function proxy(req: NextRequest) {
  // With partial prerendering the status is sent before the page can call notFound(),
  // so unknown class slugs are turned into a real 404 here, before rendering starts.
  const slug = req.nextUrl.pathname.match(BUILD_PATH)?.[1];
  if (slug && !CLASS_IDS.has(slug)) return NextResponse.rewrite(new URL("/404", req.url), { status: 404 });
  return intl(req);
}

export const config = { matcher: "/((?!api|_next|_vercel|.*\\..*).*)" };

import { getSearchConsoleClient, getConfig } from "../auth.js";
interface SitemapListResult {
  siteUrl: string;
  sitemaps: Array<{
    path: string;
    lastSubmitted: string | null;
    isPending: boolean;
    lastDownloaded: string | null;
    warnings: number;
    errors: number;
    contents: Array<{ type: string; submitted: number; indexed: number }>;
  }>;
  note?: string;
}

/**
 * The Sitemaps API accepts sc-domain: properties directly, so the configured
 * property is always tried as-is first (#7). The URL-prefix conversions stay
 * on as fallbacks for accounts where the permission actually lives on a
 * matching URL-prefix property rather than the domain property.
 */
function sitemapPropertyCandidates(siteUrl: string): string[] {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.replace("sc-domain:", "");
    return [siteUrl, `https://${domain}/`, `https://www.${domain}/`];
  }
  return [siteUrl];
}

function fallbackNote(used: string, configured: string): string | undefined {
  if (used === configured) return undefined;
  return (
    `The configured property (${configured}) rejected the call, so the ` +
    `URL-prefix property (${used}) was used instead. The results belong to ` +
    `that property, which may differ from the domain property's own sitemap list.`
  );
}

function permissionHint(candidates: string[]): string {
  return (
    ` Tried: ${candidates.join(", ")}. Check that the authenticated account ` +
    `has sitemap permission on the property in Search Console.`
  );
}

export async function listSitemaps(): Promise<SitemapListResult> {
  const client = await getSearchConsoleClient();
  const { siteUrl: configSiteUrl } = getConfig();
  const candidates = sitemapPropertyCandidates(configSiteUrl);

  let firstError: any = null;
  for (const property of candidates) {
    try {
      const response = await client.sitemaps.list({ siteUrl: property });

      const sitemaps = (response.data.sitemap || []).map((s) => ({
        path: s.path || "",
        lastSubmitted: s.lastSubmitted || null,
        isPending: s.isPending || false,
        lastDownloaded: s.lastDownloaded || null,
        warnings: Number(s.warnings) || 0,
        errors: Number(s.errors) || 0,
        contents: (s.contents || []).map((c) => ({
          type: c.type || "unknown",
          submitted: Number(c.submitted) || 0,
          indexed: Number(c.indexed) || 0,
        })),
      }));

      const note = fallbackNote(property, configSiteUrl);
      return {
        siteUrl: property,
        sitemaps,
        ...(note && { note }),
      };
    } catch (err: any) {
      if (!firstError) firstError = err;
    }
  }

  throw new Error((firstError?.message || String(firstError)) + permissionHint(candidates));
}

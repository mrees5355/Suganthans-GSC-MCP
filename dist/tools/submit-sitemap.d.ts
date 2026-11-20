interface SitemapListResult {
    siteUrl: string;
    sitemaps: Array<{
        path: string;
        lastSubmitted: string | null;
        isPending: boolean;
        lastDownloaded: string | null;
        warnings: number;
        errors: number;
        contents: Array<{
            type: string;
            submitted: number;
            indexed: number;
        }>;
    }>;
    note?: string;
}
export declare function listSitemaps(): Promise<SitemapListResult>;
export {};

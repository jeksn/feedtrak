import { Head } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import HeadingSmall from '@/components/heading-small';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { OpmlImport } from '@/components/OpmlImport';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Import Feeds',
        href: '/settings/opml',
    },
];

export default function OpmlSettings() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import Feeds" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Import feeds from OPML"
                        description="Import your RSS feeds from an OPML file exported from another feed reader"
                    />

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            OPML (Outline Processor Markup Language) is a standard format for exporting and importing feed subscriptions. 
                            Most feed readers support exporting your subscriptions as an OPML file.
                        </p>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Supported feed readers:</h4>
                            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Feedbin</li>
                                <li>Feedly</li>
                                <li>Inoreader</li>
                                <li>The Old Reader</li>
                                <li>And many more...</li>
                            </ul>
                        </div>

                        <div className="mt-6">
                            <OpmlImport />
                        </div>

                        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">How to export your feeds:</h4>
                            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                                <li>Log in to your current feed reader</li>
                                <li>Find the export or backup option (usually in settings)</li>
                                <li>Choose to export as OPML or XML format</li>
                                <li>Save the file to your computer</li>
                                <li>Upload it here using the button above</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

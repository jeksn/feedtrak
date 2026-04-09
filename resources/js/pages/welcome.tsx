"use client";

import { dashboard, login, register } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Youtube, Rss, Podcast, Eye, Bookmark, FolderOpen, ArrowRight, Globe } from 'lucide-react';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    const features = [
        {
            icon: Youtube,
            title: "YouTube Channels",
            description: "Subscribe to any YouTube channel by URL. Track all their videos automatically."
        },
        {
            icon: Rss,
            title: "RSS Feeds",
            description: "Add any RSS or Atom feed. Stay updated with blogs, news sites, and more."
        },
        {
            icon: Podcast,
            title: "Podcasts",
            description: "Follow your favorite podcasts via RSS. Never miss an episode."
        },
        {
            icon: Eye,
            title: "Track What You See",
            description: "All your content in one feed. Mark items as seen and track your progress."
        },
        {
            icon: Bookmark,
            title: "Save for Later",
            description: "Bookmark content you want to consume later. Access them anytime."
        },
        {
            icon: FolderOpen,
            title: "Organize with Categories",
            description: "Group your feeds into categories. Keep your reading list organized."
        }
    ];

    return (
        <>
            <Head title="FeedTrak - Your Feed Manager" />
            <div className="min-h-screen bg-background text-foreground">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Globe className="w-6 h-6" />
                        <span className="text-xl font-bold">FeedTrak</span>
                    </div>
                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="px-4 py-2 border text-sm hover:bg-accent transition-colors rounded-md"
                            >
                                Go to App
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="px-4 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors rounded-md"
                                    >
                                        Get Started
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                {/* Hero */}
                <section className="px-6 py-32 text-center">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                            Your Universal Feed Manager
                        </h1>
                        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                            FeedTrak brings together all your content sources — YouTube channels, podcasts, RSS feeds, and more — into one unified timeline. Subscribe once, read everything in one place.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors rounded-md"
                                >
                                    Open Dashboard
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={register()}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors rounded-md"
                                    >
                                        Start Free
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center gap-2 px-4 py-2 border text-sm hover:bg-accent transition-colors rounded-md"
                                    >
                                        Log in
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Content Types */}
                <section className="px-6 py-24 bg-muted/30">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-4">Works with Your Favorite Sources</h2>
                        <p className="text-center text-muted-foreground mb-16 max-w-md mx-auto">
                            FeedTrak supports multiple content types so you can track everything in one place.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-xl border text-center">
                                <div className="w-14 h-14 rounded-xl border flex items-center justify-center mx-auto mb-4">
                                    <Youtube className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">YouTube</h3>
                                <p className="text-muted-foreground text-sm">
                                    Subscribe to channels by URL. Track every video they upload.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border text-center">
                                <div className="w-14 h-14 rounded-xl border flex items-center justify-center mx-auto mb-4">
                                    <Podcast className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Podcasts</h3>
                                <p className="text-muted-foreground text-sm">
                                    Add any podcast RSS feed. Listen to episodes when they're new.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl border text-center">
                                <div className="w-14 h-14 rounded-xl border flex items-center justify-center mx-auto mb-4">
                                    <Rss className="w-7 h-7" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">RSS Feeds</h3>
                                <p className="text-muted-foreground text-sm">
                                    Add any RSS or Atom feed. Stay updated with blogs and news.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="px-6 py-24">
                    <h2 className="text-3xl font-bold text-center mb-4">Features</h2>
                    <p className="text-center text-muted-foreground mb-16 max-w-md mx-auto">
                        Everything you need to manage your subscriptions.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                        {features.map((feature, index) => (
                            <div key={index} className="p-6 rounded-xl border hover:border-foreground/20 transition-colors">
                                <div className="w-10 h-10 rounded-lg border flex items-center justify-center mb-4">
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-muted-foreground text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How it works */}
                <section className="px-6 py-24 bg-muted/30">
                    <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
                    <p className="text-center text-muted-foreground mb-16 max-w-md mx-auto">
                        Get started in three simple steps.
                    </p>
                    <div className="max-w-3xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="relative">
                                <div className="text-8xl font-bold text-foreground/10 absolute -top-4 -left-2">1</div>
                                <div className="relative pt-16">
                                    <h3 className="text-xl font-bold mb-2">Add a Feed</h3>
                                    <p className="text-muted-foreground">Paste a YouTube channel URL, podcast RSS, or any RSS feed URL.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="text-8xl font-bold text-foreground/10 absolute -top-4 -left-2">2</div>
                                <div className="relative pt-16">
                                    <h3 className="text-xl font-bold mb-2">Browse All Content</h3>
                                    <p className="text-muted-foreground">See all new videos, episodes, and articles in one unified feed.</p>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="text-8xl font-bold text-foreground/10 absolute -top-4 -left-2">3</div>
                                <div className="relative pt-16">
                                    <h3 className="text-xl font-bold mb-2">Track & Save</h3>
                                    <p className="text-muted-foreground">Mark items as read. Save content for later. Organize with categories.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                {!auth.user && (
                    <section className="px-6 py-24 text-center">
                        <h2 className="text-3xl font-bold mb-4">Ready to consolidate your feeds?</h2>
                        <p className="text-muted-foreground mb-10">Start tracking everything in one place. It's free.</p>
                        <Link
                            href={register()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors rounded-md"
                        >
                            Create Free Account
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </section>
                )}

                {/* Footer */}
                <footer className="px-6 py-8 bg-muted/30 text-center text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} FeedTrak. All your feeds, one place.</p>
                </footer>
            </div>
        </>
    );
}

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
            <div className="min-h-screen bg-[#0a0a0a] text-white">
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <Globe className="w-6 h-6 text-red-500" />
                        <span className="text-xl font-bold">FeedTrak</span>
                    </div>
                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="px-4 py-2 border border-white/20 text-sm hover:bg-white/10 transition-colors rounded-md"
                            >
                                Go to App
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors rounded-md"
                                    >
                                        Get Started
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                {/* Hero */}
                <section className="px-6 py-32 text-center relative overflow-hidden">
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-3xl" />
                    
                    <div className="relative max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-white/60 mb-8">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Free for individuals
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                            One Feed for{" "}
                            <span className="text-red-500">Everything</span>
                        </h1>
                        <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
                            YouTube, podcasts, RSS feeds — track all your content in one place. 
                            Never miss a video, article, or episode again.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-lg font-medium hover:bg-white/90 transition-colors rounded-lg"
                                >
                                    Open Dashboard
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={register()}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-lg font-medium hover:bg-white/90 transition-colors rounded-lg"
                                    >
                                        Start Free
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-lg hover:bg-white/10 transition-colors rounded-lg"
                                    >
                                        Log in
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Content Types */}
                <section className="px-6 py-24 border-t border-white/10">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-center mb-4">All Your Feeds in One Place</h2>
                        <p className="text-center text-white/60 mb-16 max-w-md mx-auto">
                            Whether it's YouTube, podcasts, or RSS — we support it all.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Youtube className="w-7 h-7 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">YouTube</h3>
                                <p className="text-white/60 text-sm">
                                    Subscribe to channels by URL. Track every video they upload.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Podcast className="w-7 h-7 text-orange-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Podcasts</h3>
                                <p className="text-white/60 text-sm">
                                    Add any podcast RSS feed. Listen to episodes when they're new.
                                </p>
                            </div>
                            <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center">
                                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Rss className="w-7 h-7 text-blue-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">RSS Feeds</h3>
                                <p className="text-white/60 text-sm">
                                    Add any RSS or Atom feed. Stay updated with blogs and news.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="px-6 py-24 border-t border-white/10">
                    <h2 className="text-3xl font-bold text-center mb-4">Features</h2>
                    <p className="text-center text-white/60 mb-16 max-w-md mx-auto">
                        Everything you need to manage your subscriptions.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                        {features.map((feature, index) => (
                            <div key={index} className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                                    <feature.icon className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-white/60 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How it works */}
                <section className="px-6 py-24 border-t border-white/10">
                    <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
                    <p className="text-center text-white/60 mb-16 max-w-md mx-auto">
                        Get started in three simple steps.
                    </p>
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center font-bold text-red-500">1</span>
                            <div>
                                <h3 className="font-semibold mb-1">Add a Feed</h3>
                                <p className="text-white/60 text-sm">Paste a YouTube channel URL, podcast RSS, or any RSS feed URL.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center font-bold text-red-500">2</span>
                            <div>
                                <h3 className="font-semibold mb-1">Browse All Content</h3>
                                <p className="text-white/60 text-sm">See all new videos, episodes, and articles in one unified feed.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center font-bold text-red-500">3</span>
                            <div>
                                <h3 className="font-semibold mb-1">Track & Save</h3>
                                <p className="text-white/60 text-sm">Mark items as read. Save content for later. Organize with categories.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                {!auth.user && (
                    <section className="px-6 py-24 border-t border-white/10 text-center">
                        <h2 className="text-3xl font-bold mb-4">Ready to consolidate your feeds?</h2>
                        <p className="text-white/60 mb-10">Start tracking everything in one place. It's free.</p>
                        <Link
                            href={register()}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-lg font-medium hover:bg-white/90 transition-colors rounded-lg"
                        >
                            Create Free Account
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </section>
                )}

                {/* Footer */}
                <footer className="px-6 py-8 border-t border-white/10 text-center text-sm text-white/40">
                    <p>© {new Date().getFullYear()} FeedTrak. All your feeds, one place.</p>
                </footer>
            </div>
        </>
    );
}

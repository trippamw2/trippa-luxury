"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, Clock, BookOpen, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { JOURNAL_POSTS } from "@/lib/constants";

export default function JournalPostPage() {
  const params = useParams();
  const post = JOURNAL_POSTS.find((p) => p.id === params.slug);
  const otherPosts = JOURNAL_POSTS.filter((p) => p.id !== params.slug).slice(0, 2);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream pt-24">
        <div className="text-center">
          <h1 className="text-2xl font-heading text-soft-black mb-4">Article Not Found</h1>
          <Button href="/journal">Back to Journal</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Article */}
      <section className="pt-32 pb-24 bg-cream">
        <Container>
          <div className="max-w-3xl mx-auto">
            <Link
              href="/journal"
              className="inline-flex items-center gap-2 text-sm text-earth hover:text-soft-black transition-colors mb-8"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Journal
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold">
                {post.category}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight mt-3 mb-4">
                {post.title}
              </h1>

              <div className="flex items-center gap-4 text-xs text-earth/60 mb-8 pb-8 border-b border-sand-light/30">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {post.readTime}
                </span>
                <span>By {post.author}</span>
              </div>

              {/* Hero image placeholder */}
              <div className="aspect-[16/9] bg-gradient-to-br from-sand-light to-earth/20 mb-12" />

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-base md:text-lg text-earth leading-relaxed mb-6 first-letter:text-3xl first-letter:font-heading first-letter:text-gold">
                  {post.excerpt}
                </p>
                <p className="text-base text-earth leading-relaxed mb-4">
                  This is a sample article. In production, this would be the full journal entry with rich 
                  content, images, and storytelling elements that transport readers to Africa&apos;s most 
                  beautiful destinations.
                </p>
                <p className="text-base text-earth leading-relaxed mb-4">
                  Kivara&apos;s Journal is a space for inspiration — where we share destination guides, 
                  honeymoon stories, safari tales, and the kind of travel content that stirs the soul.
                </p>
                <p className="text-base text-earth leading-relaxed">
                  Whether you&apos;re planning your next escape or simply dreaming of Africa, we invite you 
                  to explore, imagine, and fall in love with this extraordinary continent.
                </p>
              </div>

              {/* Share */}
              <div className="mt-12 pt-8 border-t border-sand-light/30">
                <p className="text-xs font-medium tracking-widest uppercase text-earth mb-3">Share this article</p>
                <div className="flex gap-3">
                  <span className="px-4 py-2 text-xs border border-sand-light/50 text-earth hover:border-gold cursor-pointer transition-colors">Copy Link</span>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* More Articles */}
      {otherPosts.length > 0 && (
        <section className="py-24 bg-warm-white">
          <Container>
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-heading font-medium text-soft-black mb-10 text-center">
                More from the Journal
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {otherPosts.map((other) => (
                  <Link key={other.id} href={`/journal/${other.id}`} className="group">
                    <div className="aspect-[16/10] bg-gradient-to-br from-sand-light to-earth/20 mb-4 overflow-hidden">
                      <div className="w-full h-full group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-earth/60 mb-2">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{other.date}</span>
                      <span>{other.readTime}</span>
                    </div>
                    <h3 className="text-lg font-heading font-medium text-soft-black group-hover:text-gold-dark transition-colors mb-2">
                      {other.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs text-soft-black tracking-widest uppercase group-hover:text-gold-dark transition-colors">
                      Read More <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

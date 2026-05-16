"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, Clock, BookOpen, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { useBlogPosts } from "@/lib/use-public-data";

export default function JournalPostPage() {
  const params = useParams();
  const posts = useBlogPosts();
  const post = posts.find((p) => p.id === params.slug);
  const otherPosts = posts.filter((p) => p.id !== params.slug).slice(0, 2);

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

              <div className="relative aspect-[16/9] overflow-hidden mb-12">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-base md:text-lg text-earth leading-relaxed mb-6 first-letter:text-3xl first-letter:font-heading first-letter:text-gold">
                  {post.excerpt}
                </p>
                <div
                  className="text-base text-earth leading-relaxed space-y-4 [&_h3]:text-lg [&_h3]:font-heading [&_h3]:font-medium [&_h3]:text-soft-black [&_h3]:mt-8 [&_h3]:mb-3"
                  dangerouslySetInnerHTML={{ __html: post.content || "" }}
                />
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
                    <div className="relative aspect-[16/10] overflow-hidden mb-4">
                      <Image
                        src={other.image}
                        alt={other.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
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

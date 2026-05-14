"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import { Container } from "@/components/ui/container";
import { JOURNAL_POSTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function JournalPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-sand-dark/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
              Editorial
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-medium text-cream leading-tight">
              The Journal
            </h1>
            <p className="mt-4 text-base md:text-lg text-cream/60 max-w-xl mx-auto">
              Stories, guides, and inspiration from Africa&apos;s most romantic destinations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Posts */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="max-w-5xl mx-auto space-y-16">
            {JOURNAL_POSTS.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link href={`/journal/${post.id}`} className="group grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12 items-center">
                  {/* Image */}
                  <div className={cn(
                    "md:col-span-2 relative overflow-hidden aspect-[4/3]",
                    index % 2 === 1 && "md:order-2"
                  )}>
                    <div className="absolute inset-0 bg-gradient-to-br from-sand-light to-earth/20 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] font-medium tracking-widest uppercase text-cream/80 bg-soft-black/30 px-3 py-1.5">
                        {post.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={cn("md:col-span-3", index % 2 === 1 && "md:order-1")}>
                    <div className="flex items-center gap-4 text-xs text-earth/60 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {post.readTime}
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-heading font-medium text-soft-black group-hover:text-gold-dark transition-colors duration-300 mb-3">
                      {post.title}
                    </h2>
                    <p className="text-sm text-earth leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-earth/60">By {post.author}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-soft-black tracking-widest uppercase group-hover:text-gold-dark transition-colors">
                        Read Article <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}



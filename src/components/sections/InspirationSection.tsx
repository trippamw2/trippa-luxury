"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Clock, BookOpen } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useBlogPosts } from "@/lib/use-public-data";

export function InspirationSection() {
  const posts = useBlogPosts().slice(0, 3);
  return (
    <section className="py-24 md:py-32 bg-warm-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Luxury Travel Inspiration
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Stories That Inspire
            <br />
            <span className="italic text-earth">Your Next Journey</span>
          </h2>
          <p className="mt-4 text-base text-earth leading-relaxed">
            Discover destination guides, honeymoon inspiration, and stories from the heart of Africa.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group"
            >
              <Link href={`/journal/${post.id}`}>
                <div className="relative overflow-hidden aspect-[16/12] bg-sand-light/50 mb-5">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    loading="lazy"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-soft-black/30 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="text-[10px] font-medium tracking-widest uppercase text-cream/80 bg-soft-black/30 px-3 py-1.5">
                      {post.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-earth/60 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>

                <h3 className="text-lg md:text-xl font-heading font-medium text-soft-black group-hover:text-gold-dark transition-colors duration-300 leading-snug mb-2">
                  {post.title}
                </h3>
                <p className="text-sm text-earth leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>

                <span className="inline-flex items-center gap-1 mt-3 text-xs text-soft-black tracking-widest uppercase group-hover:text-gold-dark transition-colors">
                  Read More
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 px-8 py-4 border border-soft-black text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-soft-black hover:text-cream transition-all duration-500"
          >
            Explore the Journal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}

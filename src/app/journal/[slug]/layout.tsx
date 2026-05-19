import type { Metadata } from "next";
import { JOURNAL_POSTS } from "@/lib/constants";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = JOURNAL_POSTS.find((p) => p.id === slug);

  if (!post) {
    return { title: "Article Not Found" };
  }

  return {
    title: `${post.title} | Kivara Journal`,
    description: post.excerpt,
    alternates: {
      canonical: `https://kivara.luxury/journal/${post.id}`,
    },
    openGraph: {
      title: `${post.title} | Kivara`,
      description: post.excerpt,
      url: `https://kivara.luxury/journal/${post.id}`,
      images: [{ url: post.image, width: 1200, height: 630, alt: post.title }],
      type: "article",
      locale: "en_US",
      siteName: "Kivara Luxury Travel",
      publishedTime: post.date ? new Date(post.date).toISOString() : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Kivara`,
      description: post.excerpt,
      images: [post.image],
    },
  };
}

export default function JournalArticleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

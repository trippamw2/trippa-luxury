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
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | Kivara`,
      description: post.excerpt,
    },
  };
}

export default function JournalArticleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

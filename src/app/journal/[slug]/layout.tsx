import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { getMergedBlogPosts } from "@/lib/public-data";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

async function findPost(slug: string) {
  const posts = await getMergedBlogPosts();
  return posts.find((p) => p.id === slug) || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPost(slug);

  if (!post) {
    return { title: "Article Not Found" };
  }

  return {
    title: `${post.title} | Kivara Journal`,
    description: post.excerpt,
    alternates: {
      canonical: `${SITE_URL}/journal/${post.id}`,
    },
    openGraph: {
      title: `${post.title} | Kivara`,
      description: post.excerpt,
      url: `${SITE_URL}/journal/${post.id}`,
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

export default async function JournalArticleLayout({ params, children }: Props) {
  const { slug } = await params;
  const post = await findPost(slug);

  return (
    <>
      {post && (
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: SITE_URL },
            { name: "Journal", url: `${SITE_URL}/journal` },
            { name: post.title, url: `${SITE_URL}/journal/${post.id}` },
          ]}
        />
      )}
      {children}
    </>
  );
}

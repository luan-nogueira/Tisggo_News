import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

export function useSEO({ title, description, image, url, type = "article" }: SEOProps) {
  useEffect(() => {
    // Update title
    document.title = `${title} | Tisgo News`;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

    // Update Open Graph tags
    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:type", type);
    if (image) updateMetaTag("og:image", image);
    if (url) updateMetaTag("og:url", url);

    // Update Twitter Card tags
    updateMetaTag("twitter:title", title);
    updateMetaTag("twitter:description", description);
    updateMetaTag("twitter:card", "summary_large_image");
    if (image) updateMetaTag("twitter:image", image);

    // Update Schema.org NewsArticle
    if (type === "article") {
      const schema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        description: description,
        image: image,
        datePublished: new Date().toISOString(),
        author: {
          "@type": "Organization",
          name: "Tisgo News",
        },
      };

      let scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
      if (!scriptTag) {
        scriptTag = document.createElement("script") as HTMLScriptElement;
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    }
  }, [title, description, image, url, type]);
}

function updateMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    if (name.startsWith("og:") || name.startsWith("twitter:")) {
      tag.setAttribute("property", name);
    } else {
      tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

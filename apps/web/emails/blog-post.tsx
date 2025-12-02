import {
  Button,
  Heading,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { BaseEmail } from "./components/base-email";

interface BlogPostEmailProps {
  username?: string;
  postTitle: string;
  postExcerpt: string;
  postUrl: string;
  authorName?: string;
  featuredImageUrl?: string;
  unsubscribeUrl?: string;
}

export function BlogPostEmail({
  username,
  postTitle,
  postExcerpt,
  postUrl,
  authorName,
  featuredImageUrl,
  unsubscribeUrl,
}: BlogPostEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://byronwade.com";
  const greeting = username ? `Hi ${username},` : "Hi there,";

  return (
    <BaseEmail
      preview={`New blog post: ${postTitle}`}
      showUnsubscribe={true}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading style={headingStyle}>📝 New Blog Post</Heading>

      <Text style={textStyle}>{greeting}</Text>

      <Text style={textStyle}>
        We just published a new blog post you might enjoy:
      </Text>

      {featuredImageUrl && (
        <Section style={imageSectionStyle}>
          <Img
            alt={postTitle}
            src={featuredImageUrl}
            style={imageStyle}
            width="560"
          />
        </Section>
      )}

      <Heading as="h2" style={postTitleStyle}>
        {postTitle}
      </Heading>

      {authorName && <Text style={authorStyle}>By {authorName}</Text>}

      <Text style={excerptStyle}>{postExcerpt}</Text>

      <Section style={buttonSectionStyle}>
        <Button href={postUrl} style={buttonStyle}>
          Read Full Article
        </Button>
      </Section>

      <Section style={linksSectionStyle}>
        <Link href={`${baseUrl}/blog`} style={linkStyle}>
          View All Posts
        </Link>
        {" • "}
        <Link href={postUrl} style={linkStyle}>
          Read More
        </Link>
      </Section>

      <Text style={footerNoteStyle}>Happy reading! 📚</Text>
    </BaseEmail>
  );
}

const headingStyle = {
  fontSize: "28px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const textStyle = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "0 0 16px",
};

const imageSectionStyle = {
  margin: "24px 0",
  textAlign: "center" as const,
};

const imageStyle = {
  maxWidth: "100%",
  height: "auto",
  borderRadius: "8px",
};

const postTitleStyle = {
  fontSize: "24px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "24px 0 8px",
  lineHeight: "1.3",
};

const authorStyle = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 16px",
  fontStyle: "italic",
};

const excerptStyle = {
  fontSize: "16px",
  lineHeight: "1.7",
  color: "#4b5563",
  margin: "0 0 24px",
};

const buttonSectionStyle = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const buttonStyle = {
  backgroundColor: "#8b5cf6",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "16px",
  display: "inline-block",
};

const linksSectionStyle = {
  textAlign: "center" as const,
  margin: "24px 0",
  fontSize: "14px",
};

const linkStyle = {
  color: "#8b5cf6",
  textDecoration: "underline",
};

const footerNoteStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "24px 0 0",
  fontStyle: "italic",
};


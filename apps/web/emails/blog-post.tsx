import { Button, Heading, Img, Link, Section, Text } from "@react-email/components";
import { BaseEmail } from "./components/base-email";
import { appBaseUrl, colors, fonts, styles } from "./components/theme";

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
  const baseUrl = appBaseUrl();
  const greeting = username ? `${username},` : "Reader,";

  return (
    <BaseEmail
      kicker="From the archive"
      preview={`${postTitle} — new on the Rebuzzle blog`}
      showUnsubscribe
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={styles.eyebrow}>Fresh essay</Text>
      <Heading style={styles.h1}>Something worth reading between boards.</Heading>

      <Text style={styles.p}>
        {greeting} we just published a new post — usually a look back at yesterday&apos;s puzzle,
        the wordplay, or how the generators thought about it.
      </Text>

      {featuredImageUrl ? (
        <Section style={imageSectionStyle}>
          <Img alt={postTitle} src={featuredImageUrl} style={imageStyle} width="504" />
        </Section>
      ) : null}

      <Heading as="h2" style={styles.h2}>
        {postTitle}
      </Heading>
      {authorName ? <Text style={authorStyle}>By {authorName}</Text> : null}
      <Text style={styles.p}>{postExcerpt}</Text>

      <Section style={styles.ctaWrap}>
        <Button href={postUrl} style={styles.cta}>
          Read the piece
        </Button>
      </Section>

      <Text style={{ ...styles.pSmall, textAlign: "center" as const }}>
        <Link href={`${baseUrl}/blog`} style={styles.link}>
          All posts
        </Link>
      </Text>
    </BaseEmail>
  );
}

const imageSectionStyle = {
  margin: "8px 0 20px",
  textAlign: "center" as const,
};

const imageStyle = {
  maxWidth: "100%",
  height: "auto",
  borderRadius: "4px",
  border: `1px solid ${colors.line}`,
};

const authorStyle = {
  margin: "0 0 14px",
  fontFamily: fonts.mono,
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: colors.subtle,
};

import { Img, Link, Section } from "@react-email/components";

interface EmailHeaderProps {
  logoUrl?: string;
  appName?: string;
}

export function EmailHeader({
  logoUrl = "https://rebuzzle.byronwade.com/brand/logo-email.png",
  appName = "Rebuzzle",
}: EmailHeaderProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rebuzzle.byronwade.com";

  return (
    <Section style={headerStyle}>
      <Link href={baseUrl} style={logoLinkStyle}>
        <Img
          alt={appName}
          height="36"
          src={logoUrl}
          style={logoImgStyle}
          width="158"
        />
      </Link>
    </Section>
  );
}

const headerStyle = {
  backgroundColor: "#ffffff",
  padding: "22px 28px 18px",
  borderBottom: "1px solid #ebebeb",
};

const logoLinkStyle = {
  textDecoration: "none",
  color: "inherit",
  display: "inline-block",
};

const logoImgStyle = {
  display: "block",
  border: "0",
  outline: "none",
};

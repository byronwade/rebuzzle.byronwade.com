import { localDev, none, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

/**
 * Allow Vercel OIDC (deployed callers), local dev, and same-project
 * server-to-agent calls used by daily puzzle generation.
 */
export default eveChannel({
  auth: [vercelOidc(), localDev(), none()],
});

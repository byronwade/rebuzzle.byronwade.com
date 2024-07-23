import * as React from "react";
import { Html, Button } from "@react-email/components";

const AccountDeactivationWarning = ({ deactivationLink }) => (
	<Html lang="en">
		<h1>Account Deactivation Warning</h1>
		<p>We&apos;ve noticed inactivity on your account. Click the button below to keep your account active:</p>
		<Button href={deactivationLink}>Keep My Account Active</Button>
	</Html>
);

export default AccountDeactivationWarning;

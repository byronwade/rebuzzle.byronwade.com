import * as React from "react";
import { Html, Button } from "@react-email/components";

const AccountActivation = ({ activationLink }) => (
	<Html lang="en">
		<h1>Activate Your Account</h1>
		<p>Thank you for signing up for EmailMeWork! Please activate your account by clicking the button below:</p>
		<Button href={activationLink}>Activate Account</Button>
	</Html>
);

export default AccountActivation;

import * as React from "react";
import { Html, Button } from "@react-email/components";

const PasswordReset = ({ resetLink }) => (
	<Html lang="en">
		<h1>Password Reset</h1>
		<p>Click the button below to reset your password:</p>
		<Button href={resetLink}>Reset Password</Button>
	</Html>
);

export default PasswordReset;

import * as React from "react";
import { Html, Button } from "@react-email/components";

const Welcome = ({ firstName, url }) => (
	<Html lang="en">
		<h1>Welcome, {firstName}!</h1>
		<Button href={url}>Get Started</Button>
	</Html>
);

export default Welcome;

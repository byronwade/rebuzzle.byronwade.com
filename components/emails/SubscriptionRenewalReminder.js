import * as React from "react";
import { Html, Button } from "@react-email/components";

const SubscriptionRenewalReminder = ({ renewalLink, expirationDate }) => (
	<Html lang="en">
		<h1>Subscription Renewal Reminder</h1>
		<p>Your subscription is set to expire on {expirationDate}. Click the button below to renew your subscription:</p>
		<Button href={renewalLink}>Renew Subscription</Button>
	</Html>
);

export default SubscriptionRenewalReminder;

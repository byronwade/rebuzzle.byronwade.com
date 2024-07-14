import { SignupForm } from "@/components/SignupForm";
import Header from "@/components/header";

const SignupPage = () => {
	return (
		<>
			<Header />
			<div className="flex items-center justify-center min-h-screen bg-gray-100">
				<SignupForm />
			</div>
		</>
	);
};

export default SignupPage;

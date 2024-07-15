import { SignupForm } from "@/components/SignupForm";
import Header from "@/components/header";

const SignupPage = () => {
	return (
		<>
			<Header />
			<div className="flex items-center justify-center mt-8 md:min-h-screen">
				<SignupForm />
			</div>
		</>
	);
};

export default SignupPage;

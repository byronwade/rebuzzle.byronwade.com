import { SignupForm } from "@/components/SignupForm";
import Header from "@/components/Header";

const SignupPage = () => {
	return (
		<>
			<Header />
			<div className="flex items-center justify-center mt-8">
				<SignupForm />
			</div>
		</>
	);
};

export default SignupPage;

"use client";
import { LoginForm } from "@/components/LoginForm";
import Header from "@/components/header"; // Check if this path and component name are correct

const LoginPage = () => {
	return (
		<>
			<Header />
			<div className="flex items-center justify-center mt-8">
				<LoginForm />
			</div>
		</>
	);
};

export default LoginPage;

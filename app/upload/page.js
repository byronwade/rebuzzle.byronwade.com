import { UploadPuzzleForm } from "@/components/UploadPuzzleForm";
import Header from "@/components/Header";

const UploadPuzzlePage = () => {
	return (
		<>
			<Header />
			<div className="flex items-center justify-center mt-8">
				<UploadPuzzleForm />
			</div>
		</>
	);
};

export default UploadPuzzlePage;

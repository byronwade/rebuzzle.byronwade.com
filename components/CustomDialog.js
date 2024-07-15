import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CustomDialog = ({ open, onOpenChange, title, description, children }) => {
	const handleKeyDown = (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			event.stopPropagation();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent onKeyDown={handleKeyDown}>
				<DialogHeader>
					{title && <DialogTitle>{title}</DialogTitle>}
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	);
};

export default CustomDialog;
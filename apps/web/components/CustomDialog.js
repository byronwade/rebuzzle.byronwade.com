import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CustomDialog = ({ open, onOpenChange, title, description, children }) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		<DialogContent>
			<DialogHeader>
				{title && <DialogTitle>{title}</DialogTitle>}
				{children ? children : <DialogDescription>{description}</DialogDescription>}
			</DialogHeader>
		</DialogContent>
	</Dialog>
);

export default CustomDialog;

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARKDOWN_PROSE_CLASS } from "@/components/markdown-styles";

interface Props {
	content: string;
}

export function MarkdownRenderer({ content }: Props) {
	return (
		<div className={MARKDOWN_PROSE_CLASS}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</div>
	);
}

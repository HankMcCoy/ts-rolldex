import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
	content: string;
}

export function MarkdownRenderer({ content }: Props) {
	return (
		<div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:leading-tight prose-h1:text-2xl prose-h1:mt-7 prose-h1:mb-2 prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 [&>:first-child]:mt-0">
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</div>
	);
}

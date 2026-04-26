declare module "markdown-it-container" {
	interface ContainerOptions {
		validate?: (params: string, markup: string) => boolean;
		render?: (
			tokens: Array<{ nesting: number; info: string; markup: string }>,
			idx: number,
			options: unknown,
			env: unknown,
			slf: unknown,
		) => string;
		marker?: string;
	}
	function container(
		md: unknown,
		name: string,
		options?: ContainerOptions,
	): void;
	export default container;
}

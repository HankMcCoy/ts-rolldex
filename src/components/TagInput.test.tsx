// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { TagInput } from "@/components/TagInput";

afterEach(cleanup);
it("shows group names and replaces an existing choice when selecting a suggestion", () => {
	function Picker() {
		const [value, setValue] = useState(["Active", "Important"]);
		return (
			<TagInput
				aria-label="Tags"
				value={value}
				onChange={setValue}
				suggestions={["Active", "Complete", "Important"]}
				groups={[{ id: "status", name: "Status" }]}
				tags={[
					{ id: "a", name: "Active", groupId: "status" },
					{ id: "c", name: "Complete", groupId: "status" },
					{ id: "i", name: "Important", groupId: null },
				]}
			/>
		);
	}
	render(<Picker />);
	fireEvent.focus(screen.getByRole("combobox"));
	fireEvent.click(screen.getByRole("option", { name: "Status group" }));
	fireEvent.click(screen.getByRole("option", { name: "Complete (Status)" }));
	expect(
		screen.queryByRole("button", { name: "Remove tag Active" }),
	).toBeNull();
	expect(
		screen.getByRole("button", { name: "Remove tag Complete" }),
	).toBeTruthy();
	expect(
		screen.getByRole("button", { name: "Remove tag Important" }),
	).toBeTruthy();
});

it("supports keyboard group navigation and shows choices beyond the old suggestion limit", () => {
	const names = Array.from({ length: 12 }, (_, i) => `Choice ${i}`);
	render(
		<TagInput
			aria-label="Tags"
			value={[]}
			onChange={() => {}}
			suggestions={names}
			groups={[{ id: "g", name: "Status" }]}
			tags={names.map((name) => ({ id: name, name, groupId: "g" }))}
		/>,
	);
	const input = screen.getByRole("combobox");
	fireEvent.focus(input);
	fireEvent.keyDown(input, { key: "ArrowDown" });
	fireEvent.keyDown(input, { key: "ArrowRight" });
	expect(
		screen.getByRole("option", { name: "Choice 11 (Status)" }),
	).toBeTruthy();
	fireEvent.keyDown(input, { key: "ArrowLeft" });
	expect(screen.getByRole("option", { name: "Status group" })).toBeTruthy();
	fireEvent.change(input, { target: { value: "Choice 11" } });
	expect(
		screen.getByRole("option", { name: "Choice 11 (Status)" }),
	).toBeTruthy();
});

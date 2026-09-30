import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkbookSectionEditor } from "./WorkbookSectionEditor";
import { emptyWorkbook, type LivingHopeWorkbookContent, type WorkbookStory } from "@/lib/livingHope/workbookTypes";

afterEach(cleanup);

function scene(id: string, title: string): WorkbookStory {
  return {
    id,
    title,
    text: `${title} narrative.`,
    cover_image_url: `/morning-scenes/${id}.svg`,
    cover_storage_path: `owner/covers/${id}.png`,
    chatgpt_url: `https://chatgpt.com/c/${id}`,
    narration_audio_url: `https://example.test/${id}.mp3`,
    narration_storage_path: `owner/recordings/${id}.mp3`,
    narration_file_name: `${id}.mp3`,
    narration_provider: "elevenlabs",
  };
}

function mount(stories: WorkbookStory[]) {
  const changed = vi.fn<(workbook: LivingHopeWorkbookContent) => void>();
  function Harness() {
    const [workbook, setWorkbook] = useState({ ...emptyWorkbook(), stories });
    return <WorkbookSectionEditor section="stories" workbook={workbook} onChange={(next) => {
      changed(next);
      setWorkbook(next);
    }} />;
  }
  render(<Harness />);
  const savedStories = () => changed.mock.calls.at(-1)![0].stories;
  return { savedStories };
}

describe("workbook scene editing", () => {
  it("edits one narrative without losing any scene's title, artwork, links or recording", () => {
    const stories = [scene("morning", "A peaceful morning"), scene("family", "Family dinner")];
    const { savedStories } = mount(stories);

    fireEvent.change(screen.getByRole("textbox", { name: "Scene 1 text" }), { target: { value: "Revised morning narrative." } });

    expect(savedStories()).toEqual([{ ...stories[0], text: "Revised morning narrative." }, stories[1]]);
    expect(stories[0].text).toBe("A peaceful morning narrative.");
  });

  it("keeps the remaining scene's ID and media when a middle scene is deleted and the next is edited", () => {
    const stories = [scene("first", "First scene"), scene("middle", "Middle scene"), scene("last", "Last scene")];
    const { savedStories } = mount(stories);

    fireEvent.click(screen.getByRole("button", { name: "Delete Middle scene" }));
    expect(savedStories()).toEqual([stories[0], stories[2]]);

    fireEvent.change(screen.getByRole("textbox", { name: "Scene 2 text" }), { target: { value: "The last scene, revised." } });
    expect(savedStories()).toEqual([stories[0], { ...stories[2], text: "The last scene, revised." }]);
  });

  it("lets the user name and deliberately clear a title while retaining the narrative and artwork", () => {
    const original = scene("morning", "A peaceful morning");
    const { savedStories } = mount([original]);

    fireEvent.change(screen.getByRole("textbox", { name: "Scene 1 title" }), { target: { value: "My morning" } });
    expect(savedStories()).toEqual([{ ...original, title: "My morning" }]);

    fireEvent.change(screen.getByRole("textbox", { name: "Scene 1 title" }), { target: { value: "" } });
    expect(savedStories()).toEqual([{ ...original, title: undefined }]);
    expect(Object.prototype.hasOwnProperty.call(savedStories()[0], "title")).toBe(true);
  });

  it("adds a scene with a new stable ID without rebuilding the saved scenes", () => {
    const original = scene("morning", "A peaceful morning");
    const { savedStories } = mount([original]);

    fireEvent.click(screen.getByRole("button", { name: "Add scene" }));
    const addedId = savedStories()[1].id;
    expect(addedId).toBeTruthy();
    expect(addedId).not.toBe(original.id);

    fireEvent.change(screen.getByRole("textbox", { name: "Scene 2 text" }), { target: { value: "My new scene." } });
    expect(savedStories()).toEqual([original, { id: addedId, text: "My new scene." }]);
  });
});

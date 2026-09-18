import { act, cleanup, renderHook, waitFor, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
const h = vi.hoisted(() => ({ videos: vi.fn(), remove: vi.fn(), rows: vi.fn(), media: vi.fn() }));
vi.mock("@/lib/journal/videos", () => ({ fetchEntryVideos: h.videos, deleteEntryVideo: h.remove }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/journal/entryListQuery", () => ({ fetchJournalEntryListPage: h.rows }));
vi.mock("@/lib/journal/entryListMedia", () => ({ fetchEntryListMediaUrls: h.media }));
import { useJournalEntryVideos } from "./useJournalEntryVideos";
import { useJournalListController } from "./useJournalListController";
const clip = { id: "video", storage_path: "owner/entry/video.mp4", url: "https://example.test/video?token=unchanged" };
const entry = { id: "entry", body: "Text loads independently", contentLocked: false };
function deferred<T>() { let resolve!: (v:T)=>void; let reject!: (e:Error)=>void; const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; }
beforeEach(() => {
  h.videos.mockReset().mockResolvedValue([clip]); h.remove.mockReset(); h.rows.mockReset().mockResolvedValue({ rows: [entry], hasMore: false }); h.media.mockReset().mockResolvedValue({ photoUrls: {}, videoUrls: {} });
  useJournalVaultStore.setState({ locking: false, dek: null, e2eEnabled: false });
});
afterEach(cleanup);
describe("journal media is never a prerequisite for text or stable editor nodes",()=>{
  it("renders text immediately while media is unresolved and preserves it on failure",async()=>{
    const media=deferred<never>();h.media.mockReturnValue(media.promise);
    const {result}=renderHook(()=>useJournalListController({userId:"owner"}));
    await waitFor(()=>expect(result.current.entries).toEqual([entry]));expect(result.current.loading).toBe(false);
    await act(async()=>{media.reject(new Error("thumbnail offline"));});
    expect(result.current.entries).toEqual([entry]);expect(result.current.loadError).toBeNull();expect(result.current.mediaError).toContain("thumbnail offline");
    h.media.mockResolvedValue({photoUrls:{entry:"photo"},videoUrls:{}});await act(async()=>{await result.current.retryMedia();});
    expect(result.current.photoUrls.entry).toBe("photo");expect(h.rows).toHaveBeenCalledTimes(1);
  });
  it("does not allow late thumbnails from another account to repopulate its rows",async()=>{
    const media=deferred<{photoUrls:Record<string,string>;videoUrls:Record<string,string>}>();h.media.mockReturnValueOnce(media.promise);
    const {result,rerender}=renderHook(({userId})=>useJournalListController({userId}),{initialProps:{userId:"owner"}});
    await waitFor(()=>expect(result.current.entries).toHaveLength(1));h.rows.mockResolvedValue({rows:[],hasMore:false});rerender({userId:"other"});
    expect(result.current.entries).toEqual([]);await act(async()=>{media.resolve({photoUrls:{entry:"private-old-url"},videoUrls:{}});});
    expect(result.current.photoUrls).toEqual({});
  });
  it("keeps the exact video element, URL, and row while refresh fails",async()=>{
    let api:ReturnType<typeof useJournalEntryVideos>;
    function Surface(){api=useJournalEntryVideos("entry");return <>{api.videos.map(v=><video data-testid="video" key={v.id} src={v.url}/>)}<span>{api.error}</span></>;}
    render(<Surface/>);await waitFor(()=>expect(screen.getByTestId("video")).toBeTruthy());const node=screen.getByTestId("video");const rows=api!.videos;
    const refresh=deferred<never>();h.videos.mockReturnValue(refresh.promise);let pending!:Promise<void>;act(()=>{pending=api!.reload();});
    expect(api!.videos).toBe(rows);expect(screen.getByTestId("video")).toBe(node);
    await act(async()=>{refresh.reject(new Error("offline"));await pending;});expect(screen.getByTestId("video")).toBe(node);expect(api!.videos).toBe(rows);expect(node).toHaveAttribute("src",clip.url);
    h.videos.mockResolvedValue([{...clip}]);await act(async()=>{await api!.reload();});expect(screen.getByTestId("video")).toBe(node);
  });
  it("clears media immediately on vault lock and rejects a delayed read",async()=>{
    const {result,rerender}=renderHook(()=>useJournalEntryVideos("entry"));await waitFor(()=>expect(result.current.videos).toHaveLength(1));
    const refresh=deferred<typeof clip[]>();h.videos.mockReturnValue(refresh.promise);let pending!:Promise<void>;act(()=>{pending=result.current.reload();});
    act(()=>{useJournalVaultStore.setState({locking:true});});rerender();expect(result.current.videos).toEqual([]);
    await act(async()=>{refresh.resolve([clip]);await pending;});expect(result.current.videos).toEqual([]);
  });
});

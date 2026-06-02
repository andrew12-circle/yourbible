import { ChevronDown, FileUp, ImagePlus, Move, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  onNew: () => void;
  onAddCover: () => void;
  onRepositionCover?: () => void;
  onImportDayOne?: () => void;
  hasCoverPhoto?: boolean;
  repositioning?: boolean;
  overlay?: boolean;
}

export default function OverviewHeader({
  onNew,
  onAddCover,
  onRepositionCover,
  onImportDayOne,
  hasCoverPhoto,
  repositioning,
  overlay,
}: Props) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        overlay
          ? "pointer-events-auto absolute top-0 left-0 right-0 z-20 px-6 pt-5"
          : "px-8 pt-6"
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={overlay ? "secondary" : "outline"}
            size="sm"
            className={
              overlay
                ? "bg-white/15 text-white border-white/20 hover:bg-white/25 backdrop-blur-sm"
                : ""
            }
          >
            Edit
            <ChevronDown className="w-4 h-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuItem onClick={onAddCover}>
            <ImagePlus className="w-4 h-4 mr-2" />
            {hasCoverPhoto ? "Change Cover Image" : "Add Cover Image"}
          </DropdownMenuItem>
          {hasCoverPhoto && onRepositionCover && (
            <DropdownMenuItem onClick={onRepositionCover} disabled={repositioning}>
              <Move className="w-4 h-4 mr-2" />
              Reposition Cover
            </DropdownMenuItem>
          )}
          {onImportDayOne && (
            <DropdownMenuItem onClick={onImportDayOne}>
              <FileUp className="w-4 h-4 mr-2" />
              Import from Day One
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        type="button"
        onClick={onNew}
        size="sm"
        className={
          overlay
            ? "bg-[hsl(211_100%_50%)] hover:bg-[hsl(211_100%_46%)] text-white shadow-md"
            : "bg-[hsl(211_100%_50%)] hover:bg-[hsl(211_100%_46%)] text-white"
        }
      >
        <Plus className="w-4 h-4" />
        New Entry
      </Button>
    </div>
  );
}

import { ReactNode, useRef, useState } from "react";
import { animate, motion, useMotionValue, type PanInfo } from "framer-motion";
import { Pin, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_W = 72;
const ACTION_COUNT = 3;
const OPEN_X = -(ACTION_W * ACTION_COUNT);

interface Props {
  children: ReactNode;
  pinned: boolean;
  flagged: boolean;
  onPin: () => void;
  onFlag: () => void;
  onDelete: () => void;
  className?: string;
}

/**
 * Outlook-style swipe-left row: reveals Pin, Flag (mirror), Delete on the right.
 */
export default function SwipeableEntryRow({
  children,
  pinned,
  flagged,
  onPin,
  onFlag,
  onDelete,
  className,
}: Props) {
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const dragged = useRef(false);

  const snap = (offsetX: number, velocityX: number) => {
    const shouldOpen = offsetX < OPEN_X / 2 || velocityX < -400;
    if (shouldOpen) {
      animate(x, OPEN_X, { type: "spring", stiffness: 420, damping: 36 });
      setOpen(true);
    } else {
      animate(x, 0, { type: "spring", stiffness: 420, damping: 36 });
      setOpen(false);
    }
  };

  const close = () => {
    animate(x, 0, { type: "spring", stiffness: 420, damping: 36 });
    setOpen(false);
  };

  const runAction = (fn: () => void) => {
    close();
    fn();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    snap(info.offset.x, info.velocity.x);
    requestAnimationFrame(() => {
      dragged.current = false;
    });
  };

  return (
    <motion.div className={cn("relative overflow-hidden", className)}>
      <motion.div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: ACTION_W * ACTION_COUNT }}
        aria-hidden
      >
        <ActionBtn
          label={pinned ? "Unpin" : "Pin"}
          onClick={() => runAction(onPin)}
          className="bg-amber-500 text-white"
        >
          <Pin className={cn("w-5 h-5", pinned && "fill-current")} />
        </ActionBtn>
        <ActionBtn
          label={flagged ? "Unflag" : "Flag"}
          onClick={() => runAction(onFlag)}
          className="bg-violet-600 text-white"
        >
          <Sparkles className={cn("w-5 h-5", flagged && "fill-current")} />
        </ActionBtn>
        <ActionBtn
          label="Delete"
          onClick={() => runAction(onDelete)}
          className="bg-destructive text-destructive-foreground"
        >
          <Trash2 className="w-5 h-5" />
        </ActionBtn>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        style={{ x, touchAction: "pan-y" }}
        onDragStart={() => {
          dragged.current = false;
        }}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > 8) dragged.current = true;
        }}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          if (open) {
            e.preventDefault();
            e.stopPropagation();
            close();
            return;
          }
          if (dragged.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className="relative z-[1] bg-background"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ActionBtn({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex flex-col items-center justify-center gap-1 flex-1 h-full text-[11px] font-medium",
        className,
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

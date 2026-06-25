import TodoItemRowComponent from "@/components/todos/TodoItemRow";
import type { TodoItemRow } from "@/lib/todos/api";

type RowProps = {
  subtaskCounts: Record<string, number>;
  onToggle: (item: TodoItemRow, done: boolean) => void;
  onOpen: (item: TodoItemRow) => void;
  onPin: (item: TodoItemRow) => void;
  onReorder: (fromId: string, toId: string) => void;
  draggable?: boolean;
};

type Section = {
  key: string;
  title: string;
  description?: string;
  items: TodoItemRow[];
};

type Props = RowProps & {
  sections: Section[];
  emphasizePriority?: boolean;
};

export default function TodoSectionedList({
  sections,
  subtaskCounts,
  onToggle,
  onOpen,
  onPin,
  onReorder,
  draggable = true,
  emphasizePriority = false,
}: Props) {
  return (
    <div className="space-y-6">
      {sections.map((section) =>
        section.items.length === 0 ? null : (
          <section key={section.key}>
            <div className="mb-2 px-1">
              <h3 className="text-sm font-semibold tracking-tight">{section.title}</h3>
              {section.description ? (
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <TodoItemRowComponent
                  key={item.id}
                  item={item}
                  onToggle={(done) => onToggle(item, done)}
                  onOpen={() => onOpen(item)}
                  onPin={() => onPin(item)}
                  onReorder={onReorder}
                  draggable={draggable}
                  subtaskCount={subtaskCounts[item.id] ?? 0}
                  emphasizePriority={emphasizePriority}
                />
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

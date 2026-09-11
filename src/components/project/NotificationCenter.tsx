import { useMemo, useState } from "react";

import { AppIcon } from "@/src/components/ui/app-icon";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/src/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { IconBell, IconCheck } from "@/src/lib/icons";
import { formatProjectNotificationTime, type ProjectNotification } from "@/src/lib/project-notifications";
import { cn } from "@/src/lib/utils";

import "./notification-center.css";

type NotificationCenterProps = {
  notifications: ProjectNotification[];
  onOpenProject: (projectId: string, notificationId: string) => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
};

export function NotificationCenter({ notifications, onOpenProject, onMarkRead, onMarkAllRead }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [feedback, setFeedback] = useState("");
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const sorted = useMemo(() => [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [notifications]);

  const renderList = (unreadOnly: boolean) => {
    const visible = unreadOnly ? sorted.filter((item) => !item.readAt) : sorted;
    return visible.length ? <ul className="project-notification-list">
      {visible.map((item) => <li key={item.id} className={cn("project-notification-item", !item.readAt && "is-unread")}>
        <button type="button" className="project-notification-open" onClick={() => { onMarkRead(item.id); setOpen(false); onOpenProject(item.projectId, item.id); }}>
          <span className="project-notification-dot" aria-hidden="true" />
          <span className="project-notification-copy">
            <strong>{item.projectName}</strong>
            <span>{item.title}</span>
            <small>{item.summary}</small>
            <span className="project-notification-meta"><time dateTime={item.createdAt}>{formatProjectNotificationTime(item.createdAt)}</time><span>{item.readAt ? "已读" : "未读"}</span></span>
          </span>
        </button>
        {!item.readAt && <button type="button" className="project-notification-mark" aria-label={`将${item.projectName}通知标为已读`} title="标为已读" onClick={() => { onMarkRead(item.id); setFeedback("已标为已读"); }}><AppIcon icon={IconCheck} size={13} /></button>}
      </li>)}
    </ul> : <div className="project-notification-empty"><AppIcon icon={IconBell} size={20} /><strong>{unreadOnly ? "没有未读通知" : "暂无通知"}</strong></div>;
  };

  return <Sheet modal={false} open={open} onOpenChange={(value) => { setOpen(value); if (value) setFeedback(""); }}>
    <SheetTrigger asChild>
      <button type="button" className="project-notification-trigger" aria-label={unreadCount ? `通知，${unreadCount} 条未读` : "通知"} title="通知">
        <AppIcon icon={IconBell} size={17} />
        {unreadCount > 0 && <span className="project-notification-badge" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
    </SheetTrigger>
    <SheetContent className="project-notification-sheet">
      <header className="project-notification-header">
        <div><SheetTitle className="project-notification-title">通知 <span className="project-notification-demo-label">演示</span></SheetTitle><SheetDescription className="sr-only">项目进入尽调阶段的站内通知</SheetDescription></div>
        <p className="project-notification-feedback" role="status" aria-live="polite">{feedback || (unreadCount ? `${unreadCount} 条未读` : "全部已读")}</p>
      </header>
      <Tabs value={filter} onValueChange={setFilter} className="project-notification-body">
        <div className="project-notification-toolbar">
          <TabsList className="project-notification-tabs" aria-label="通知筛选"><TabsTrigger value="all">全部</TabsTrigger><TabsTrigger value="unread">未读{unreadCount ? ` ${unreadCount}` : ""}</TabsTrigger></TabsList>
          <button type="button" className="project-notification-read-all" onClick={() => { onMarkAllRead(); setFeedback(unreadCount ? "已全部标为已读" : "全部已读"); }}><AppIcon icon={IconCheck} size={13} />全部标为已读</button>
        </div>
        <TabsContent value="all" className="project-notification-tab-content">{renderList(false)}</TabsContent>
        <TabsContent value="unread" className="project-notification-tab-content">{renderList(true)}</TabsContent>
      </Tabs>
    </SheetContent>
  </Sheet>;
}

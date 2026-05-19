export default function InboxPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Inbox</h1>
        <p className="page-sub">Notifications and review requests.</p>
      </div>
      <div className="empty" style={{ marginTop: 48 }}>
        <h3>All caught up</h3>
        <p>No new notifications.</p>
      </div>
    </div>
  );
}

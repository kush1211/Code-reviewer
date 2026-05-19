export function RepoRowSkeleton() {
  const S = ({ w, h = 12, r = 4 }: { w: number; h?: number; r?: number }) => (
    <span className="skel" style={{ display: 'inline-block', width: w, height: h, borderRadius: r }} />
  );

  return (
    <div className="repo-row skeleton-row">
      <div className="repo-row-icon">
        <S w={16} h={16} r={4} />
      </div>
      <div className="repo-row-main">
        <div className="repo-row-name-line"><S w={180} h={14} /></div>
        <div style={{ marginTop: 6 }}><S w={320} h={11} /></div>
        <div className="repo-meta" style={{ marginTop: 10, gap: 12 }}>
          <S w={70} h={11} /><S w={60} h={11} /><S w={110} h={11} />
        </div>
      </div>
      <div className="repo-row-right">
        <S w={86} h={20} r={999} />
        <S w={70} h={26} r={6} />
      </div>
    </div>
  );
}

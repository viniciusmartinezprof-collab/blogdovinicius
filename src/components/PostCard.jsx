function PostCard({ post }) {
  const isClickable = Boolean(post.postUrl);

  function handleOpenPost() {
    if (post.postUrl) {
      window.open(post.postUrl, "_blank", "noopener,noreferrer");
    }
  }

  function handleKeyDown(event) {
    if (isClickable && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      handleOpenPost();
    }
  }

  return (
    <article
      className={`lesson-card${post.isNewestPublished ? " is-featured" : ""}${isClickable ? " is-clickable" : " is-disabled"}`}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : -1}
      onClick={handleOpenPost}
      onKeyDown={handleKeyDown}
    >
      {post.isNewestPublished ? <span className="lesson-badge">Novo</span> : null}

      <div className="lesson-card-top">
        <span className="lesson-week">{post.postLabel}</span>
        <span className={`lesson-status${post.isPublished ? " is-open" : ""}`}>
          {post.statusLabel}
        </span>
      </div>

      <h3>{post.title}</h3>
      <p>{post.description}</p>
      <p className="lesson-note">{post.note}</p>

      <div className="lesson-meta">
        <span>{post.area}</span>
        <span>{post.availabilityLabel}</span>
      </div>

      <span className={`lesson-action${isClickable ? "" : " is-muted"}`}>
        {isClickable ? "Ler publicação" : "Conteúdo em preparação"}
      </span>
    </article>
  );
}

export default PostCard;

function PostCard({ post }) {
  return (
    <article className="post-card">
      <div className="post-meta">
        <span>{post.category}</span>
        <span>{post.date}</span>
        <span>{post.readingTime}</span>
      </div>

      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>

      <a className="post-link" href={`#${post.slug}`}>
        Ler rascunho
      </a>
    </article>
  );
}

export default PostCard;

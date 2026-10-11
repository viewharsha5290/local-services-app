import { ListingPost } from "@/lib/types";
import { timeAgo } from "@/lib/time";

/** One "What's new" update from a business: photo if it has one, what's new, and a price if given. */
export function PostCard({ post, businessName }: { post: ListingPost; businessName?: string }) {
  return (
    <div className="postcard">
      {post.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- served from Supabase storage
        <img src={post.photo} alt="" loading="lazy" />
      ) : null}
      <div className="postcard-body">
        {businessName && <div className="postcard-who">{businessName}</div>}
        <div className="postcard-text">{post.caption}</div>
        <div className="postcard-meta">
          {post.price && <span className="postcard-price">{post.price}</span>}
          <span>{timeAgo(new Date(post.createdAt).getTime())}</span>
        </div>
      </div>
    </div>
  );
}

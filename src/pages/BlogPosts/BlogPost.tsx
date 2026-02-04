import '../../assets/css/fonts.css';
import '../../App.css';
import '../../styles/Blogposts.css';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import blogPosts from './blogPostsData';

function BlogPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const post = blogPosts.find(p => p.id === postId);

  if (!post) {
    return <Navigate to="/blogposts" replace />;
  }

  return (
    <div className="App" style={{color: '#0f4c81'}}>
      <div className='content'>
        <div className="blog-post">
          <span className="back-link" onClick={() => navigate('/blogposts')}>
            &larr; Back to posts
          </span>
          <div className="blog-post-header">
            <h2>{post.title}</h2>
            <span className="blog-date">{post.date}</span>
          </div>
          <div className="blog-post-content">
            {post.content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogPost;

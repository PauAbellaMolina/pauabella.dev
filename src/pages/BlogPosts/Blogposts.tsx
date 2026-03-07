import '../../assets/css/fonts.css';
import '../../App.css';
import '../../styles/Blogposts.css';
import { useNavigate } from 'react-router-dom';
import blogPosts from './blogPostsData';

function Blogposts() {
  const navigate = useNavigate();

  return (
    <div className="App">
      <h2 className="floating-navigation" onClick={() => navigate('/')}>Pau Abella</h2>
      <div className="centered-header">
        <h1>Blogposts</h1>
      </div>
      <div className='content'>
        <div className="blog-list">
          {blogPosts.map((post) => (
            <div
              key={post.id}
              className="blog-entry"
              onClick={() => navigate(`/blogposts/${post.id}`)}
            >
              <h2>{post.title}</h2>
              <span className="blog-date">{post.date}</span>
              <p className="blog-excerpt">{post.excerpt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Blogposts;

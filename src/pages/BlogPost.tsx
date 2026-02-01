import '../assets/css/fonts.css';
import '../App.css';
import '../styles/Blogposts.css';
import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ReactComponent as PauAvatar } from '../assets/svg/pauavatar.svg';
import type { ColorPalette } from '../types';
import blogPosts from '../blogposts';

function BlogPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const defaultColorPalette: ColorPalette = {
    text: `#0f4c81`,
    background: `transparent`
  };
  const [colorPalette, setColorPalette] = useState<ColorPalette>(defaultColorPalette);

  const post = blogPosts.find(p => p.id === postId);

  if (!post) {
    return <Navigate to="/blogposts" replace />;
  }

  const setNewRandomColorPalette = () => {
    const randomColorPalette: ColorPalette = {
      text: getRandomColor(),
      background: getRandomColor()
    };
    setColorPalette(randomColorPalette);
  };

  const getRandomColor = () => {
    const r = generateRandomRGB();
    const g = generateRandomRGB();
    const b = generateRandomRGB();
    return `rgb(${r}, ${g}, ${b})`;
  };

  const generateRandomRGB = () => {
    return Math.floor(Math.random() * 256);
  }

  return (
    <div className="App" style={{backgroundColor: colorPalette.background, color: colorPalette.text}}>
      <PauAvatar className="pauAvatarSvg" onClick={setNewRandomColorPalette} />
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

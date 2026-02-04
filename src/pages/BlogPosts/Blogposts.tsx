import '../../assets/css/fonts.css';
import '../../App.css';
import '../../styles/Blogposts.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as PauAvatar } from '../../assets/svg/pauavatar.svg';
import blogPosts from './blogPostsData';

interface ColorPalette {
  text: string;
  background: string;
}

function Blogposts() {
  const navigate = useNavigate();

  const defaultColorPalette: ColorPalette = {
    text: `#0f4c81`,
    background: `transparent`
  };
  const [colorPalette, setColorPalette] = useState<ColorPalette>(defaultColorPalette);

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
              style={{ borderColor: colorPalette.text }}
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
